import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../../src/Components/Sidebar/Sidebar';
import { useHandoffs } from '../../src/context/HandoffsContext';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../src/context/HandoffsContext', () => ({ useHandoffs: vi.fn() }));

beforeEach(() => {
  navigateMock.mockReset();
  useHandoffs.mockReturnValue({ total: 0 });
});

describe('Sidebar', () => {
  it('mostra os itens do menu e o usuário', () => {
    render(<Sidebar />);

    ['Dashboard', 'Conversas', 'Agendamentos', 'Pacientes', 'Clínica'].forEach((nome) => {
      expect(screen.getByRole('button', { name: new RegExp(nome) })).toBeInTheDocument();
    });
    expect(screen.getByText('Mariana Reis')).toBeInTheDocument();
  });

  it('marca como ativo apenas o item informado', () => {
    render(<Sidebar ativo="pacientes" />);

    const ativos = screen.getAllByRole('button').filter((b) => b.classList.contains('active'));
    expect(ativos).toHaveLength(1);
    expect(ativos[0]).toHaveTextContent('Pacientes');
  });

  it('usa "Clínica" como item ativo por padrão', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /Clínica/ })).toHaveClass('active');
  });

  it('navega para a rota do item clicado', async () => {
    render(<Sidebar ativo="dashboard" />);

    await userEvent.click(screen.getByRole('button', { name: /Agendamentos/ }));

    expect(navigateMock).toHaveBeenCalledWith('/agendamentos');
  });

  it('mostra o total de handoffs em Conversas quando há pendências', () => {
    useHandoffs.mockReturnValue({ total: 3 });
    render(<Sidebar />);

    expect(screen.getByText('3')).toHaveClass('sb-badge');
  });

  it('não mostra o contador quando não há pendências', () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector('.sb-badge')).toBeNull();
  });
});