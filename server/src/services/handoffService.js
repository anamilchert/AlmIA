const { classificarMensagem } = require('./classificadorService');
const { gerarResposta } = require('./openaiService');

function marcarHandoff(conversa, motivo, urgencia = 'media') {
  conversa.status = 'humano';
  conversa.handoffEm = new Date();
  conversa.aguardandoHumano = true;
  conversa.motivoHandoff = motivo;
  conversa.urgenciaHandoff = urgencia;
}

function aplicarAssunto(conversa, resultado) {
  if (resultado.assunto && resultado.assunto !== 'outro') {
    conversa.assunto = resultado.assunto;
  }
}

async function avaliarHandoff(conversa) {
  let resultado;
  try {
    resultado = await classificarMensagem(conversa.mensagens);
  } catch (e) {
    marcarHandoff(conversa, 'falha_ia', 'media');
    return true;
  }

  aplicarAssunto(conversa, resultado);

  if (!resultado.precisaHumano) return false;
  marcarHandoff(conversa, resultado.motivo, resultado.urgencia);
  return true;
}

async function registrarAssunto(conversa) {
  try {
    aplicarAssunto(conversa, await classificarMensagem(conversa.mensagens));
  } catch (e) {
    console.error('[Handoff] Falha ao classificar o assunto:', e.message);
  }
}

function encerrarConversa(conversa) {
  conversa.status = 'concluida';
  conversa.encerradaEm = new Date();
  conversa.aguardandoHumano = false;
}

function interpretarResposta(conversa, resposta) {
  const marcador = String(resposta || '').toUpperCase();
  if (marcador.includes('[HUMANO]')) {
    marcarHandoff(conversa, 'sem_informacao', 'media');
    return null;
  }
  if (marcador.includes('[ENCERRAR]')) {
    encerrarConversa(conversa);
    return null;
  }
  return resposta;
}

async function responderIA(conversa, { handoffEmFalha = true } = {}) {
  try {
        const resposta = await gerarResposta(conversa.mensagens, {
      contato: {
        pacienteId: conversa.pacienteId,
        nome: conversa.nome,
        telefone: conversa.telefone
      }
    });
    return interpretarResposta(conversa, resposta);
  } catch (e) {
    console.error('[IA] Falha ao responder na conversa', String(conversa._id), '-', e.message);
    if (handoffEmFalha) marcarHandoff(conversa, 'falha_ia', 'media');
    return null;
  }
}

module.exports = { avaliarHandoff, registrarAssunto, responderIA, marcarHandoff };