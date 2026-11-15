const { classificarMensagem } = require('./classificadorService');
const { gerarResposta } = require('./openaiService');

function marcarHandoff(conversa, motivo, urgencia = 'media') {
  conversa.status = 'humano';
  conversa.handoffEm = new Date();
  conversa.aguardandoHumano = true;
  conversa.motivoHandoff = motivo;
  conversa.urgenciaHandoff = urgencia;
}

async function avaliarHandoff(conversa) {
  const r = await classificarMensagem(conversa.mensagens);
  if (!r.precisaHumano) return false;
  marcarHandoff(conversa, r.motivo, r.urgencia);
  return true;
}

async function responderIA(conversa, { handoffEmFalha = true } = {}) {
  try {
    return await gerarResposta(conversa.mensagens, {
      nomePaciente: conversa.pacienteId ? conversa.nome : null
    });
  } catch (e) {
    console.error('Falha ao gerar resposta da IA:', e.message);
    if (handoffEmFalha) marcarHandoff(conversa, 'falha_ia', 'media');
    return null;
  }
}

module.exports = { avaliarHandoff, responderIA, marcarHandoff };