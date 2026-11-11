jest.mock('../../src/models/ClinicConfig', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const ClinicConfig = require('../../src/models/ClinicConfig');
const {
  getConfig,
  updateConfig,
  buildContextoParaIA,
} = require('../../src/controllers/clinicConfigController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

let erroSpy;
beforeEach(() => {
  jest.resetAllMocks();
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => erroSpy.mockRestore());

describe('getConfig', () => {
  it('devolve a configuração existente', async () => {
    const config = { owner: 'owner-teste-001' };
    ClinicConfig.findOne.mockResolvedValue(config);
    const res = criarRes();
    await getConfig({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(config);
    expect(ClinicConfig.create).not.toHaveBeenCalled();
  });

  it('cria uma configuração vazia na primeira vez', async () => {
    ClinicConfig.findOne.mockResolvedValue(null);
    ClinicConfig.create.mockResolvedValue({ owner: 'owner-teste-001' });
    const res = criarRes();
    await getConfig({}, res);
    expect(ClinicConfig.create).toHaveBeenCalledWith({
      owner: 'owner-teste-001',
      dadosGerais: { nomeClinica: '' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('usa o userId da requisição quando existir', async () => {
    ClinicConfig.findOne.mockResolvedValue({});
    await getConfig({ userId: 'user-1' }, criarRes());
    expect(ClinicConfig.findOne).toHaveBeenCalledWith({ owner: 'user-1' });
  });

  it('responde 500 se o banco falhar', async () => {
    ClinicConfig.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await getConfig({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateConfig', () => {
  it('atualiza somente os campos enviados', async () => {
    ClinicConfig.findOneAndUpdate.mockResolvedValue({ ok: true });
    const res = criarRes();
    await updateConfig(
      { body: { dadosGerais: { nomeClinica: 'Clínica X' }, convenios: ['Amil'] } },
      res
    );
    const [filtro, update, opcoes] = ClinicConfig.findOneAndUpdate.mock.calls[0];
    expect(filtro).toEqual({ owner: 'owner-teste-001' });
    expect(update.$set).toEqual({
      dadosGerais: { nomeClinica: 'Clínica X' },
      convenios: ['Amil'],
    });
    expect(opcoes).toMatchObject({ new: true, upsert: true, runValidators: true });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('aceita todos os blocos de configuração', async () => {
    ClinicConfig.findOneAndUpdate.mockResolvedValue({});
    const body = {
      dadosGerais: { a: 1 }, horarios: [{ dia: 'Seg' }], convenios: ['Unimed'],
      preparoExames: [{ nome: 'x' }], mensagensBot: { boasVindas: 'Oi' }, avancado: { b: 2 },
    };
    await updateConfig({ body }, criarRes());
    expect(ClinicConfig.findOneAndUpdate.mock.calls[0][1].$set).toEqual(body);
  });

  it('responde 500 se salvar falhar', async () => {
    ClinicConfig.findOneAndUpdate.mockRejectedValue(new Error('erro'));
    const res = criarRes();
    await updateConfig({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('buildContextoParaIA', () => {
  it('devolve string vazia quando a clínica não tem configuração', async () => {
    ClinicConfig.findOne.mockResolvedValue(null);
    await expect(buildContextoParaIA('owner-1')).resolves.toBe('');
  });

  it('monta o texto com dados, horários ativos, convênios e preparos', async () => {
    ClinicConfig.findOne.mockResolvedValue({
      dadosGerais: {
        nomeClinica: 'Clínica Doutor Ortopedia',
        especialidades: 'Ortopedia',
        endereco: 'Rua A, 10',
        telefonePrincipal: '4733334444',
      },
      horarios: [
        { dia: 'Segunda', abertura: '08:00', fechamento: '18:00', ativo: true },
        { dia: 'Domingo', abertura: '00:00', fechamento: '00:00', ativo: false },
      ],
      convenios: ['Amil', 'Unimed'],
      mensagensBot: { boasVindas: 'Olá!', foraHorario: 'Voltamos amanhã.' },
      preparoExames: [{ nome: 'Raio-X', instrucoes: 'Sem preparo' }],
    });

    const texto = await buildContextoParaIA('owner-1');

    expect(ClinicConfig.findOne).toHaveBeenCalledWith({ owner: 'owner-1' });
    expect(texto).toContain('Nome da clínica: Clínica Doutor Ortopedia');
    expect(texto).toContain('Segunda: 08:00–18:00');
    expect(texto).not.toContain('Domingo');
    expect(texto).toContain('Convênios aceitos: Amil, Unimed');
    expect(texto).toContain('- Raio-X: Sem preparo');
    expect(texto).toContain('Mensagem fora do horário: Voltamos amanhã.');
  });
});