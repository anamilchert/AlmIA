jest.mock('../../src/models/Agendamento', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

  jest.mock('../../src/services/finalizarAgendamentos', () => ({
    finalizarAgendamentosVencidos: jest.fn(),
  }));
  const { finalizarAgendamentosVencidos } = require('../../src/services/finalizarAgendamentos');

const Agendamento = require('../../src/models/Agendamento');
const {
  listarAgendamentos, criarAgendamento, atualizarStatus, removerAgendamento
} = require('../controllers/agendamentoController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.resetAllMocks());

describe('listarAgendamentos', () => {
  it('lista ordenado por data', async () => {
    const sort = jest.fn().mockResolvedValue([{ nome: 'Ana' }]);
    Agendamento.find.mockReturnValue({ sort });
    const res = criarRes();
    await listarAgendamentos({ query: {} }, res);
    expect(Agendamento.find).toHaveBeenCalledWith({ ownerId: 'owner-teste-001' });
    expect(sort).toHaveBeenCalledWith({ data: 1 });
    expect(res.json).toHaveBeenCalledWith([{ nome: 'Ana' }]);
  });

  it('aplica filtros de status e período', async () => {
    const sort = jest.fn().mockResolvedValue([]);
    Agendamento.find.mockReturnValue({ sort });
    await listarAgendamentos(
      { query: { status: 'pendente', inicio: '2026-11-01', fim: '2026-11-30' } },
      criarRes()
    );
    const filtro = Agendamento.find.mock.calls[0][0];
    expect(filtro.status).toBe('pendente');
    expect(filtro.data.$gte).toEqual(new Date('2026-11-01'));
    expect(filtro.data.$lte).toEqual(new Date('2026-11-30'));
  });

  it('retorna 500 em caso de erro', async () => {
    Agendamento.find.mockImplementation(() => { throw new Error('falha'); });
    const res = criarRes();
    await listarAgendamentos({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

      it('lista mesmo se a finalização automática falhar', async () => {
      finalizarAgendamentosVencidos.mockRejectedValue(new Error('falha'));
      const sort = jest.fn().mockResolvedValue([]);
      Agendamento.find.mockReturnValue({ sort });
      const res = criarRes();
      await listarAgendamentos({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });
});

describe('criarAgendamento', () => {
  it('cria com sucesso', async () => {
    Agendamento.create.mockResolvedValue({ _id: '1' });
    const res = criarRes();
    await criarAgendamento(
      { body: { nome: 'Ana', especialidade: 'Ortopedia', data: '2026-11-24T10:00' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 sem campos obrigatórios', async () => {
    const res = criarRes();
    await criarAgendamento({ body: { nome: 'Ana' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Agendamento.create).not.toHaveBeenCalled();
  });

  it('retorna 400 se a criação falhar', async () => {
    Agendamento.create.mockRejectedValue(new Error('invalido'));
    const res = criarRes();
    await criarAgendamento(
      { body: { nome: 'Ana', especialidade: 'Ortopedia', data: 'x' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('atualizarStatus', () => {
  it('atualiza o status', async () => {
    Agendamento.findOneAndUpdate.mockResolvedValue({ status: 'confirmado' });
    const res = criarRes();
    await atualizarStatus({ params: { id: '1' }, body: { status: 'confirmado' } }, res);
    expect(res.json).toHaveBeenCalledWith({ status: 'confirmado' });
  });

  it('retorna 400 para status inválido', async () => {
    const res = criarRes();
    await atualizarStatus({ params: { id: '1' }, body: { status: 'xyz' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existir', async () => {
    Agendamento.findOneAndUpdate.mockResolvedValue(null);
    const res = criarRes();
    await atualizarStatus({ params: { id: '1' }, body: { status: 'cancelado' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 em caso de erro', async () => {
    Agendamento.findOneAndUpdate.mockRejectedValue(new Error('falha'));
    const res = criarRes();
    await atualizarStatus({ params: { id: '1' }, body: { status: 'cancelado' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('removerAgendamento', () => {
  it('exclui o agendamento', async () => {
    Agendamento.findOneAndDelete.mockResolvedValue({ _id: '1' });
    const res = criarRes();
    await removerAgendamento({ params: { id: '1' } }, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('retorna 404 se não existir', async () => {
    Agendamento.findOneAndDelete.mockResolvedValue(null);
    const res = criarRes();
    await removerAgendamento({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 em caso de erro', async () => {
    Agendamento.findOneAndDelete.mockRejectedValue(new Error('falha'));
    const res = criarRes();
    await removerAgendamento({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});