const API_URL = 'http://localhost:5000/api/pacientes';

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