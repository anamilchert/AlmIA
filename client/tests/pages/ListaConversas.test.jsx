import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListaConversas from '../../src/pages/Conversas/ListaConversas';
import { listarConversas, criarConversa, removerConversa } from '../../src/api/conversaApi';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../src/api/conversaApi', () => ({
  listarConversas: vi.fn(),
  criarConversa: vi.fn(),
  removerConversa: vi.fn(),
}));

const conversas = [
  { _id: 'c1', nome: 'Maria Silva', status: 'ia', ultimaMensagem: 'Oi' },
  { _id: 'c2', nome: 'João', status: 'humano', ultimaMensagem: '' },
  { _id: 'c3', nome: 'Ana Paula Souza', status: 'concluida' },
  { _id: 'c4', nome: 'Zé', status: 'desconhecido' },
];

beforeEach(() => {
  navigateMock.mockReset();
  listarConversas.mockReset();
  criarConversa.mockReset();
  removerConversa.mockReset();
  listarConversas.mockResolvedValue(conversas);
});

describe('ListaConversas', () => {
  it('lista as conversas com status, iniciais e prévia', async () => {
    render(<ListaConversas />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Oi')).toBeInTheDocument();
    expect(screen.getAllByText('Sem mensagens ainda')).toHaveLength(3);

    expect(screen.getByText('Humano')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.getAllByText('IA')).toHaveLength(2); // status ia + status desconhecido

    expect(screen.getByText('MS')).toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument(); // só as duas primeiras iniciais
  });

  it('avisa quando não há conversas ou a API falha', async () => {
    listarConversas.mockRejectedValue(new Error('fora do ar'));
    render(<ListaConversas />);
    expect(await screen.findByText('Nenhuma conversa encontrada.')).toBeInTheDocument();
  });

  it('filtra pela busca', async () => {
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.type(screen.getByPlaceholderText('Buscar conversa...'), 'ana');

    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Paula Souza')).toBeInTheDocument();
  });

  it('abre a conversa ao clicar na linha', async () => {
    render(<ListaConversas />);
    await userEvent.click(await screen.findByText('Maria Silva'));
    expect(navigateMock).toHaveBeenCalledWith('/conversas/c1');
  });

  it('exige o nome para criar uma conversa', async () => {
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(screen.getByText('Nome é obrigatório.')).toBeInTheDocument();
    expect(criarConversa).not.toHaveBeenCalled();
  });

  it('cria a conversa e abre o chat', async () => {
    criarConversa.mockResolvedValue({ _id: 'novo1' });
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    await userEvent.type(screen.getByPlaceholderText('Nome completo'), '  Carla Dias ');
    await userEvent.type(screen.getByPlaceholderText('Telefone (opcional)'), '5511999999999');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(criarConversa).toHaveBeenCalledWith({ nome: 'Carla Dias', telefone: '5511999999999' });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/conversas/novo1'));
  });

  it('mostra o erro quando a criação falha', async () => {
    criarConversa.mockRejectedValue(new Error('Erro ao criar conversa'));
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    await userEvent.type(screen.getByPlaceholderText('Nome completo'), 'Carla Dias');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByText('Erro ao criar conversa')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('fecha o formulário ao cancelar', async () => {
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    expect(screen.getByPlaceholderText('Nome completo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByPlaceholderText('Nome completo')).not.toBeInTheDocument();
  });

  it('apaga a conversa depois de confirmar', async () => {
    removerConversa.mockResolvedValue({ ok: true });
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Apagar conversa' })[0]);
    expect(screen.getByText('Apagar?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(removerConversa).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('cancela a exclusão ao clicar em "Não"', async () => {
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Apagar conversa' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Não' }));

    expect(screen.queryByText('Apagar?')).not.toBeInTheDocument();
    expect(removerConversa).not.toHaveBeenCalled();
  });

  it('mostra o erro quando apagar falha e mantém a conversa', async () => {
    removerConversa.mockRejectedValue(new Error('Erro ao apagar conversa'));
    render(<ListaConversas />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Apagar conversa' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Erro ao apagar conversa')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });
});