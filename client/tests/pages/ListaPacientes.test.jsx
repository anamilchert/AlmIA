import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListaPacientes from '../../src/pages/Pacientes/ListaPacientes';
import { listarPacientes, removerPaciente } from '../../src/api/pacienteApi';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../src/api/pacienteApi', () => ({
  listarPacientes: vi.fn(),
  removerPaciente: vi.fn(),
}));

const pacientes = [
  { _id: '1', nome: 'Maria Silva', telefone: '5511987654321', planoSaude: { operadora: 'Amil' } },
  { _id: '2', nome: 'João', telefone: '' },
];

beforeEach(() => {
  navigateMock.mockReset();
  listarPacientes.mockReset();
  removerPaciente.mockReset();
  listarPacientes.mockResolvedValue(pacientes);
});

describe('ListaPacientes', () => {
  it('mostra "Carregando..." e depois a lista de pacientes', async () => {
    render(<ListaPacientes />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

    expect(screen.getByText('5511987654321')).toBeInTheDocument();
    expect(screen.getByText('Amil')).toBeInTheDocument();
    expect(screen.getByText('MS')).toBeInTheDocument(); // iniciais
    expect(screen.getByText('sem telefone')).toBeInTheDocument();
  });

  it('avisa quando não há pacientes', async () => {
    listarPacientes.mockResolvedValue([]);
    render(<ListaPacientes />);
    expect(await screen.findByText('Nenhum paciente encontrado.')).toBeInTheDocument();
  });

  it('mostra a lista vazia quando a API falha', async () => {
    listarPacientes.mockRejectedValue(new Error('fora do ar'));
    render(<ListaPacientes />);
    expect(await screen.findByText('Nenhum paciente encontrado.')).toBeInTheDocument();
  });

  it('filtra pacientes pela busca', async () => {
    render(<ListaPacientes />);
    await screen.findByText('Maria Silva');

    await userEvent.type(screen.getByPlaceholderText('Buscar paciente...'), 'joão');

    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('abre o histórico do paciente ao clicar na linha', async () => {
    render(<ListaPacientes />);
    await userEvent.click(await screen.findByText('Maria Silva'));
    expect(navigateMock).toHaveBeenCalledWith('/pacientes/1');
  });

  it('exclui o paciente depois de confirmar', async () => {
    removerPaciente.mockResolvedValue({ ok: true });
    render(<ListaPacientes />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir paciente' })[0]);
    expect(screen.getByText('Excluir?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(removerPaciente).toHaveBeenCalledWith('1');
    await waitFor(() => expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalled(); // o clique não abre o histórico
  });

  it('cancela a exclusão', async () => {
    render(<ListaPacientes />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir paciente' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Não' }));

    expect(screen.queryByText('Excluir?')).not.toBeInTheDocument();
    expect(removerPaciente).not.toHaveBeenCalled();
  });

  it('mostra o erro quando a exclusão falha e mantém o paciente', async () => {
    removerPaciente.mockRejectedValue(new Error('Erro ao excluir paciente'));
    render(<ListaPacientes />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir paciente' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Erro ao excluir paciente')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });
});