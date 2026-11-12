const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/agendamentos`;

export async function listarAgendamentos() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Erro ao listar agendamentos');
  return res.json();
}

export async function criarAgendamento(dados) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error('Erro ao criar agendamento');
  return res.json();
}

export async function atualizarStatus(id, status) {
  const res = await fetch(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Erro ao atualizar agendamento');
  return res.json();
}

export async function removerAgendamento(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao excluir agendamento');
  return res.json();
}