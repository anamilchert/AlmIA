const OpenAI = require('openai');

const MODELO = process.env.OPENAI_MODEL_CLASSIFICADOR || 'gpt-5.6-luna';
const TIMEOUT_MS = 20000;
const MOTIVOS = [
  'sintomas_fisicos',
  'emergencia',
  'pedido_humano',
  'reclamacao',
  'nao_resolvido',
  'duvida_clinica',
  'outro'
];
const URGENCIAS = ['alta', 'media', 'baixa'];

let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const PROMPT = `Você analisa conversas entre pacientes e a recepção virtual de uma clínica médica, pelo WhatsApp.
Decida se a conversa precisa agora de um atendente humano, considerando principalmente a ÚLTIMA mensagem do paciente e o contexto recente.

Precisa de humano (precisaHumano=true) quando o paciente:
- relata sintomas físicos, dor ou piora de saúde (motivo sintomas_fisicos)
- diz que está em emergência, que é urgente, ou descreve risco à vida (motivo emergencia, urgencia alta)
- pede para falar com uma pessoa, atendente ou humano (motivo pedido_humano)
- reclama, está irritado ou insatisfeito com a clínica (motivo reclamacao)
- demonstra que o atendimento virtual não está resolvendo o problema, repete o mesmo pedido sem sucesso ou diz que a recepção não entende (motivo nao_resolvido)
- pede diagnóstico, receita, medicação ou orientação médica (motivo duvida_clinica)

NÃO precisa de humano: saudações, dúvidas sobre horários, convênios, endereço, preparo de exames, valores, escolha de especialidade ou médico, e pedidos de agendamento ou cancelamento. Informar nome ou data de nascimento também não exige humano.

Responda APENAS um JSON no formato:
{"precisaHumano": true ou false, "motivo": "${MOTIVOS.join('|')}", "urgencia": "alta|media|baixa"}
Se precisaHumano for false, use motivo "outro" e urgencia "baixa".`;

function parametrosDoModelo() {
  if (MODELO.startsWith('gpt-5')) {
    return { max_completion_tokens: 300, reasoning_effort: 'none' };
  }
  return { temperature: 0, max_tokens: 100 };
}

async function classificarMensagem(mensagens) {
  const recorte = mensagens
    .slice(-8)
    .map((m) => `${m.remetente === 'paciente' ? 'Paciente' : 'Clínica'}: ${m.texto}`)
    .join('\n');

  const inicio = Date.now();

  try {
    const completion = await getClient().chat.completions.create(
      {
        model: MODELO,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: recorte }
        ],
        ...parametrosDoModelo()
      },
      { timeout: TIMEOUT_MS, maxRetries: 1 }
    );

    const dados = JSON.parse(completion.choices[0].message.content);
    console.log(`[Classificador] ${JSON.stringify(dados)} em ${Date.now() - inicio}ms`);

    if (!dados.precisaHumano) return { precisaHumano: false };

    return {
      precisaHumano: true,
      motivo: MOTIVOS.includes(dados.motivo) ? dados.motivo : 'outro',
      urgencia: URGENCIAS.includes(dados.urgencia) ? dados.urgencia : 'media'
    };
  } catch (e) {
    console.error('[Classificador] Erro:', {
      modelo: MODELO,
      status: e.status,
      codigo: e.code,
      mensagem: e.message,
      causa: e.cause?.code || e.cause?.message,
      ms: Date.now() - inicio
    });
    throw e;
  }
}

module.exports = { classificarMensagem };