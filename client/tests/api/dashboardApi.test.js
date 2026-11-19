import { describe, it, expect, vi, beforeEach } from 'vitest';
import { obterMetricasDashboard } from '../../src/api/dashboardApi';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('dashboardApi', () => {
  it('busca as métricas do dashboard', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ conversasHoje: 10 }) });

    await expect(obterMetricasDashboard()).resolves.toEqual({ conversasHoje: 10 });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/dashboard/metricas');
  });

  it('lança erro quando a API responde com falha', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    await expect(obterMetricasDashboard()).rejects.toThrow('Erro ao carregar o dashboard');
  });
});