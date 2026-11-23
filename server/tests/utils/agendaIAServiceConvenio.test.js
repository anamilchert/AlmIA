jest.mock('../../src/models/Agendamento', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/models/ClinicConfig', () => ({ findOne: jest.fn() }));

const Agendamento = require('../../src/models/Agendamento');
const ClinicConfig = require('../../src/models/ClinicConfig');
const { ferramentas, horariosLivres, agendar } = require('../../src/services/agendaIAService');

const OWNER = 'o1';
const TER = '2026-11-17';
const contato = { pacienteId: 'p1', nome: 'Maria', telefone: '5511987654321' };
const params = { data: TER, hora: '08:30' };

const config = (extra = {}) => ({
  listaEspecialidades: ['Ortopedia'],
  convenios: ['Amil', 'Unimed'],
  medicos: [{ nome: 'Dr. Ricardo', especialidade: 'Ortopedia' }],
  horarios: [{ dia: 'Ter', ativo: true, abertura: '08:00', fechamento: '10:00' }],
  ...extra,
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers({
    now: new Date('2026-11-16T15:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'],
  });
  ClinicConfig.findOne.mockResolvedValue(config());
  Agendamento.find.mockResolvedValue([]);
  Agendamento.findOne.mockResolvedValue(null);
  Agendamento.create.mockResolvedValue({});
});
afterEach(() => jest.useRealTimers());

describe('ferramentas — tipo de atendimento', () => {
  it('as duas ferramentas aceitam tipo_atendimento e convenio', () => {
    ferramentas.forEach((f) => {
      const props = f.function.parameters.properties;
      expect(props.tipo_atendimento.enum).toEqual(['particular', 'convenio']);
      expect(props).toHaveProperty('convenio');
    });
  });
});

describe('horariosLivres — convênio', () => {
  it('rejeita convênio que a clínica não aceita', async () => {
    await expect(
      horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio', convenio: 'Bradesco' })
    ).resolves.toEqual({ erro: 'Convênio não aceito. Aceitos: Amil, Unimed.' });
  });

  it('informa quando a clínica não tem nenhum convênio cadastrado', async () => {
    ClinicConfig.findOne.mockResolvedValue(config({ convenios: [] }));
    await expect(
      horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio', convenio: 'Amil' })
    ).resolves.toEqual({ erro: 'Convênio não aceito. Aceitos: nenhum.' });
  });

  it('reconhece o convênio pelo nome parcial e sem maiúscula', async () => {
    const r = await horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio', convenio: 'amil' });
    expect(r.horarios).toHaveLength(4);
  });

  it('só considera médicos que atendem convênio', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. Paulo', especialidade: 'Ortopedia', atendeConvenio: false },
          { nome: 'Dr. Ricardo', especialidade: 'Ortopedia' },
        ],
      })
    );
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, medico: 'Dr. Ricardo', especialidade: 'Ortopedia' },
    ]);
    const r = await horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio', convenio: 'Amil' });
    expect(r.horarios).toEqual(['08:30', '09:00', '09:30']);
  });

  it('avisa quando nenhum médico da especialidade atende o convênio', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ medicos: [{ nome: 'Dr. Paulo', especialidade: 'Ortopedia', convenios: ['Unimed'] }] })
    );
    await expect(
      horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio', convenio: 'Amil' })
    ).resolves.toEqual({ erro: 'Nenhum médico dessa especialidade atende o convênio Amil.' });
  });

  it('avisa quando nenhum médico atende por convênio, sem citar o convênio', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ medicos: [{ nome: 'Dr. Paulo', especialidade: 'Ortopedia', atendeConvenio: false }] })
    );
    await expect(
      horariosLivres(OWNER, { data: TER, tipo_atendimento: 'convenio' })
    ).resolves.toEqual({ erro: 'Nenhum médico dessa especialidade atende por convênio.' });
  });

  it('avisa quando o médico pedido atende apenas particular', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. Paulo', especialidade: 'Ortopedia', atendeConvenio: false },
          { nome: 'Dr. Ricardo', especialidade: 'Ortopedia' },
        ],
      })
    );
    await expect(
      horariosLivres(OWNER, {
        data: TER,
        medico: 'Dr. Paulo',
        tipo_atendimento: 'convenio',
        convenio: 'Amil',
      })
    ).resolves.toEqual({ erro: 'Esse médico atende apenas consulta particular.' });
  });

  it('avisa quais convênios o médico pedido atende', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. Paulo', especialidade: 'Ortopedia', convenios: ['Unimed'] },
          { nome: 'Dr. Ricardo', especialidade: 'Ortopedia' },
        ],
      })
    );
    await expect(
      horariosLivres(OWNER, {
        data: TER,
        medico: 'Dr. Paulo',
        tipo_atendimento: 'convenio',
        convenio: 'Amil',
      })
    ).resolves.toEqual({ erro: 'Esse médico não atende esse convênio. Convênios dele: Unimed.' });
  });
});

describe('agendar — tipo de atendimento', () => {
  it('registra a consulta por convênio com o nome do convênio', async () => {
    const r = await agendar(OWNER, contato, {
      ...params,
      tipo_atendimento: 'convenio',
      convenio: 'unimed',
    });

    expect(r).toMatchObject({ ok: true, tipo_atendimento: 'convenio' });
    expect(Agendamento.create.mock.calls[0][0]).toMatchObject({
      tipoAtendimento: 'convenio',
      convenio: 'Unimed',
    });
  });

  it('registra a consulta particular sem convênio', async () => {
    const r = await agendar(OWNER, contato, { ...params, tipo_atendimento: 'particular' });

    expect(r).toMatchObject({ ok: true, tipo_atendimento: 'particular' });
    expect(Agendamento.create.mock.calls[0][0]).toMatchObject({
      tipoAtendimento: 'particular',
      convenio: '',
    });
  });

  it('exige o nome do convênio quando o atendimento é por convênio', async () => {
    await expect(
      agendar(OWNER, contato, { ...params, tipo_atendimento: 'convenio' })
    ).resolves.toEqual({ erro: 'Informe qual é o convênio do paciente.' });
    expect(Agendamento.create).not.toHaveBeenCalled();
  });

  it('ignora tipo de atendimento desconhecido', async () => {
    const r = await agendar(OWNER, contato, { ...params, tipo_atendimento: 'xyz' });

    expect(r.ok).toBe(true);
    expect(r).not.toHaveProperty('tipo_atendimento');
    expect(Agendamento.create.mock.calls[0][0]).toMatchObject({ tipoAtendimento: '' });
  });
});