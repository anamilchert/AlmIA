jest.mock('../../src/models/Usuario', () => {
  const modelo = { findOne: jest.fn(), create: jest.fn() };
  modelo.PAPEIS = ['gestor', 'recepcao'];
  return modelo;
});
jest.mock('../../src/services/authService', () => ({
  gerarHash: jest.fn(),
  conferirSenha: jest.fn(),
  gerarToken: jest.fn(),
}));

const Usuario = require('../../src/models/Usuario');
const { gerarHash, conferirSenha, gerarToken } = require('../../src/services/authService');
const { login, eu, criarUsuario } = require('../../src/controllers/authController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const usuarioBanco = {
  _id: 'u1',
  nome: 'Ana',
  email: 'ana@almia.pro',
  papel: 'gestor',
  ownerId: 'clinica-1',
  senhaHash: 'hash',
};

let erroSpy;
beforeEach(() => {
  jest.resetAllMocks();
  erroSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => erroSpy.mockRestore());

describe('login', () => {
  const buscar = (usuario) => Usuario.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(usuario) });

  it('responde 400 sem e-mail ou senha', async () => {
    const res = criarRes();
    await login({ body: { email: '' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devolve token e dados públicos com credenciais corretas', async () => {
    buscar(usuarioBanco);
    conferirSenha.mockResolvedValue(true);
    gerarToken.mockReturnValue('token-123');
    const res = criarRes();
    await login({ body: { email: ' ANA@almia.pro ', senha: 'senha-segura-1' } }, res);
    expect(Usuario.findOne).toHaveBeenCalledWith({ email: 'ana@almia.pro', ativo: true });
    expect(res.json).toHaveBeenCalledWith({
      token: 'token-123',
      usuario: { id: 'u1', nome: 'Ana', email: 'ana@almia.pro', papel: 'gestor' },
    });
  });

  it('responde 401 com senha errada, sem revelar o motivo', async () => {
    buscar(usuarioBanco);
    conferirSenha.mockResolvedValue(false);
    const res = criarRes();
    await login({ body: { email: 'ana@almia.pro', senha: 'errada' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'E-mail ou senha inválidos.' });
  });

  it('responde 401 quando o usuário não existe', async () => {
    buscar(null);
    const res = criarRes();
    await login({ body: { email: 'x@almia.pro', senha: 'qualquer' } }, res);
    expect(conferirSenha).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responde 500 se o banco falhar', async () => {
    Usuario.findOne.mockImplementation(() => { throw new Error('banco'); });
    const res = criarRes();
    await login({ body: { email: 'ana@almia.pro', senha: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('eu', () => {
  it('devolve o usuário logado', async () => {
    Usuario.findOne.mockResolvedValue(usuarioBanco);
    const res = criarRes();
    await eu({ usuarioId: 'u1' }, res);
    expect(res.json).toHaveBeenCalledWith({
      usuario: { id: 'u1', nome: 'Ana', email: 'ana@almia.pro', papel: 'gestor' },
    });
  });

  it('responde 401 quando o usuário não existe mais', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const res = criarRes();
    await eu({ usuarioId: 'u1' }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responde 500 se o banco falhar', async () => {
    Usuario.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await eu({ usuarioId: 'u1' }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('criarUsuario', () => {
  const corpoValido = { nome: 'Mariana', email: 'Mariana@almia.pro', senha: 'senha-segura-1', papel: 'recepcao' };

  it.each([
    [{ ...corpoValido, nome: '' }, 'nome'],
    [{ ...corpoValido, email: 'invalido' }, 'e-mail'],
    [{ ...corpoValido, senha: 'curta' }, 'senha'],
    [{ ...corpoValido, papel: 'dono' }, 'perfil'],
  ])('responde 400 para dados inválidos (%#: %s)', async (corpo) => {
    const res = criarRes();
    await criarUsuario({ body: corpo, ownerId: 'clinica-1' }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  it('responde 409 quando o e-mail já existe', async () => {
    Usuario.findOne.mockResolvedValue(usuarioBanco);
    const res = criarRes();
    await criarUsuario({ body: corpoValido, ownerId: 'clinica-1' }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('cria o usuário na clínica de quem está logado, com a senha em hash', async () => {
    Usuario.findOne.mockResolvedValue(null);
    gerarHash.mockResolvedValue('hash-gerado');
    Usuario.create.mockResolvedValue({ ...usuarioBanco, _id: 'u2', nome: 'Mariana', email: 'mariana@almia.pro', papel: 'recepcao' });
    const res = criarRes();
    await criarUsuario({ body: corpoValido, ownerId: 'clinica-1' }, res);
    expect(Usuario.create).toHaveBeenCalledWith({
      nome: 'Mariana',
      email: 'mariana@almia.pro',
      papel: 'recepcao',
      ownerId: 'clinica-1',
      senhaHash: 'hash-gerado',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      usuario: { id: 'u2', nome: 'Mariana', email: 'mariana@almia.pro', papel: 'recepcao' },
    });
  });

  it('responde 500 se o banco falhar', async () => {
    Usuario.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await criarUsuario({ body: corpoValido, ownerId: 'clinica-1' }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});