import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listarAgendamentos, criarAgendamento, atualizarStatus, removerAgendamento,
} from '../../src/api/agendamentoApi';

const fetchMock = vi.fn();
const resposta = (dados, ok = true) => ({ ok, json: () => Promise.resolve(dados) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

// [função, chamada, trecho esperado da URL, método HTTP, mensagem de erro]
const casos = [
  ['listarAgendamentos', () => listarAgendamentos(), '/api/agendamentos', undefined, 'Erro ao listar agendamentos'],
  ['criarAgendamento', () => criarAgendamento({ nome: 'Maria' }), '/api/agendamentos', 'POST', 'Erro ao criar agendamento'],
  ['atualizarStatus', () => atualizarStatus('5', 'confirmado'), '/api/agendamentos/5/status', 'PATCH', 'Erro ao atualizar agendamento'],
  ['removerAgendamento', () => removerAgendamento('5'), '/api/agendamentos/5', 'DELETE', 'Erro ao excluir agendamento'],
];

describe('agendamentoApi', () => {
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

  it('criarAgendamento envia os dados como JSON', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await criarAgendamento({ nome: 'Maria' });
    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Maria' });
  });

  it('atualizarStatus envia o novo status', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await atualizarStatus('5', 'cancelado');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ status: 'cancelado' });
  });
});