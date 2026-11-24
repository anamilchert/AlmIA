import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authFetch, entrar, buscarUsuarioLogado,
  lerToken, salvarToken, limparToken, EVENTO_SESSAO_EXPIRADA,
} from '../../src/api/auth';

const fetchMock = vi.fn();
const resposta = (dados, ok = true, status = 200) => ({ ok, status, json: () => Promise.resolve(dados) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

describe('token', () => {
  it('salva, lê e limpa o token', () => {
    expect(lerToken()).toBeNull();
    salvarToken('abc');
    expect(lerToken()).toBe('abc');
    limparToken();
    expect(lerToken()).toBeNull();
  });
});

describe('authFetch', () => {
  it('não envia Authorization quando não há token', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await authFetch('http://api/x');
    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers.Authorization).toBeUndefined();
  });

  it('envia o token e preserva as demais opções', async () => {
    salvarToken('abc');
    fetchMock.mockResolvedValue(resposta({}));
    await authFetch('http://api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/x');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBe('{}');
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer abc' });
  });

  it('limpa o token e avisa quando a API responde 401', async () => {
    salvarToken('abc');
    const aoExpirar = vi.fn();
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    fetchMock.mockResolvedValue(resposta({}, false, 401));

    await authFetch('http://api/x');

    expect(lerToken()).toBeNull();
    expect(aoExpirar).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  });

  it('não avisa expiração quando não havia sessão', async () => {
    const aoExpirar = vi.fn();
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    fetchMock.mockResolvedValue(resposta({}, false, 401));

    await authFetch('http://api/x');

    expect(aoExpirar).not.toHaveBeenCalled();
    window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  });
});

describe('entrar', () => {
  it('envia e-mail e senha e devolve token e usuário', async () => {
    fetchMock.mockResolvedValue(resposta({ token: 't', usuario: { nome: 'Ana' } }));

    await expect(entrar('ana@almia.pro', 'senha')).resolves.toEqual({ token: 't', usuario: { nome: 'Ana' } });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(opcoes.method).toBe('POST');
    expect(JSON.parse(opcoes.body)).toEqual({ email: 'ana@almia.pro', senha: 'senha' });
  });

  it('usa a mensagem de erro da API', async () => {
    fetchMock.mockResolvedValue(resposta({ erro: 'E-mail ou senha inválidos.' }, false, 401));
    await expect(entrar('a@a.com', 'x')).rejects.toThrow('E-mail ou senha inválidos.');
  });

  it('usa a mensagem padrão quando a resposta não tem corpo', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error('vazio')) });
    await expect(entrar('a@a.com', 'x')).rejects.toThrow('Não foi possível entrar.');
  });
});

describe('buscarUsuarioLogado', () => {
  it('devolve o usuário da sessão', async () => {
    salvarToken('abc');
    fetchMock.mockResolvedValue(resposta({ usuario: { nome: 'Ana' } }));
    await expect(buscarUsuarioLogado()).resolves.toEqual({ usuario: { nome: 'Ana' } });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/auth/eu');
  });

  it('lança erro quando a sessão é inválida', async () => {
    fetchMock.mockResolvedValue(resposta({}, false, 401));
    await expect(buscarUsuarioLogado()).rejects.toThrow('Sessão inválida.');
  });
});