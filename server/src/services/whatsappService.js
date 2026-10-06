const axios = require('axios');

const WHATSAPP_API = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

async function enviarMensagemWhatsapp(numeroDestino, texto) {
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
}

module.exports = { enviarMensagemWhatsapp };