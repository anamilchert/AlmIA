import { authFetch } from './auth';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard`;

export async function obterMetricasDashboard() {
  const res = await authFetch(`${API_URL}/metricas`);
  if (!res.ok) throw new Error('Erro ao carregar o dashboard');
  return res.json();
}