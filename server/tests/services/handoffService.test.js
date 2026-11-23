jest.mock('../../src/services/classificadorService', () => ({ classificarMensagem: jest.fn() }));
jest.mock('../../src/services/openaiService', () => ({ gerarResposta: jest.fn() }));

const { classificarMensagem } = require('../../src/services/classificadorService');
const { gerarResposta } = require('../../src/services/openaiService');
const {
  avaliarHandoff, registrarAssunto, responderIA, marcarHandoff,
} = require('../../src/services/handoffService');

const novaConversa = (extra = {}) => ({
  _id: 'c1', status: 'ia', mensagens: [{ remetente: 'paciente', texto: 'Oi' }], ...extra,
});

let erroSpy;
beforeEach(() => {
  jest.resetAllMocks();
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => erroSpy.mockRestore());

describe('marcarHandoff', () => {
  it('passa a conversa para humano e registra motivo e urgência', () => {
    const conversa = novaConversa();
    marcarHandoff(conversa, 'reclamacao', 'alta');
    expect(conversa).toMatchObject({
      status: 'humano',
      aguardandoHumano: true,
      motivoHandoff: 'reclamacao',
      urgenciaHandoff: 'alta',
    });
    expect(conversa.handoffEm).toBeInstanceOf(Date);
  });

  it('usa urgência média por padrão', () => {
    const conversa = novaConversa();
    marcarHandoff(conversa, 'falha_ia');
    expect(conversa.urgenciaHandoff).toBe('media');
  });
});

describe('avaliarHandoff', () => {
  it('não faz handoff e grava o assunto quando não precisa de humano', async () => {
    classificarMensagem.mockResolvedValue({ precisaHumano: false, assunto: 'convenios' });
    const conversa = novaConversa();
    await expect(avaliarHandoff(conversa)).resolves.toBe(false);
    expect(conversa.status).toBe('ia');
    expect(conversa.assunto).toBe('convenios');
  });

  it('não sobrescreve o assunto quando o resultado é "outro"', async () => {
    classificarMensagem.mockResolvedValue({ precisaHumano: false, assunto: 'outro' });
    const conversa = novaConversa({ assunto: 'agendamento' });
    await avaliarHandoff(conversa);
    expect(conversa.assunto).toBe('agendamento');
  });

  it('faz handoff com o motivo e a urgência do classificador', async () => {
    classificarMensagem.mockResolvedValue({
      precisaHumano: true, motivo: 'sintomas_fisicos', urgencia: 'alta', assunto: 'outro',
    });
    const conversa = novaConversa();
    await expect(avaliarHandoff(conversa)).resolves.toBe(true);
    expect(conversa).toMatchObject({
      status: 'humano', motivoHandoff: 'sintomas_fisicos', urgenciaHandoff: 'alta',
    });
  });

  it('faz handoff por falha_ia quando o classificador falha', async () => {
    classificarMensagem.mockRejectedValue(new Error('fora do ar'));
    const conversa = novaConversa();
    await expect(avaliarHandoff(conversa)).resolves.toBe(true);
    expect(conversa.motivoHandoff).toBe('falha_ia');
  });
});

describe('registrarAssunto', () => {
  it('grava o assunto classificado', async () => {
    classificarMensagem.mockResolvedValue({ precisaHumano: false, assunto: 'valores' });
    const conversa = novaConversa();
    await registrarAssunto(conversa);
    expect(conversa.assunto).toBe('valores');
  });

  it('ignora a falha do classificador sem fazer handoff', async () => {
    classificarMensagem.mockRejectedValue(new Error('fora do ar'));
    const conversa = novaConversa();
    await expect(registrarAssunto(conversa)).resolves.toBeUndefined();
    expect(conversa.status).toBe('ia');
  });
});

describe('responderIA', () => {
  it('devolve a resposta da IA passando os dados do contato', async () => {
    gerarResposta.mockResolvedValue('Olá!');
    const conversa = novaConversa({ pacienteId: 'p1', nome: 'Maria', telefone: '5511987654321' });
    await expect(responderIA(conversa)).resolves.toBe('Olá!');
    expect(gerarResposta).toHaveBeenCalledWith(conversa.mensagens, {
      contato: { pacienteId: 'p1', nome: 'Maria', telefone: '5511987654321' },
    });
  });

  it('em caso de falha, devolve null e passa para humano', async () => {
    gerarResposta.mockRejectedValue(new Error('falhou'));
    const conversa = novaConversa();
    await expect(responderIA(conversa)).resolves.toBeNull();
    expect(conversa.status).toBe('humano');
    expect(conversa.motivoHandoff).toBe('falha_ia');
  });

  it('em caso de falha, não faz handoff quando handoffEmFalha é false', async () => {
    gerarResposta.mockRejectedValue(new Error('falhou'));
    const conversa = novaConversa();
    await expect(responderIA(conversa, { handoffEmFalha: false })).resolves.toBeNull();
    expect(conversa.status).toBe('ia');
  });

  it('passa para humano quando a IA responde [HUMANO]', async () => {
    gerarResposta.mockResolvedValue('[HUMANO]');
    const conversa = novaConversa();
    await expect(responderIA(conversa)).resolves.toBeNull();
    expect(conversa).toMatchObject({
      status: 'humano',
      aguardandoHumano: true,
      motivoHandoff: 'sem_informacao',
    });
  });

  it('encerra a conversa quando a IA responde [ENCERRAR]', async () => {
    gerarResposta.mockResolvedValue('[ENCERRAR]');
    const conversa = novaConversa({ aguardandoHumano: true });
    await expect(responderIA(conversa)).resolves.toBeNull();
    expect(conversa.status).toBe('concluida');
    expect(conversa.encerradaEm).toBeInstanceOf(Date);
    expect(conversa.aguardandoHumano).toBe(false);
  });

  it('reconhece o marcador em minúsculas e junto de outro texto', async () => {
    gerarResposta.mockResolvedValue('[humano] não sei responder');
    const conversa = novaConversa();
    await expect(responderIA(conversa)).resolves.toBeNull();
    expect(conversa.status).toBe('humano');
  });

  it('devolve a resposta vazia sem alterar a conversa', async () => {
    gerarResposta.mockResolvedValue(undefined);
    const conversa = novaConversa();
    await expect(responderIA(conversa)).resolves.toBeUndefined();
    expect(conversa.status).toBe('ia');
  });
});