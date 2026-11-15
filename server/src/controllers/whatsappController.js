const Conversa = require('../models/Conversa');
const { enviarMensagemWhatsapp } = require('../services/whatsappService');
const { gerarResposta } = require('../services/openaiService');
// HANDOFF DESATIVADO TEMPORARIAMENTE
// const { avaliarHandoff } = require('../services/handoffService');
const { buscarPacientePorTelefone } = require('./pacienteController');

const OWNER_ID_TESTE = 'owner-teste-001'; // TODO: substituir por req.userId

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

    conversa.mensagens.push({ remetente: 'paciente', texto: textoRecebido });

    if (conversa.status === 'ia') {
      // HANDOFF DESATIVADO TEMPORARIAMENTE
      // const encaminhou = await avaliarHandoff(conversa);
      // if (encaminhou) { ... }

      try {
                const resposta = await gerarResposta(conversa.mensagens, {
          contato: {
            pacienteId: conversa.pacienteId,
            nome: conversa.nome,
            telefone: conversa.telefone
          }
        });
        conversa.mensagens.push({ remetente: 'bot', texto: resposta });
        await enviarMensagemWhatsapp(numeroPaciente, resposta);
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