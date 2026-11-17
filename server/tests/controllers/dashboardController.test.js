jest.mock('../../src/models/Conversa', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock('../../src/models/Agendamento', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));

const Conversa = require('../../src/models/Conversa');
const Agendamento = require('../../src/models/Agendamento');
const { obterMetricas } = require('../../src/controllers/dashboardController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function configurarBanco({
  conversasDoDia = [],
  handoffsRecentes = [],
  agendamentosIA = [],
  porHoraRaw = [],
  assuntos = [],
} = {}) {
  Conversa.find.mockImplementation((filtro) => {
    if (filtro.ultimaMensagemEm) {
      return { select: () => Promise.resolve(conversasDoDia) };
    }
    return { sort: () => ({ limit: () => ({ select: () => Promise.resolve(handoffsRecentes) }) }) };
  });
  Conversa.aggregate.mockResolvedValueOnce(porHoraRaw).mockResolvedValueOnce(assuntos);
  Agendamento.find.mockReturnValue({
    sort: () => ({ limit: () => Promise.resolve(agendamentosIA) }),
  });
}

let erroSpy;
beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers({
    now: new Date('2026-11-16T15:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'],
  });
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  erroSpy.mockRestore();
});

describe('obterMetricas', () => {
  it('monta as métricas de hoje e de ontem, listas e tempo médio de resposta', async () => {
    Conversa.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);
    Agendamento.countDocuments.mockResolvedValue(2);
    configurarBanco({
      conversasDoDia: [
        {
          mensagens: [
            { remetente: 'paciente', data: '2026-11-16T12:00:00Z' },
            { remetente: 'bot', data: '2026-11-16T12:00:10Z' }, // 10 s
            { remetente: 'paciente', data: '2026-11-16T12:05:00Z' },
            { remetente: 'humano', data: '2026-11-16T12:05:20Z' }, // 20 s
          ],
        },
        {
          mensagens: [
            { remetente: 'paciente', data: '2026-11-16T13:00:00Z' },
            { remetente: 'paciente', data: '2026-11-16T13:00:30Z' }, // não reinicia a espera
            { remetente: 'bot', data: '2026-11-16T13:01:00Z' }, // 60 s
            { remetente: 'paciente', data: '2026-11-15T12:00:00Z' }, // de ontem: ignorada
            { remetente: 'bot', data: '2026-11-15T12:00:50Z' },
          ],
        },
      ],
      porHoraRaw: [
        { _id: { hora: 9, tipo: 'ia' }, total: 4 },
        { _id: { hora: 9, tipo: 'humano' }, total: 1 },
      ],
      assuntos: [{ _id: 'agendamento', total: 6 }, { _id: 'outro', total: 1 }],
      agendamentosIA: [
        { _id: 'a1', nome: 'Maria', especialidade: 'Ortopedia', medico: 'Dr. R', data: 'd', status: 'agendada', extra: 'x' },
      ],
      handoffsRecentes: [
        { _id: 'c1', nome: 'João', motivoHandoff: 'pedido_humano', handoffEm: 'h1', aguardandoHumano: true },
        { _id: 'c2', nome: 'Ana', motivoHandoff: 'reclamacao', handoffEm: 'h2' },
      ],
    });
    const res = criarRes();

    await obterMetricas({}, res);

    const r = res.json.mock.calls[0][0];
    expect(r.conversasHoje).toBe(10);
    expect(r.conversasOntem).toBe(5);
    expect(r.resolvidasPelaIA).toBe(70);
    expect(r.resolvidasPelaIAOntem).toBe(100);
    expect(r.handoffsHoje).toBe(3);
    expect(r.handoffsOntem).toBe(0);
    expect(r.tempoMedioRespostaSeg).toBe(30); // (10 + 20 + 60) / 3
    expect(r.agendamentosIAHoje).toBe(2);
    expect(r.porHora).toHaveLength(24);
    expect(r.porHora[9]).toEqual({ hora: 9, ia: 4, humano: 1 });
    expect(r.porHora[10]).toEqual({ hora: 10, ia: 0, humano: 0 });
    expect(r.assuntosSemana).toEqual([
      { assunto: 'agendamento', total: 6 },
      { assunto: 'outro', total: 1 },
    ]);
    expect(r.agendamentosIA).toEqual([
      { _id: 'a1', nome: 'Maria', especialidade: 'Ortopedia', medico: 'Dr. R', data: 'd', status: 'agendada' },
    ]);
    expect(r.handoffsRecentes).toEqual([
      { _id: 'c1', nome: 'João', motivo: 'pedido_humano', desde: 'h1', aberto: true },
      { _id: 'c2', nome: 'Ana', motivo: 'reclamacao', desde: 'h2', aberto: false },
    ]);
  });

  it('sem conversas: percentuais 0 e tempo médio nulo', async () => {
    Conversa.countDocuments.mockResolvedValue(0);
    Agendamento.countDocuments.mockResolvedValue(0);
    configurarBanco();
    const res = criarRes();

    await obterMetricas({}, res);

    const r = res.json.mock.calls[0][0];
    expect(r.resolvidasPelaIA).toBe(0);
    expect(r.resolvidasPelaIAOntem).toBe(0);
    expect(r.tempoMedioRespostaSeg).toBeNull();
    expect(r.assuntosSemana).toEqual([]);
    expect(r.handoffsRecentes).toEqual([]);
  });

  it('responde 500 se o banco falhar', async () => {
    Conversa.countDocuments.mockRejectedValue(new Error('banco'));
    Agendamento.countDocuments.mockResolvedValue(0);
    configurarBanco();
    const res = criarRes();

    await obterMetricas({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});