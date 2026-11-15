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
  let resultado;
  try {
    resultado = await classificarMensagem(conversa.mensagens);
  } catch (e) {
    marcarHandoff(conversa, 'falha_ia', 'media');
    return true;
  }

  if (!resultado.precisaHumano) return false;
  marcarHandoff(conversa, resultado.motivo, resultado.urgencia);
  return true;
}

async function responderIA(conversa, { handoffEmFalha = true } = {}) {
  try {
    return await gerarResposta(conversa.mensagens, {
      contato: {
        pacienteId: conversa.pacienteId,
        nome: conversa.nome,
        telefone: conversa.telefone
      }
    });
  } catch (e) {
    console.error('[IA] Falha ao responder na conversa', String(conversa._id), '-', e.message);
    if (handoffEmFalha) marcarHandoff(conversa, 'falha_ia', 'media');
    return null;
  }
}

module.exports = { avaliarHandoff, responderIA, marcarHandoff };