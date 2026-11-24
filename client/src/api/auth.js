const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CHAVE_TOKEN = 'almia:token';

export const EVENTO_SESSAO_EXPIRADA = 'almia:sessao-expirada';

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token) {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    return;
  }
}

export function limparToken() {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    return;
  }
}

export async function authFetch(url, options = {}) {
  const token = lerToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && token) {
    limparToken();
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }

  return res;
}

export async function entrar(email, senha) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || 'Não foi possível entrar.');
  return dados;
}

export async function buscarUsuarioLogado() {
  const res = await authFetch(`${API_URL}/api/auth/eu`);
  if (!res.ok) throw new Error('Sessão inválida.');
  return res.json();
}