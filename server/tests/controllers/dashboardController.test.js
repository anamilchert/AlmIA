jest.mock('../../src/models/Conversa', () => ({ countDocuments: jest.fn(), aggregate: jest.fn() }));

const Conversa = require('../../src/models/Conversa');
const { obterMetricas } = require('../../src/controllers/dashboardController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.resetAllMocks());

describe('obterMetricas', () => {
  it('calcula conversas, % resolvidas pela IA, handoffs e conversas por hora', async () => {
    Conversa.countDocuments
      .mockResolvedValueOnce(10) // conversas de hoje
      .mockResolvedValueOnce(7)  // sem handoff
      .mockResolvedValueOnce(3); // handoffs de hoje
    Conversa.aggregate.mockResolvedValue([
      { _id: { hora: 9, tipo: 'ia' }, total: 4 },
      { _id: { hora: 9, tipo: 'humano' }, total: 1 },
    ]);
    const res = criarRes();

    await obterMetricas({}, res);

    const resposta = res.json.mock.calls[0][0];
    expect(resposta.conversasHoje).toBe(10);
    expect(resposta.resolvidasPelaIA).toBe(70);
    expect(resposta.handoffsHoje).toBe(3);
    expect(resposta.tempoMedioRespostaSeg).toBeNull();
    expect(resposta.porHora).toHaveLength(24);
    expect(resposta.porHora[9]).toEqual({ hora: 9, ia: 4, humano: 1 });
    expect(resposta.porHora[10]).toEqual({ hora: 10, ia: 0, humano: 0 });
  });

  it('retorna 0% resolvidas quando não há conversas hoje', async () => {
    Conversa.countDocuments.mockResolvedValue(0);
    Conversa.aggregate.mockResolvedValue([]);
    const res = criarRes();
    await obterMetricas({}, res);
    expect(res.json.mock.calls[0][0].resolvidasPelaIA).toBe(0);
  });

  it('responde 500 se o banco falhar', async () => {
    Conversa.countDocuments.mockRejectedValue(new Error('banco'));
    Conversa.aggregate.mockResolvedValue([]);
    const res = criarRes();
    await obterMetricas({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});