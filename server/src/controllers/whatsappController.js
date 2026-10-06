const Conversa = require('../models/Conversa');
const { gerarResposta } = require('../services/openaiService');
const { enviarMensagemWhatsapp } = require('../services/whatsappService');

const OWNER_ID_TESTE = 'owner-teste-001';

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
    const textoRecebido = mensagemRecebida.text?.body || '';
    const nomeContato = change.value.contacts?.[0]?.profile?.name || numeroPaciente;

    let conversa = await Conversa.findOne({
      ownerId: OWNER_ID_TESTE,
      telefone: numeroPaciente
    });

    if (!conversa) {
      conversa = await Conversa.create({
        ownerId: OWNER_ID_TESTE,
        nome: nomeContato,
        telefone: numeroPaciente,
        mensagens: []
      });
    }

    conversa.mensagens.push({ remetente: 'paciente', texto: textoRecebido });

    if (conversa.status === 'ia') {
      const respostaIA = await gerarResposta(conversa.mensagens);
      conversa.mensagens.push({ remetente: 'bot', texto: respostaIA });
      await enviarMensagemWhatsapp(numeroPaciente, respostaIA);
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