const OpenAI = require('openai');
const { buildContextoParaIA } = require('../controllers/clinicConfigController');
const { ferramentas, executarFerramenta } = require('./agendaIAService');

const OWNER_ID_TESTE = 'owner-teste-001'; // TODO: substituir por req.userId
const MODELO = process.env.OPENAI_MODEL_CONVERSA || 'gpt-5.6-luna';
const LIMITE_HISTORICO = 20;
const TIMEOUT_MS = 30000;
const MAX_RODADAS_FERRAMENTA = 5;

let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const PROMPT_BASE = `Você é da recepção de uma clínica e conversa com pacientes pelo WhatsApp.
Escreva em português do Brasil, de forma natural, calorosa e curta (1 a 3 frases), como uma pessoa da recepção escreveria. Sem listas longas, sem linguagem robótica.

Regras:
- Responda sobre horários, convênios, endereço, preparo de exames, especialidades e médicos usando SOMENTE as informações da clínica abaixo.
- Nunca diga que um atendente, a recepção ou outra pessoa vai assumir, entrar na conversa ou retornar. Continue a conversa normalmente.
- Se não tiver uma informação, diga com naturalidade que não tem esse dado agora e ofereça ajuda com outra coisa. Nunca invente.
- Não dê diagnóstico, não indique medicamento e não interprete sintomas. Se o paciente falar de sintomas, acolha com empatia em uma frase e faça uma pergunta simples (por exemplo, há quanto tempo está assim).
- Se a mensagem do paciente for só uma saudação (oi, olá, bom dia, boa tarde, boa noite), responda apenas "Olá! Como posso ajudar você hoje?". Se souber o nome do paciente, use "Olá, [primeiro nome]! Como posso ajudar você hoje?".
- Se o paciente perguntar sinceramente se está falando com uma pessoa ou um robô, não negue: diga que é o assistente virtual da clínica.

Agendamento:
- Você agenda consultas diretamente, usando as ferramentas. Descubra a especialidade (e o médico, só se o paciente tiver preferência), o dia e o horário. Pergunte apenas o que ainda faltar.
- Antes de sugerir ou confirmar um horário, chame consultar_horarios_livres e ofereça no máximo 3 opções próximas ao que o paciente pediu.
- Quando o paciente escolher, chame criar_agendamento e só depois confirme, de forma natural e em uma frase, com dia da semana, data, hora e o nome do médico. Não mencione a especialidade na confirmação.
- Nunca diga que vai "registrar o pedido", que alguém vai confirmar depois, nem que agendou sem a ferramenta ter retornado ok. Se a ferramenta retornar erro, explique de forma simples e ofereça outro horário.
- Se o paciente acabou de informar nome ou data de nascimento para cadastro, não comente o cadastro: continue o pedido de agendamento que ele fez antes, perguntando só o que faltar.
- Converta expressões como "amanhã", "segunda" ou "dia 20" usando a data de hoje informada abaixo. As ferramentas usam datas AAAA-MM-DD e horas HH:mm.`;

function agoraEmBrasilia() {
  const opcoes = { timeZone: 'America/Sao_Paulo' };
  return {
    extenso: new Date().toLocaleString('pt-BR', { ...opcoes, dateStyle: 'full', timeStyle: 'short' }),
    iso: new Date().toLocaleDateString('en-CA', opcoes)
  };
}

async function montarPrompt(nomePaciente) {
  let contexto = '';
  try {
    contexto = await buildContextoParaIA(OWNER_ID_TESTE);
  } catch (e) {
    console.error('[IA] Falha ao montar contexto da clínica:', e.message);
  }

  const agora = agoraEmBrasilia();
  let prompt = `${PROMPT_BASE}\n\nAgora: ${agora.extenso} (horário de Brasília). Data de hoje: ${agora.iso}.`;

  if (nomePaciente) {
    prompt += `\n\nO paciente já é cadastrado e se chama ${nomePaciente}. Trate-o pelo primeiro nome e nunca peça nome, telefone ou data de nascimento.`;
  } else {
    prompt += `\n\nO paciente ainda não tem cadastro. Para agendar, peça o nome completo e envie em nome_completo ao chamar criar_agendamento.`;
  }

  return contexto ? `${prompt}\n\nInformações da clínica:\n${contexto}` : prompt;
}

function parametrosDoModelo() {
  if (MODELO.startsWith('gpt-5')) {
    return { max_completion_tokens: 1500, reasoning_effort: 'none' };
  }
  return { max_tokens: 400 };
}

function lerArgumentos(texto) {
  try {
    return JSON.parse(texto || '{}');
  } catch (e) {
    return {};
  }
}

async function gerarResposta(mensagens, { contato = null } = {}) {
  const historico = mensagens.slice(-LIMITE_HISTORICO).map((m) => ({
    role: m.remetente === 'paciente' ? 'user' : 'assistant',
    content: m.texto
  }));

  const nomePaciente = contato && contato.pacienteId ? contato.nome : null;
  const conversaApi = [{ role: 'system', content: await montarPrompt(nomePaciente) }, ...historico];

  console.log(
    `[IA] chamando modelo=${MODELO} mensagens=${historico.length} chave=${
      process.env.OPENAI_API_KEY ? 'presente' : 'AUSENTE'
    } baseURL=${process.env.OPENAI_BASE_URL || 'padrao'}`
  );

  const inicio = Date.now();

  try {
    for (let rodada = 0; rodada < MAX_RODADAS_FERRAMENTA; rodada += 1) {
      const completion = await getClient().chat.completions.create(
        {
          model: MODELO,
          messages: conversaApi,
          tools: ferramentas,
          ...parametrosDoModelo()
        },
        { timeout: TIMEOUT_MS, maxRetries: 1 }
      );

      const escolha = completion.choices[0];
      const mensagem = escolha.message;
      const chamadas = (mensagem.tool_calls || []).filter((c) => c.type === 'function');

      if (!chamadas.length) {
        const texto = mensagem.content?.trim();
        if (!texto) {
          throw new Error(
            `Resposta vazia (finish_reason=${escolha.finish_reason}, tokens=${JSON.stringify(completion.usage)})`
          );
        }
        console.log(`[IA] ok em ${Date.now() - inicio}ms`);
        return texto;
      }

      conversaApi.push(mensagem);

      for (const chamada of chamadas) {
        const args = lerArgumentos(chamada.function.arguments);
        const resultado = await executarFerramenta(chamada.function.name, args, {
          ownerId: OWNER_ID_TESTE,
          contato
        });
        console.log('[IA] ferramenta', chamada.function.name, JSON.stringify(args), '->', JSON.stringify(resultado));
        conversaApi.push({
          role: 'tool',
          tool_call_id: chamada.id,
          content: JSON.stringify(resultado)
        });
      }
    }

    throw new Error('Limite de chamadas de ferramenta excedido.');
  } catch (e) {
    console.error('[IA] Erro na OpenAI:', {
      modelo: MODELO,
      status: e.status,
      codigo: e.code,
      tipo: e.type,
      mensagem: e.message,
      causa: e.cause?.code || e.cause?.message,
      ms: Date.now() - inicio
    });
    throw e;
  }
}

module.exports = { gerarResposta };