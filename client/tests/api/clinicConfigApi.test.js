import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClinicConfig, saveClinicConfig } from '../../src/api/clinicConfigApi';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('clinicConfigApi', () => {
  it('getClinicConfig busca a configuração com o header JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ nome: 'Clínica X' }) });

    await expect(getClinicConfig()).resolves.toEqual({ nome: 'Clínica X' });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/clinic-config');
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('saveClinicConfig envia os dados com PUT', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });

    await saveClinicConfig({ convenios: ['Amil'] });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/clinic-config');
    expect(opcoes.method).toBe('PUT');
    expect(JSON.parse(opcoes.body)).toEqual({ convenios: ['Amil'] });
  });

  it('usa a mensagem de erro devolvida pela API', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ message: 'Config inválida' }) });
    await expect(getClinicConfig()).rejects.toThrow('Config inválida');
  });

  it('usa a mensagem padrão quando a resposta de erro não é JSON', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('sem corpo')) });
    await expect(getClinicConfig()).rejects.toThrow('Erro na requisição.');
  });
});