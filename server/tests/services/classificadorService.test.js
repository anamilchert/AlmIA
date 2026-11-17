const mockCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } },
  }))
);

function carregar() {
  return require('../../src/services/classificadorService');
}

const completion = (objeto) => ({ choices: [{ message: { content: JSON.stringify(objeto) } }] });
const msgs = [{ remetente: 'paciente', texto: 'Oi' }];

let logSpy;
let erroSpy;
beforeEach(() => {
  jest.resetModules();
  mockCreate.mockReset();
  delete process.env.OPENAI_MODEL_CLASSIFICADOR;
  process.env.OPENAI_API_KEY = 'chave-teste';
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  erroSpy.mockRestore();
});

describe('classificarMensagem', () => {
  it('devolve só o assunto quando não precisa de humano', async () => {
    mockCreate.mockResolvedValue(completion({ precisaHumano: false, assunto: 'convenios' }));
    const { classificarMensagem } = carregar();
    await expect(classificarMensagem(msgs)).resolves.toEqual({
      precisaHumano: false,
      assunto: 'convenios',
    });
  });

  it('devolve motivo, urgência e assunto quando precisa de humano', async () => {
    mockCreate.mockResolvedValue(
      completion({ precisaHumano: true, motivo: 'emergencia', urgencia: 'alta', assunto: 'outro' })
    );
    const { classificarMensagem } = carregar();
    await expect(classificarMensagem(msgs)).resolves.toEqual({
      precisaHumano: true,
      motivo: 'emergencia',
      urgencia: 'alta',
      assunto: 'outro',
    });
  });

  it('troca valores inválidos pelos padrões', async () => {
    mockCreate.mockResolvedValue(
      completion({ precisaHumano: true, motivo: 'inventado', urgencia: 'enorme', assunto: 'xyz' })
    );
    const { classificarMensagem } = carregar();
    await expect(classificarMensagem(msgs)).resolves.toEqual({
      precisaHumano: true,
      motivo: 'outro',
      urgencia: 'media',
      assunto: 'outro',
    });
  });

  it('envia só as últimas 8 mensagens, rotuladas por quem falou', async () => {
    mockCreate.mockResolvedValue(completion({ precisaHumano: false, assunto: 'outro' }));
    const { classificarMensagem } = carregar();
    const mensagens = Array.from({ length: 10 }, (_, i) => ({
      remetente: i % 2 === 0 ? 'paciente' : 'bot',
      texto: `m${i}`,
    }));

    await classificarMensagem(mensagens);

    const linhas = mockCreate.mock.calls[0][0].messages[1].content.split('\n');
    expect(linhas).toHaveLength(8);
    expect(linhas[0]).toBe('Paciente: m2');
    expect(linhas[1]).toBe('Clínica: m3');
  });

  it('usa os parâmetros do gpt-5 por padrão e os do modelo antigo quando configurado', async () => {
    mockCreate.mockResolvedValue(completion({ precisaHumano: false, assunto: 'outro' }));
    let { classificarMensagem } = carregar();
    await classificarMensagem(msgs);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      max_completion_tokens: 300,
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
    });

    jest.resetModules();
    process.env.OPENAI_MODEL_CLASSIFICADOR = 'gpt-4o-mini';
    ({ classificarMensagem } = carregar());
    await classificarMensagem(msgs);
    expect(mockCreate.mock.calls[1][0]).toMatchObject({ temperature: 0, max_tokens: 120 });
  });

  it('propaga o erro da OpenAI', async () => {
    mockCreate.mockRejectedValue(new Error('fora do ar'));
    const { classificarMensagem } = carregar();
    await expect(classificarMensagem(msgs)).rejects.toThrow('fora do ar');
  });

  it('propaga o erro quando a resposta não é JSON', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'texto solto' } }] });
    const { classificarMensagem } = carregar();
    await expect(classificarMensagem(msgs)).rejects.toThrow();
  });
});