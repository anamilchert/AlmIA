jest.mock('../../src/models/Paciente', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  insertMany: jest.fn(),
}));
jest.mock('../../src/utils/buildTimelinePaciente', () => jest.fn());
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));
  jest.mock('../../src/services/finalizarAgendamentos', () => ({
    finalizarAgendamentosVencidos: jest.fn(),
  }));

const XLSX = require('xlsx');
const Paciente = require('../../src/models/Paciente');
const buildTimelinePaciente = require('../../src/utils/buildTimelinePaciente');
const {
  listarPacientes,
  obterPaciente,
  criarPaciente,
  buscarPacientePorTelefone,
  buscarPacientePorNome,
  importarPacientes,
} = require('../../src/controllers/pacienteController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockPlanilha(linhas) {
  XLSX.read.mockReturnValue({ SheetNames: ['Aba1'], Sheets: { Aba1: {} } });
  XLSX.utils.sheet_to_json.mockReturnValue(linhas);
}

beforeEach(() => jest.resetAllMocks());

describe('listarPacientes', () => {
  it('devolve a lista de pacientes', async () => {
    const lista = [{ nome: 'Maria' }];
    Paciente.find.mockReturnValue({ select: jest.fn().mockResolvedValue(lista) });
    const res = criarRes();
    await listarPacientes({}, res);
    expect(res.json).toHaveBeenCalledWith(lista);
  });

  it('responde 500 se o banco falhar', async () => {
    Paciente.find.mockImplementation(() => { throw new Error('banco'); });
    const res = criarRes();
    await listarPacientes({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('obterPaciente', () => {
  it('devolve paciente, timeline e estatísticas', async () => {
    const paciente = {
      consultas: [
        { especialidade: 'Ortopedia' },
        { especialidade: 'Ortopedia' },
        { especialidade: 'Cardiologia' },
      ],
      conversasResumo: [{ duracaoMinutos: 5 }, { duracaoMinutos: null }],
    };
    Paciente.findOne.mockResolvedValue(paciente);
    buildTimelinePaciente.mockReturnValue(['evento']);
    const res = criarRes();

    await obterPaciente({ params: { id: '1' } }, res);

    expect(res.json).toHaveBeenCalledWith({
      paciente,
      timeline: ['evento'],
      stats: { consultas: 3, conversas: 2, especialidades: 2, emAberto: 1 },
    });
  });

  it('retorna 404 quando não encontra', async () => {
    Paciente.findOne.mockResolvedValue(null);
    const res = criarRes();
    await obterPaciente({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responde 500 se o banco falhar', async () => {
    Paciente.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await obterPaciente({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('criarPaciente', () => {
  it('cria o paciente com o ownerId e responde 201', async () => {
    Paciente.create.mockResolvedValue({ _id: 'p1' });
    const res = criarRes();
    await criarPaciente({ body: { nome: 'Maria', telefone: '5511987654321' } }, res);
    expect(Paciente.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Maria', ownerId: 'owner-teste-001' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('responde 400 com detalhes se a criação falhar', async () => {
    Paciente.create.mockRejectedValue(new Error('inválido'));
    const res = criarRes();
    await criarPaciente({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ detalhes: 'inválido' }));
  });
});

describe('buscarPacientePorTelefone', () => {
  it('devolve null sem consultar o banco quando não há telefone', async () => {
    await expect(buscarPacientePorTelefone('')).resolves.toBeNull();
    expect(Paciente.findOne).not.toHaveBeenCalled();
  });

  it('busca pelo telefone exato', async () => {
    Paciente.findOne.mockResolvedValue({ _id: 'p1' });
    await buscarPacientePorTelefone('5511987654321');
    expect(Paciente.findOne).toHaveBeenCalledWith({
      ownerId: 'owner-teste-001',
      telefone: '5511987654321',
    });
  });
});

describe('buscarPacientePorNome', () => {
  it('busca sem diferenciar maiúsculas e ignorando espaços nas pontas', async () => {
    Paciente.findOne.mockResolvedValue(null);
    await buscarPacientePorNome('  Maria Silva ');
    expect(Paciente.findOne).toHaveBeenCalledWith({
      ownerId: 'owner-teste-001',
      nome: { $regex: '^Maria Silva$', $options: 'i' },
    });
  });
});

describe('importarPacientes', () => {
  it('retorna 400 quando não há arquivo', async () => {
    const res = criarRes();
    await importarPacientes({}, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(XLSX.read).not.toHaveBeenCalled();
  });

  it('retorna 400 quando nenhuma linha tem nome', async () => {
    mockPlanilha([{ telefone: '1' }, { nome: '   ' }]);
    const res = criarRes();
    await importarPacientes({ file: { buffer: Buffer.from('x') } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Paciente.insertMany).not.toHaveBeenCalled();
  });

  it('importa só as linhas válidas e monta os campos', async () => {
    mockPlanilha([
      {
        nome: '  Maria Silva ', telefone: 5511987654321, dataNascimento: '1985-03-15',
        cidade: 'Joinville', email: 'm@x.com', operadora: 'Amil',
      },
      { nome: 'João' },
      { telefone: '999' },
    ]);
    Paciente.insertMany.mockImplementation(async (docs) => docs);
    const res = criarRes();

    await importarPacientes({ file: { buffer: Buffer.from('x') } }, res);

    const docs = Paciente.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({
      nome: 'Maria Silva',
      telefone: '5511987654321',
      cidade: 'Joinville',
      email: 'm@x.com',
      planoSaude: { operadora: 'Amil' },
    });
    expect(docs[0].dataNascimento).toBeInstanceOf(Date);
    expect(docs[1]).toMatchObject({ nome: 'João', telefone: '', cidade: '', email: '' });
    expect(docs[1].dataNascimento).toBeUndefined();
    expect(docs[1].planoSaude).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
  });

  it('responde 400 se a leitura ou a inserção falhar', async () => {
    XLSX.read.mockImplementation(() => { throw new Error('arquivo corrompido'); });
    const res = criarRes();
    await importarPacientes({ file: { buffer: Buffer.from('x') } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ detalhes: 'arquivo corrompido' })
    );
  });
});