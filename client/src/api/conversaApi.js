const API_URL = 'http://localhost:5000/api/conversas';

export async function listarConversas() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Erro ao listar conversas');
  return res.json();
}

export async function obterConversa(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar conversa');
  return res.json();
}

export async function criarConversa(dados) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error('Erro ao criar conversa');
  return res.json();
}

export async function enviarMensagem(id, texto) {
  const res = await fetch(`${API_URL}/${id}/mensagens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto })
  });
  if (!res.ok) throw new Error('Erro ao enviar mensagem');
  return res.json();
}