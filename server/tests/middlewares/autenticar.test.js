const autenticar = require('../../src/middlewares/autenticar');
const { exigirPapel } = require('../../src/middlewares/autenticar');
const { gerarToken } = require('../../src/services/authService');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-16-caracteres';
});

describe('autenticar', () => {
  it('responde 401 sem cabeçalho de autorização', () => {
    const res = criarRes();
    const next = jest.fn();
    autenticar({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 quando o esquema não é Bearer', () => {
    const res = criarRes();
    const next = jest.fn();
    autenticar({ headers: { authorization: 'Basic abc' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 com token inválido', () => {
    const res = criarRes();
    const next = jest.fn();
    autenticar({ headers: { authorization: 'Bearer token-invalido' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('preenche o usuário, o papel e a clínica com um token válido', () => {
    const token = gerarToken({ _id: 'u1', papel: 'recepcao', ownerId: 'clinica-1' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    autenticar(req, criarRes(), next);
    expect(req).toMatchObject({ usuarioId: 'u1', papel: 'recepcao', ownerId: 'clinica-1' });
    expect(next).toHaveBeenCalled();
  });
});

describe('exigirPapel', () => {
  it('libera quem tem o papel exigido', () => {
    const next = jest.fn();
    exigirPapel('gestor')({ papel: 'gestor' }, criarRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('responde 403 para outro papel', () => {
    const res = criarRes();
    const next = jest.fn();
    exigirPapel('gestor')({ papel: 'recepcao' }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});