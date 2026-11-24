const mockCreate = jest.fn();
const mockBuildContexto = jest.fn();
const mockExecutar = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } },
  }))
);
jest.mock('../../src/controllers/clinicConfigController', () => ({
  buildContextoParaIA: (...args) => mockBuildContexto(...args),
}));
jest.mock('../../src/services/agendaIAService', () => ({
  ferramentas: [{ type: 'function', function: { name: 'consultar_horarios_livres' } }],
  executarFerramenta: (...args) => mockExecutar(...args),
}));

function carregar() {
  const OpenAI = require('openai');
  const { gerarResposta } = require('../../src/services/openaiService');
  return { OpenAI, gerarResposta };
}

const resposta = (content, extra = {}) => ({
  choices: [{ message: { content }, finish_reason: 'stop', ...extra }],
});

const respostaComFerramenta = (argumentos = '{}') => ({
  choices: [{
    message: {
      content: null,
      tool_calls: [{
        id: 'c1', type: 'function',
        function: { name: 'consultar_horarios_livres', arguments: argumentos },
      }],
    },
    finish_reason: 'tool_calls',
  }],
});

const msgPaciente = (texto) => ({ remetente: 'paciente', texto });

let logSpy;
let erroSpy;
beforeEach(() => {
  jest.resetModules();
  mockCreate.mockReset();
  mockExecutar.mockReset();
  mockBuildContexto.mockReset().mockResolvedValue('');
  delete process.env.OPENAI_MODEL_CONVERSA;
  process.env.OPENAI_API_KEY = 'chave-teste';
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  erroSpy.mockRestore();
});

describe('gerarResposta', () => {
  it('converte o histórico e chama o modelo com ferramentas e parâmetros do gpt-5', async () => {
    mockBuildContexto.mockResolvedValue('Nome da clínica: Clínica X');
    mockCreate.mockResolvedValue(resposta('Olá!'));
    const { gerarResposta } = carregar();

    await gerarResposta([
      { remetente: 'paciente', texto: 'Oi' },
      { remetente: 'bot', texto: 'Olá, como posso ajudar?' },
      { remetente: 'humano', texto: 'Aqui é a Mariana.' },
    ]);

    const [args, opcoes] = mockCreate.mock.calls[0];
    expect(args.model).toBe('gpt-5.6-luna');
    expect(args.max_completion_tokens).toBe(1500);
    expect(args.reasoning_effort).toBe('none');
    expect(args.tools).toHaveLength(1);
    expect(opcoes).toEqual({ timeout: 30000, maxRetries: 1 });
    expect(args.messages[0].role).toBe('system');
    expect(args.messages[0].content).toContain('Informações da clínica');
    expect(args.messages[0].content).toContain('Nome da clínica: Clínica X');
    expect(args.messages.slice(1)).toEqual([
      { role: 'user', content: 'Oi' },
      { role: 'assistant', content: 'Olá, como posso ajudar?' },
      { role: 'assistant', content: 'Aqui é a Mariana.' },
    ]);
  });

  it('usa max_tokens quando o modelo não é gpt-5', async () => {
    process.env.OPENAI_MODEL_CONVERSA = 'gpt-4o-mini';
    mockCreate.mockResolvedValue(resposta('ok'));
    const { gerarResposta } = carregar();

    await gerarResposta([msgPaciente('Oi')]);

    const args = mockCreate.mock.calls[0][0];
    expect(args.model).toBe('gpt-4o-mini');
    expect(args.max_tokens).toBe(400);
    expect(args.max_completion_tokens).toBeUndefined();
  });

  it('devolve a resposta sem espaços nas pontas', async () => {
    mockCreate.mockResolvedValue(resposta('  Tudo bem!  '));
    const { gerarResposta } = carregar();
    await expect(gerarResposta([msgPaciente('Oi')])).resolves.toBe('Tudo bem!');
  });

  it('envia só as últimas 20 mensagens do histórico', async () => {
    mockCreate.mockResolvedValue(resposta('ok'));
    const { gerarResposta } = carregar();
    const mensagens = Array.from({ length: 25 }, (_, i) => msgPaciente(`m${i}`));

    await gerarResposta(mensagens);

    const enviadas = mockCreate.mock.calls[0][0].messages;
    expect(enviadas).toHaveLength(21); // sistema + 20
    expect(enviadas[1].content).toBe('m5');
  });

  it('trata o paciente cadastrado pelo nome e pede cadastro quando não há vínculo', async () => {
    mockCreate.mockResolvedValue(resposta('ok'));
    const { gerarResposta } = carregar();

    await gerarResposta([msgPaciente('Oi')], { contato: { pacienteId: 'p1', nome: 'Maria Silva' } });
    expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Maria Silva');

    await gerarResposta([msgPaciente('Oi')]);
    expect(mockCreate.mock.calls[1][0].messages[0].content).toContain('ainda não tem cadastro');
  });

  it('responde mesmo sem contexto da clínica quando a montagem falha', async () => {
    mockBuildContexto.mockRejectedValue(new Error('sem banco'));
    mockCreate.mockResolvedValue(resposta('ok'));
    const { gerarResposta } = carregar();

    await expect(gerarResposta([msgPaciente('Oi')])).resolves.toBe('ok');
    expect(mockCreate.mock.calls[0][0].messages[0].content).not.toContain('Informações da clínica');
  });

  it('cria o cliente da OpenAI uma única vez e com a chave do ambiente', async () => {
    mockCreate.mockResolvedValue(resposta('ok'));
    const { OpenAI, gerarResposta } = carregar();

    await gerarResposta([msgPaciente('a')]);
    await gerarResposta([msgPaciente('b')]);

    expect(OpenAI).toHaveBeenCalledTimes(1);
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'chave-teste' });
  });

  it('executa a ferramenta pedida pelo modelo e devolve o resultado a ele', async () => {
    mockCreate
      .mockResolvedValueOnce(respostaComFerramenta('{"data":"2026-11-20"}'))
      .mockResolvedValueOnce(resposta('Tenho 10h e 11h.'));
    mockExecutar.mockResolvedValue({ ok: true });
    const { gerarResposta } = carregar();
    const contato = { pacienteId: 'p1', nome: 'Maria' };

    const texto = await gerarResposta([msgPaciente('Quero agendar')], { contato, ownerId: 'owner-teste-001' });

    expect(texto).toBe('Tenho 10h e 11h.');
    expect(mockExecutar).toHaveBeenCalledWith(
      'consultar_horarios_livres',
      { data: '2026-11-20' },
      { ownerId: 'owner-teste-001', contato }
    );
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const segunda = mockCreate.mock.calls[1][0].messages;
    expect(segunda.at(-1)).toEqual({
      role: 'tool',
      tool_call_id: 'c1',
      content: JSON.stringify({ ok: true }),
    });
  });

  it('usa argumentos vazios quando o JSON da ferramenta é inválido', async () => {
    mockCreate
      .mockResolvedValueOnce(respostaComFerramenta('isso não é json'))
      .mockResolvedValueOnce(resposta('ok'));
    mockExecutar.mockResolvedValue({});
    const { gerarResposta } = carregar();

    await gerarResposta([msgPaciente('Oi')]);

    expect(mockExecutar.mock.calls[0][1]).toEqual({});
  });

  it('falha quando a resposta vem vazia', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '   ' }, finish_reason: 'length' }],
      usage: { completion_tokens: 0 },
    });
    const { gerarResposta } = carregar();
    await expect(gerarResposta([msgPaciente('Oi')])).rejects.toThrow('Resposta vazia');
  });

  it('para depois de 5 rodadas de ferramenta', async () => {
    mockCreate.mockResolvedValue(respostaComFerramenta());
    mockExecutar.mockResolvedValue({});
    const { gerarResposta } = carregar();

    await expect(gerarResposta([msgPaciente('Oi')])).rejects.toThrow(
      'Limite de chamadas de ferramenta excedido.'
    );
    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it('propaga o erro da OpenAI', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('fora do ar'), { status: 500 }));
    const { gerarResposta } = carregar();
    await expect(gerarResposta([msgPaciente('Oi')])).rejects.toThrow('fora do ar');
  });
});