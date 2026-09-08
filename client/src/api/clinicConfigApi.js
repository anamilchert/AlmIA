const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// MODO TESTE: sem token de autenticação por enquanto (auth ainda não existe
// no backend). Quando existir, volte a enviar o header Authorization aqui.

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Erro na requisição.');
  }

  return res.json();
}

export function getClinicConfig() {
  return request('/api/clinic-config');
}

export function saveClinicConfig(data) {
  return request('/api/clinic-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}