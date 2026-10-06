const OpenAI = require('openai');

let client;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `Você é o assistente virtual da Clínica São Lucas. Seja cordial, objetivo e responda dúvidas sobre horários, convênios, preparo de exames e agendamentos. Se não souber algo específico, oriente o paciente a aguardar um atendente humano.`;

async function gerarResposta(mensagens) {
  const historico = mensagens.map((m) => ({
    role: m.remetente === 'paciente' ? 'user' : 'assistant',
    content: m.texto
  }));

  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...historico],
    max_tokens: 300
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { gerarResposta };