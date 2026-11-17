jest.mock('../../src/models/Agendamento', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/models/ClinicConfig', () => ({ findOne: jest.fn() }));

const Agendamento = require('../../src/models/Agendamento');
const ClinicConfig = require('../../src/models/ClinicConfig');
const {
  ferramentas,
  executarFerramenta,
  horariosLivres,
  agendar,
  regrasDeEscolha,
} = require('../../src/services/agendaIAService');

const OWNER = 'o1';
const TER = '2026-11-17';

const config = (extra = {}) => ({
  listaEspecialidades: ['Ortopedia'],
  medicos: [{ nome: 'Dr. Ricardo', especialidade: 'Ortopedia' }],
  horarios: [
    { dia: 'Seg', ativo: true, abertura: '10:00', fechamento: '16:00' },
    { dia: 'Ter', ativo: true, abertura: '08:00', fechamento: '10:00' }, // 08:00, 08:30, 09:00, 09:30
    { dia: 'Qua', ativo: false, abertura: '08:00', fechamento: '12:00' },
  ],
  ...extra,
});

let erroSpy;
beforeEach(() => {
  jest.resetAllMocks();
  // segunda-feira, 12h em Brasília
  jest.useFakeTimers({
    now: new Date('2026-11-16T15:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'],
  });
  ClinicConfig.findOne.mockResolvedValue(config());
  Agendamento.find.mockResolvedValue([]);
  Agendamento.findOne.mockResolvedValue(null);
  Agendamento.create.mockResolvedValue({});
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  erroSpy.mockRestore();
});

describe('ferramentas', () => {
  it('expõe as duas ferramentas para o modelo', () => {
    expect(ferramentas.map((f) => f.function.name)).toEqual([
      'consultar_horarios_livres',
      'criar_agendamento',
    ]);
  });
});

describe('horariosLivres — validações', () => {
  it('rejeita data inválida', async () => {
    await expect(horariosLivres(OWNER, { data: 'abc' })).resolves.toEqual({
      erro: 'Data inválida. Use o formato AAAA-MM-DD.',
    });
    await expect(horariosLivres(OWNER, { data: '2026-02-30' })).resolves.toHaveProperty('erro');
  });

  it('rejeita data que já passou', async () => {
    await expect(horariosLivres(OWNER, { data: '2026-11-15' })).resolves.toEqual({
      erro: 'Essa data já passou.',
    });
  });

  it('rejeita data a mais de 90 dias', async () => {
    await expect(horariosLivres(OWNER, { data: '2027-03-01' })).resolves.toEqual({
      erro: 'Só é possível agendar até 90 dias à frente.',
    });
  });

  it('avisa quando a clínica não configurou os horários', async () => {
    ClinicConfig.findOne.mockResolvedValue(null);
    await expect(horariosLivres(OWNER, { data: TER })).resolves.toEqual({
      erro: 'A clínica ainda não configurou os horários de atendimento.',
    });
  });

  it('exige a especialidade quando há mais de uma', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ listaEspecialidades: ['Ortopedia', 'Cardiologia'] })
    );
    await expect(horariosLivres(OWNER, { data: TER })).resolves.toEqual({
      erro: 'Informe a especialidade. Disponíveis: Ortopedia, Cardiologia.',
    });
    await expect(horariosLivres(OWNER, { data: TER, especialidade: 'Dermato' })).resolves.toEqual({
      erro: 'Especialidade não encontrada. Disponíveis: Ortopedia, Cardiologia.',
    });
  });

  it('aceita a especialidade por nome parcial, sem acento ou maiúscula', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ listaEspecialidades: ['Ortopedia', 'Cardiologia'] })
    );
    const r = await horariosLivres(OWNER, { data: TER, especialidade: 'cardio' });
    expect(r.especialidade).toBe('Cardiologia');
  });

  it('sem lista de especialidades: exige informar, e aceita o que vier', async () => {
    ClinicConfig.findOne.mockResolvedValue(config({ listaEspecialidades: [] }));
    await expect(horariosLivres(OWNER, { data: TER })).resolves.toEqual({
      erro: 'Informe a especialidade.',
    });
    const r = await horariosLivres(OWNER, { data: TER, especialidade: 'Qualquer' });
    expect(r.especialidade).toBe('Qualquer');
  });

  it('valida o médico informado', async () => {
    await expect(
      horariosLivres(OWNER, { data: TER, medico: 'Dr. Paulo' })
    ).resolves.toEqual({
      erro: 'Médico não encontrado nessa especialidade. Disponíveis: Dr. Ricardo.',
    });

    ClinicConfig.findOne.mockResolvedValue(config({ medicos: [] }));
    await expect(
      horariosLivres(OWNER, { data: TER, medico: 'Dr. Paulo' })
    ).resolves.toEqual({ erro: 'Não há médicos cadastrados nessa especialidade.' });
  });

  it('avisa quando a clínica não atende no dia', async () => {
    await expect(horariosLivres(OWNER, { data: '2026-11-18' })).resolves.toEqual({
      erro: 'A clínica não atende em Qua.', // dia inativo
    });
    await expect(horariosLivres(OWNER, { data: '2026-11-19' })).resolves.toEqual({
      erro: 'A clínica não atende em Qui.', // sem janela cadastrada
    });
  });
});

describe('horariosLivres — resultado', () => {
  it('lista todos os horários do dia quando está livre', async () => {
    await expect(horariosLivres(OWNER, { data: TER })).resolves.toEqual({
      data: TER,
      dia_semana: 'Ter',
      especialidade: 'Ortopedia',
      horarios: ['08:00', '08:30', '09:00', '09:30'],
    });
  });

  it('aceita o médico por nome parcial', async () => {
    const r = await horariosLivres(OWNER, { data: TER, medico: 'ricardo' });
    expect(r.horarios).toHaveLength(4);
  });

  it('remove horários já ocupados pelo médico', async () => {
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, medico: 'Dr. Ricardo', especialidade: 'Ortopedia' }, // 08:00
    ]);
    const r = await horariosLivres(OWNER, { data: TER });
    expect(r.horarios).toEqual(['08:30', '09:00', '09:30']);
  });

  it('usa 30 minutos quando o agendamento não tem duração', async () => {
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', medico: 'Dr. Ricardo', especialidade: 'Ortopedia' },
    ]);
    const r = await horariosLivres(OWNER, { data: TER });
    expect(r.horarios).not.toContain('08:00');
    expect(r.horarios).toContain('08:30');
  });

  it('com dois médicos, o horário continua livre se um deles estiver vago', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. A', especialidade: 'Ortopedia' },
          { nome: 'Dr. B', especialidade: 'Ortopedia' },
        ],
      })
    );
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, medico: 'Dr. A', especialidade: 'Ortopedia' },
    ]);
    expect((await horariosLivres(OWNER, { data: TER })).horarios).toContain('08:00');

    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, medico: 'Dr. A', especialidade: 'Ortopedia' },
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, medico: 'Dr. B', especialidade: 'Ortopedia' },
    ]);
    expect((await horariosLivres(OWNER, { data: TER })).horarios).not.toContain('08:00');
  });

  it('sem médicos cadastrados, o conflito é por especialidade', async () => {
    ClinicConfig.findOne.mockResolvedValue(config({ medicos: [] }));
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:00:00Z', duracaoMinutos: 30, especialidade: 'ortopedia' },
    ]);
    const r = await horariosLivres(OWNER, { data: TER });
    expect(r.horarios).toEqual(['08:30', '09:00', '09:30']);
  });

  it('não oferece horários que já passaram hoje', async () => {
    const r = await horariosLivres(OWNER, { data: '2026-11-16' }); // segunda, agora = 12:00
    expect(r.horarios).not.toContain('12:00');
    expect(r.horarios[0]).toBe('12:30');
  });

  it('devolve lista vazia se a janela tiver horário inválido', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ horarios: [{ dia: 'Ter', ativo: true, abertura: 'abc', fechamento: '10:00' }] })
    );
    const r = await horariosLivres(OWNER, { data: TER });
    expect(r.horarios).toEqual([]);
  });
});

describe('agendar', () => {
  const contatoCadastrado = { pacienteId: 'p1', nome: 'Maria', telefone: '5511987654321' };
  const params = { data: TER, hora: '08:30' };

  it('rejeita hora em formato inválido', async () => {
    await expect(agendar(OWNER, contatoCadastrado, { data: TER, hora: 'abc' })).resolves.toEqual({
      erro: 'Hora inválida. Use o formato HH:mm.',
    });
    await expect(agendar(OWNER, contatoCadastrado, { data: TER, hora: '25:00' })).resolves.toHaveProperty('erro');
  });

  it('repassa o erro de validação do dia', async () => {
    await expect(
      agendar(OWNER, contatoCadastrado, { data: '2026-11-15', hora: '08:30' })
    ).resolves.toEqual({ erro: 'Essa data já passou.' });
  });

  it('rejeita horário fora do funcionamento', async () => {
    await expect(agendar(OWNER, contatoCadastrado, { data: TER, hora: '07:00' })).resolves.toEqual({
      erro: 'Esse horário está fora do funcionamento da clínica.',
    });
    await expect(agendar(OWNER, contatoCadastrado, { data: TER, hora: '10:00' })).resolves.toEqual({
      erro: 'Esse horário está fora do funcionamento da clínica.',
    });
  });

  it('rejeita horário que já passou hoje', async () => {
    await expect(
      agendar(OWNER, contatoCadastrado, { data: '2026-11-16', hora: '10:00' })
    ).resolves.toEqual({ erro: 'Esse horário já passou.' });
  });

  it('rejeita horário já ocupado', async () => {
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:30:00Z', duracaoMinutos: 30, medico: 'Dr. Ricardo', especialidade: 'Ortopedia' },
    ]);
    await expect(agendar(OWNER, contatoCadastrado, params)).resolves.toEqual({
      erro: 'Esse horário não está mais disponível.',
    });
    expect(Agendamento.create).not.toHaveBeenCalled();
  });

  it('exige o nome completo quando o paciente não é cadastrado', async () => {
    await expect(agendar(OWNER, { telefone: '1' }, params)).resolves.toEqual({
      erro: 'Informe o nome completo do paciente para agendar.',
    });
  });

  it('rejeita agendamento duplicado do mesmo telefone', async () => {
    Agendamento.findOne.mockResolvedValue({ _id: 'x' });
    await expect(agendar(OWNER, contatoCadastrado, params)).resolves.toEqual({
      erro: 'O paciente já tem um agendamento nesse horário.',
    });
    expect(Agendamento.create).not.toHaveBeenCalled();
  });

  it('cria o agendamento do paciente cadastrado', async () => {
    const r = await agendar(OWNER, contatoCadastrado, params);

    expect(r).toEqual({
      ok: true,
      especialidade: 'Ortopedia',
      medico: 'Dr. Ricardo',
      data: '17/11/2026',
      hora: '08:30',
      dia_semana: 'Ter',
    });
    const criado = Agendamento.create.mock.calls[0][0];
    expect(criado).toMatchObject({
      ownerId: OWNER,
      pacienteId: 'p1',
      nome: 'Maria',
      telefone: '5511987654321',
      especialidade: 'Ortopedia',
      medico: 'Dr. Ricardo',
      duracaoMinutos: 30,
      status: 'confirmado',
      origem: 'ia',
    });
    expect(criado.data.getTime()).toBe(new Date('2026-11-17T08:30:00-03:00').getTime());
  });

  it('cria o agendamento de quem ainda não é cadastrado, sem telefone', async () => {
    const r = await agendar(OWNER, {}, { ...params, nome_completo: '  Ana Nova ' });

    expect(r.ok).toBe(true);
    expect(Agendamento.findOne).not.toHaveBeenCalled();
    expect(Agendamento.create.mock.calls[0][0]).toMatchObject({
      nome: 'Ana Nova',
      pacienteId: null,
      telefone: '',
    });
  });

  it('escolhe o médico que estiver livre', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. A', especialidade: 'Ortopedia' },
          { nome: 'Dr. B', especialidade: 'Ortopedia' },
        ],
      })
    );
    Agendamento.find.mockResolvedValue([
      { data: '2026-11-17T11:30:00Z', duracaoMinutos: 30, medico: 'Dr. A', especialidade: 'Ortopedia' },
    ]);
    const r = await agendar(OWNER, contatoCadastrado, params);
    expect(r.medico).toBe('Dr. B');
  });

  it('devolve medico nulo quando a clínica não tem médicos cadastrados', async () => {
    ClinicConfig.findOne.mockResolvedValue(config({ medicos: [] }));
    const r = await agendar(OWNER, contatoCadastrado, params);
    expect(r.medico).toBeNull();
  });
});

describe('regrasDeEscolha', () => {
  it('devolve vazio sem configuração', async () => {
    ClinicConfig.findOne.mockResolvedValue(null);
    await expect(regrasDeEscolha(OWNER)).resolves.toBe('');
  });

  it('clínica com uma especialidade e um médico: não pergunta nada', async () => {
    const texto = await regrasDeEscolha(OWNER);
    expect(texto).toContain('apenas a especialidade Ortopedia e o médico Dr. Ricardo');
    expect(texto).toContain('Não pergunte especialidade nem médico');
  });

  it('sem especialidade configurada, usa a do médico', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ listaEspecialidades: [], medicos: [{ nome: 'Dr. X', especialidade: 'Cardiologia' }] })
    );
    await expect(regrasDeEscolha(OWNER)).resolves.toContain(
      'a especialidade Cardiologia e o médico Dr. X'
    );
  });

  it('sem nenhum dado, fala em uma única especialidade', async () => {
    ClinicConfig.findOne.mockResolvedValue(config({ listaEspecialidades: [], medicos: [] }));
    await expect(regrasDeEscolha(OWNER)).resolves.toContain('apenas uma única especialidade');
  });

  it('várias especialidades: lista e agrupa os médicos por especialidade', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        listaEspecialidades: ['Ortopedia', 'Cardiologia'],
        medicos: [
          { nome: 'Dr. A', especialidade: 'Ortopedia' },
          { nome: 'Dr. B', especialidade: 'Ortopedia' },
          { nome: 'Dr. C', especialidade: 'Cardiologia' },
          { nome: 'Dr. D' }, // sem especialidade: ignorado
        ],
      })
    );
    const texto = await regrasDeEscolha(OWNER);
    expect(texto).toContain('Especialidades disponíveis: Ortopedia, Cardiologia');
    expect(texto).toContain('Ortopedia: Dr. A, Dr. B; Cardiologia: Dr. C');
    expect(texto).not.toContain('Dr. D');
  });

  it('uma especialidade e vários médicos', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({
        medicos: [
          { nome: 'Dr. A', especialidade: 'Ortopedia' },
          { nome: 'Dr. B', especialidade: 'Ortopedia' },
        ],
      })
    );
    await expect(regrasDeEscolha(OWNER)).resolves.toContain('A única especialidade é Ortopedia');
  });

  it('várias especialidades e nenhum médico: informa "não informado"', async () => {
    ClinicConfig.findOne.mockResolvedValue(
      config({ listaEspecialidades: ['Ortopedia', 'Cardiologia'], medicos: [] })
    );
    await expect(regrasDeEscolha(OWNER)).resolves.toContain('Médicos por especialidade: não informado');
  });
});

describe('executarFerramenta', () => {
  it('consulta horários livres', async () => {
    const r = await executarFerramenta('consultar_horarios_livres', { data: TER }, { ownerId: OWNER });
    expect(r.horarios).toHaveLength(4);
  });

  it('cria agendamento e aceita contato ausente', async () => {
    const r = await executarFerramenta(
      'criar_agendamento',
      { data: TER, hora: '08:30' },
      { ownerId: OWNER }
    );
    expect(r).toEqual({ erro: 'Informe o nome completo do paciente para agendar.' });
  });

  it('recusa ferramenta desconhecida', async () => {
    await expect(
      executarFerramenta('apagar_tudo', {}, { ownerId: OWNER })
    ).resolves.toEqual({ erro: 'Ferramenta desconhecida: apagar_tudo' });
  });

  it('devolve erro amigável se o banco falhar', async () => {
    ClinicConfig.findOne.mockRejectedValue(new Error('banco'));
    await expect(
      executarFerramenta('consultar_horarios_livres', { data: TER }, { ownerId: OWNER })
    ).resolves.toEqual({ erro: 'Não foi possível acessar a agenda agora.' });
  });
});