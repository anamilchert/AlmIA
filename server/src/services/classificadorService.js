const OpenAI = require('openai');

let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MOTIVOS = ['sintomas_fisicos', 'emergencia', 'pedido_humano', 'reclamacao', 'duvida_clinica', 'outro'];
const URGENCIAS = ['alta', 'media', 'baixa'];

const PROMPT = `Você classifica conversas de uma clínica médica pelo WhatsApp.
Decida se a ÚLTIMA mensagem do paciente exige atendimento humano.

Exige humano (precisaHumano=true):
- descrição de sintomas físicos ou piora de saúde (sintomas_fisicos)
- emergência ou risco de vida (emergencia, urgencia alta)
- paciente pede para falar com uma pessoa (pedido_humano)
- reclamação, insatisfação ou conflito (reclamacao)
- pedido de diagnóstico, receita, medicação ou orientação médica (duvida_clinica)

NÃO exige humano: dúvidas sobre horários, convênios, endereço, preparo de exames, valores e agendamentos.

Responda APENAS JSON: {"precisaHumano": boolean, "motivo": "${MOTIVOS.join('|')}", "urgencia": "alta|media|baixa"}`;

const REGEX_EMERGENCIA =
  /(dor no peito|falta de ar|n[ãa]o consigo respirar|desmai|convuls|sangramento|infarto|\bavc\b|socorro|emerg[êe]ncia)/i;

function fallback(mensagens) {
  const ultima = [...mensagens].reverse().find((m) => m.remetente === 'paciente');
  if (ultima && REGEX_EMERGENCIA.test(ultima.texto)) {
    return { precisaHumano: true, motivo: 'emergencia', urgencia: 'alta' };
  }
  return { precisaHumano: false };
}

async function classificarMensagem(mensagens) {
  const recorte = mensagens
    .slice(-6)
    .map((m) => `${m.remetente === 'paciente' ? 'Paciente' : 'Clínica'}: ${m.texto}`)
    .join('\n');

  try {
    const completion = await getClient().chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 80,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: recorte }
        ]
      },
      { timeout: 10000, maxRetries: 1 }
    );

    const dados = JSON.parse(completion.choices[0].message.content);
    if (!dados.precisaHumano) return { precisaHumano: false };

    return {
      precisaHumano: true,
      motivo: MOTIVOS.includes(dados.motivo) ? dados.motivo : 'outro',
      urgencia: URGENCIAS.includes(dados.urgencia) ? dados.urgencia : 'media'
    };
  } catch (e) {
    console.error('Falha no classificador de handoff:', e.message);
    return fallback(mensagens);
  }
}

module.exports = { classificarMensagem };