const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/pacientes`;

export async function listarPacientes() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Erro ao listar pacientes');
  return res.json();
}

export async function obterPaciente(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar paciente');
  return res.json();
}

export async function criarPaciente(dados) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error('Erro ao cadastrar paciente');
  return res.json();
}

export async function removerPaciente(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao excluir paciente');
  return res.json();
}