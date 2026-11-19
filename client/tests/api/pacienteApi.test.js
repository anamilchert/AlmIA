import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listarPacientes, obterPaciente, criarPaciente, removerPaciente,
} from '../../src/api/pacienteApi';

const fetchMock = vi.fn();
const resposta = (dados, ok = true) => ({ ok, json: () => Promise.resolve(dados) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

// [função, chamada, trecho esperado da URL, método HTTP, mensagem de erro]
const casos = [
  ['listarPacientes', () => listarPacientes(), '/api/pacientes', undefined, 'Erro ao listar pacientes'],
  ['obterPaciente', () => obterPaciente('3'), '/api/pacientes/3', undefined, 'Erro ao buscar paciente'],
  ['criarPaciente', () => criarPaciente({ nome: 'Maria' }), '/api/pacientes', 'POST', 'Erro ao cadastrar paciente'],
  ['removerPaciente', () => removerPaciente('3'), '/api/pacientes/3', 'DELETE', 'Erro ao excluir paciente'],
];

describe('pacienteApi', () => {
  it.each(casos)('%s chama a URL certa e devolve o JSON', async (_nome, chamar, trechoUrl, metodo) => {
    fetchMock.mockResolvedValue(resposta({ ok: true }));

    await expect(chamar()).resolves.toEqual({ ok: true });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain(trechoUrl);
    expect(opcoes?.method).toBe(metodo);
  });

  it.each(casos)('%s lança erro quando a API responde com falha', async (_nome, chamar, _url, _metodo, mensagem) => {
    fetchMock.mockResolvedValue(resposta({}, false));
    await expect(chamar()).rejects.toThrow(mensagem);
  });

  it('criarPaciente envia os dados como JSON', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await criarPaciente({ nome: 'Maria', telefone: '5511987654321' });
    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Maria', telefone: '5511987654321' });
  });
});