const mockCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } },
  }))
);

function carregar() {
  const OpenAI = require('openai');
  const { gerarResposta } = require('../../src/services/openaiService');
  return { OpenAI, gerarResposta };
}

beforeEach(() => {
  jest.resetModules();
  mockCreate.mockReset();
  process.env.OPENAI_API_KEY = 'chave-teste';
});

describe('gerarResposta', () => {
  it('converte o histórico e envia com prompt de sistema, modelo e limite', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Olá!' } }] });
    const { gerarResposta } = carregar();

    await gerarResposta([
      { remetente: 'paciente', texto: 'Oi' },
      { remetente: 'bot', texto: 'Olá, como posso ajudar?' },
      { remetente: 'humano', texto: 'Aqui é a Mariana.' },
    ]);

    const args = mockCreate.mock.calls[0][0];
    expect(args.model).toBe('gpt-4o-mini');
    expect(args.max_tokens).toBe(300);
    expect(args.messages[0].role).toBe('system');
    expect(args.messages.slice(1)).toEqual([
      { role: 'user', content: 'Oi' },
      { role: 'assistant', content: 'Olá, como posso ajudar?' },
      { role: 'assistant', content: 'Aqui é a Mariana.' },
    ]);
  });

  it('devolve a resposta sem espaços nas pontas', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '  Tudo bem!  ' } }] });
    const { gerarResposta } = carregar();
    await expect(gerarResposta([{ remetente: 'paciente', texto: 'Oi' }])).resolves.toBe('Tudo bem!');
  });

  it('cria o cliente da OpenAI uma única vez e com a chave do ambiente', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    const { OpenAI, gerarResposta } = carregar();

    await gerarResposta([{ remetente: 'paciente', texto: 'a' }]);
    await gerarResposta([{ remetente: 'paciente', texto: 'b' }]);

    expect(OpenAI).toHaveBeenCalledTimes(1);
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'chave-teste' });
  });
});