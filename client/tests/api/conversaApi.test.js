import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listarConversas, obterConversa, criarConversa,
  enviarMensagem, listarHandoffs, removerConversa,
} from '../../src/api/conversaApi';

const fetchMock = vi.fn();
const resposta = (dados, ok = true) => ({ ok, json: () => Promise.resolve(dados) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

// [função, chamada, trecho esperado da URL, método HTTP, mensagem de erro]
const casos = [
  ['listarConversas', () => listarConversas(), '/api/conversas', undefined, 'Erro ao listar conversas'],
  ['obterConversa', () => obterConversa('7'), '/api/conversas/7', undefined, 'Erro ao buscar conversa'],
  ['criarConversa', () => criarConversa({ nome: 'Maria' }), '/api/conversas', 'POST', 'Erro ao criar conversa'],
  ['enviarMensagem', () => enviarMensagem('7', 'Oi'), '/api/conversas/7/mensagens', 'POST', 'Erro ao enviar mensagem'],
  ['listarHandoffs', () => listarHandoffs(), '/api/conversas/handoffs', undefined, 'Erro ao listar handoffs'],
  ['removerConversa', () => removerConversa('7'), '/api/conversas/7', 'DELETE', 'Erro ao apagar conversa'],
];

describe('conversaApi', () => {
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

  it('criarConversa envia os dados como JSON', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await criarConversa({ nome: 'Maria', telefone: '5511987654321' });
    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Maria', telefone: '5511987654321' });
  });

  it('enviarMensagem envia o texto', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    await enviarMensagem('7', 'Bom dia');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ texto: 'Bom dia' });
  });
});