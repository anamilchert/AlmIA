const axios = require('axios');

const WHATSAPP_API = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

async function enviarMensagemWhatsapp(numeroDestino, texto) {
  try {
    await axios.post(
      WHATSAPP_API,
      {
        messaging_product: 'whatsapp',
        to: numeroDestino,
        type: 'text',
        text: { body: texto }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (e) {
    const erro = e.response?.data?.error;
    console.error('[WhatsApp] Erro ao enviar:', {
      status: e.response?.status,
      codigo: erro?.code,
      subcodigo: erro?.error_subcode,
      mensagem: erro?.message,
      tokenComeco: (process.env.WHATSAPP_TOKEN || '').slice(0, 6),
      tokenTamanho: (process.env.WHATSAPP_TOKEN || '').length
    });
    throw e;
  }
}

module.exports = { enviarMensagemWhatsapp };