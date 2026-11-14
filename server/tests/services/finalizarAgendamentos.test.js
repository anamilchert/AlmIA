jest.mock('../../src/models/Agendamento', () => ({ find: jest.fn() }));
jest.mock('../../src/models/Paciente', () => ({ findOne: jest.fn(), updateOne: jest.fn() }));

const Agendamento = require('../../src/models/Agendamento');
const Paciente = require('../../src/models/Paciente');
const { finalizarAgendamentosVencidos } = require('../../src/services/finalizarAgendamentos');

const AGORA = new Date('2026-11-12T12:00:00Z');

function fabricar(extra = {}) {
  return {
    _id: 'a1', pacienteId: 'p1', telefone: '', especialidade: 'Ortopedia', medico: 'Dr. Gerson',
    data: new Date('2026-11-01T10:00:00Z'), duracaoMinutos: 30, observacoes: '',
    status: 'confirmado', save: jest.fn(), ...extra,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('finalizarAgendamentosVencidos', () => {
  it('conclui o agendamento e grava a consulta no histórico do paciente', async () => {
    const a = fabricar();
    Agendamento.find.mockResolvedValue([a]);
    const total = await finalizarAgendamentosVencidos('owner-1', AGORA);
    expect(total).toBe(1);
    const [filtro, update] = Paciente.updateOne.mock.calls[0];
    expect(filtro).toEqual({
      _id: 'p1', ownerId: 'owner-1', 'consultas.agendamentoId': { $ne: 'a1' }
    });
    expect(update.$push.consultas).toMatchObject({
      especialidade: 'Ortopedia', medico: 'Dr. Gerson', status: 'realizada', agendamentoId: 'a1'
    });
    expect(a.status).toBe('concluido');
    expect(a.save).toHaveBeenCalled();
  });

  it('só considera vencido quando data + duração já passou', async () => {
    const emAndamento = fabricar({ data: new Date('2026-11-12T11:45:00Z') });
    Agendamento.find.mockResolvedValue([emAndamento]);
    const total = await finalizarAgendamentosVencidos('owner-1', AGORA);
    expect(total).toBe(0);
    expect(Paciente.updateOne).not.toHaveBeenCalled();
    expect(emAndamento.status).toBe('confirmado');
  });

  it('usa o telefone para achar o paciente quando não há pacienteId', async () => {
    const a = fabricar({ pacienteId: null, telefone: '5547999999999' });
    Agendamento.find.mockResolvedValue([a]);
    Paciente.findOne.mockResolvedValue({ _id: 'p9' });
    await finalizarAgendamentosVencidos('owner-1', AGORA);
    expect(Paciente.findOne).toHaveBeenCalledWith({
      ownerId: 'owner-1', telefone: '5547999999999'
    });
    expect(Paciente.updateOne.mock.calls[0][0]._id).toBe('p9');
  });

  it('conclui sem vincular quando não encontra o paciente', async () => {
    const a = fabricar({ pacienteId: null, telefone: '' });
    Agendamento.find.mockResolvedValue([a]);
    await finalizarAgendamentosVencidos('owner-1', AGORA);
    expect(Paciente.updateOne).not.toHaveBeenCalled();
    expect(a.status).toBe('concluido');
  });
});