jest.mock('axios', () => ({ post: jest.fn() }));

const axios = require('axios');

beforeEach(() => {
  jest.resetModules();
  axios.post.mockReset();
  process.env.WHATSAPP_PHONE_ID = '12345';
  process.env.WHATSAPP_TOKEN = 'token-teste';
});

function carregar() {
  return require('../../src/services/whatsappService');
}

describe('enviarMensagemWhatsapp', () => {
  it('envia o texto para o número com a URL, o corpo e o token corretos', async () => {
    axios.post.mockResolvedValue({});
    const axiosAtual = require('axios');
    const { enviarMensagemWhatsapp } = carregar();

    await enviarMensagemWhatsapp('5511987654321', 'Olá!');

    const [url, corpo, config] = axiosAtual.post.mock.calls[0];
    expect(url).toContain('/12345/messages');
    expect(corpo).toEqual({
      messaging_product: 'whatsapp',
      to: '5511987654321',
      type: 'text',
      text: { body: 'Olá!' },
    });
    expect(config.headers.Authorization).toBe('Bearer token-teste');
  });

  it('propaga o erro quando a API do WhatsApp falha', async () => {
    require('axios').post.mockRejectedValue(new Error('fora do ar'));
    const { enviarMensagemWhatsapp } = carregar();
    await expect(enviarMensagemWhatsapp('5511987654321', 'Oi')).rejects.toThrow('fora do ar');
  });
});