const Conversa = require('../models/Conversa');
const { enviarMensagemWhatsapp } = require('../services/whatsappService');
const { avaliarHandoff, registrarAssunto, responderIA } = require('../services/handoffService');
const { buscarPacientePorTelefone } = require('./pacienteController');
const { numeroBloqueado } = require('../utils/numerosBloqueados');

const OWNER_ID_TESTE = 'owner-teste-001'; // TODO: substituir por req.userId
const HANDOFF_NA_PRIMEIRA_FALA = false;
const SAUDACAO = 'Olá! Como posso ajudar você hoje?';

function verificarWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

async function receberMensagem(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const mensagemRecebida = change?.value?.messages?.[0];

    if (!mensagemRecebida) {
      return res.sendStatus(200);
    }

    const numeroPaciente = mensagemRecebida.from;

        if (numeroBloqueado(numeroPaciente)) {
      console.log('[WhatsApp] Mensagem de número bloqueado ignorada');
      return res.sendStatus(200);
    }

    const textoRecebido = (mensagemRecebida.text?.body || '').trim();
    const nomeContato = change.value.contacts?.[0]?.profile?.name || numeroPaciente;

    if (!textoRecebido) {
      try {
        await enviarMensagemWhatsapp(
          numeroPaciente,
          'No momento só consigo entender mensagens de texto. Pode escrever sua dúvida?'
        );
      } catch (e) {
        console.error('Falha ao avisar sobre mensagem não suportada:', e.message);
      }
      return res.sendStatus(200);
    }

    let conversa = await Conversa.findOne({
      ownerId: OWNER_ID_TESTE,
      telefone: numeroPaciente,
      status: { $ne: 'concluida' }
    });

    if (!conversa) {
      const pacienteExistente = await buscarPacientePorTelefone(numeroPaciente);
      conversa = await Conversa.create({
        ownerId: OWNER_ID_TESTE,
        nome: pacienteExistente ? pacienteExistente.nome : nomeContato,
        telefone: numeroPaciente,
        pacienteId: pacienteExistente ? pacienteExistente._id : null,
        mensagens: []
      });
    }

    const primeiraFala = !conversa.mensagens.some((m) => m.remetente === 'bot');
    conversa.mensagens.push({ remetente: 'paciente', texto: textoRecebido });

    if (conversa.status === 'ia') {
      try {
        const avaliarAgora = HANDOFF_NA_PRIMEIRA_FALA || !primeiraFala;
        if (!avaliarAgora) await registrarAssunto(conversa);
        const encaminhou = avaliarAgora && (await avaliarHandoff(conversa));

        if (!encaminhou) {
          let resposta = await responderIA(conversa, { handoffEmFalha: avaliarAgora });
          if (!resposta && conversa.status === 'ia') resposta = SAUDACAO;

          if (resposta) {
            conversa.mensagens.push({ remetente: 'bot', texto: resposta });
            await enviarMensagemWhatsapp(numeroPaciente, resposta);
          }
        }
      } catch (e) {
        console.error('[IA] Falha ao responder no WhatsApp:', e.message);
      }
    }

    conversa.ultimaMensagemEm = new Date();
    await conversa.save();

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err.message);
    res.sendStatus(500);
  }
}

module.exports = { verificarWebhook, receberMensagem };