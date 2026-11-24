const { gerarHash, conferirSenha, gerarToken, verificarToken } = require('../../src/services/authService');

const usuario = { _id: 'u1', papel: 'gestor', ownerId: 'clinica-1' };

beforeEach(() => {
  process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-16-caracteres';
});

describe('senha', () => {
  it('gera um hash diferente da senha e confere a senha correta', async () => {
    const hash = await gerarHash('senha-segura-1');
    expect(hash).not.toBe('senha-segura-1');
    await expect(conferirSenha('senha-segura-1', hash)).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    const hash = await gerarHash('senha-segura-1');
    await expect(conferirSenha('outra-senha', hash)).resolves.toBe(false);
  });
});

describe('token', () => {
  it('gera um token que carrega usuário, papel e clínica', () => {
    const dados = verificarToken(gerarToken(usuario));
    expect(dados).toMatchObject({ sub: 'u1', papel: 'gestor', ownerId: 'clinica-1' });
    expect(dados.exp).toBeGreaterThan(dados.iat);
  });

  it('rejeita um token adulterado', () => {
    const token = gerarToken(usuario);
    expect(() => verificarToken(`${token}x`)).toThrow();
  });

  it('rejeita um token assinado com outro segredo', () => {
    const token = gerarToken(usuario);
    process.env.JWT_SECRET = 'outro-segredo-com-mais-de-16-caracteres';
    expect(() => verificarToken(token)).toThrow();
  });

  it('falha quando JWT_SECRET não está configurado', () => {
    delete process.env.JWT_SECRET;
    expect(() => gerarToken(usuario)).toThrow('JWT_SECRET');
  });
});