import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HandoffsAguardando from '../../src/pages/Dashboard/HandoffsAguardando';
import { useHandoffs } from '../../src/context/HandoffsContext';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../src/context/HandoffsContext', () => ({ useHandoffs: vi.fn() }));

const alternarSom = vi.fn();

const estado = (extra = {}) => ({
  total: 0,
  itens: [],
  somAtivo: false,
  alternarSom,
  ...extra,
});

const itens = [
  { _id: 'a', nome: 'Maria', motivo: 'emergencia', urgencia: 'alta', desde: '2026-11-19T14:55:00Z' },
  { _id: 'b', nome: 'João', motivo: null, urgencia: 'baixa', desde: '2026-11-19T14:59:50Z' },
  { _id: 'c', nome: 'Ana', motivo: 'xyz', urgencia: 'media', desde: '2026-11-19T13:00:00Z' },
];

beforeEach(() => {
  navigateMock.mockReset();
  alternarSom.mockReset();
  useHandoffs.mockReturnValue(estado());
  // só a data é falsa, para a conta do "há X min" ser previsível
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00Z'));
});

afterEach(() => vi.useRealTimers());

describe('HandoffsAguardando', () => {
  it('mostra a mensagem de vazio quando ninguém está aguardando', () => {
    const { container } = render(<HandoffsAguardando />);

    expect(screen.getByText('Nenhuma conversa aguardando atendente.')).toBeInTheDocument();
    expect(container.querySelector('.hfa-contador')).toHaveTextContent('0');
    expect(container.querySelector('.hfa')).not.toHaveClass('hfa-alerta');
  });

  it('lista as conversas com o motivo e há quanto tempo aguardam', () => {
    useHandoffs.mockReturnValue(estado({ total: 3, itens }));
    const { container } = render(<HandoffsAguardando />);

    expect(container.querySelector('.hfa-contador')).toHaveTextContent('3');
    expect(container.querySelector('.hfa')).toHaveClass('hfa-alerta');

    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('Possível emergência')).toBeInTheDocument();
    expect(screen.getByText('há 5 min')).toBeInTheDocument();

    expect(screen.getByText('Assumida pela equipe')).toBeInTheDocument(); // sem motivo
    expect(screen.getByText('agora')).toBeInTheDocument();

    expect(screen.getByText('Precisa de atenção')).toBeInTheDocument(); // motivo desconhecido
    expect(screen.getByText('há 2 h')).toBeInTheDocument();
  });

  it('abre a conversa ao clicar em um item', async () => {
    useHandoffs.mockReturnValue(estado({ total: 3, itens }));
    render(<HandoffsAguardando />);

    await userEvent.click(screen.getByRole('button', { name: /Maria/ }));

    expect(navigateMock).toHaveBeenCalledWith('/conversas/a');
  });

  it('oferece ativar o som e chama a ação ao clicar', async () => {
    render(<HandoffsAguardando />);

    await userEvent.click(screen.getByRole('button', { name: /Ativar som/ }));

    expect(alternarSom).toHaveBeenCalledTimes(1);
  });

  it('indica que o som está ativado', () => {
    useHandoffs.mockReturnValue(estado({ somAtivo: true }));
    render(<HandoffsAguardando />);
    expect(screen.getByRole('button', { name: /Som ativado/ })).toBeInTheDocument();
  });
});