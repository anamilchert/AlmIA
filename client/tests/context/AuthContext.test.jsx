import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { buscarUsuarioLogado, entrar, lerToken, limparToken, salvarToken } from '../../src/api/auth';

vi.mock('../../src/api/auth', () => ({
  EVENTO_SESSAO_EXPIRADA: 'almia:sessao-expirada',
  buscarUsuarioLogado: vi.fn(),
  entrar: vi.fn(),
  lerToken: vi.fn(),
  limparToken: vi.fn(),
  salvarToken: vi.fn(),
}));

function Consumidor() {
  const { usuario, carregando, entrar: fazerLogin, sair } = useAuth();
  return (
    <div>
      <span data-testid="estado">{carregando ? 'carregando' : usuario ? usuario.nome : 'anonimo'}</span>
      <button onClick={() => fazerLogin('ana@almia.pro', 'senha')}>login</button>
      <button onClick={sair}>sair</button>
    </div>
  );
}

const montar = () => render(<AuthProvider><Consumidor /></AuthProvider>);

beforeEach(() => {
  vi.resetAllMocks();
  lerToken.mockReturnValue(null);
});

describe('AuthProvider', () => {
  it('começa sem usuário quando não há token guardado', () => {
    montar();
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
    expect(buscarUsuarioLogado).not.toHaveBeenCalled();
  });

  it('restaura a sessão quando há um token válido', async () => {
    lerToken.mockReturnValue('abc');
    buscarUsuarioLogado.mockResolvedValue({ usuario: { nome: 'Ana', papel: 'gestor' } });
    montar();
    expect(screen.getByTestId('estado')).toHaveTextContent('carregando');
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('Ana'));
  });

  it('descarta o token quando a sessão é inválida', async () => {
    lerToken.mockReturnValue('abc');
    buscarUsuarioLogado.mockRejectedValue(new Error('inválida'));
    montar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(limparToken).toHaveBeenCalled();
  });

  it('faz login, guarda o token e define o usuário', async () => {
    entrar.mockResolvedValue({ token: 't1', usuario: { nome: 'Ana' } });
    montar();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('Ana'));
    expect(entrar).toHaveBeenCalledWith('ana@almia.pro', 'senha');
    expect(salvarToken).toHaveBeenCalledWith('t1');
  });

  it('encerra a sessão ao sair', async () => {
    entrar.mockResolvedValue({ token: 't1', usuario: { nome: 'Ana' } });
    montar();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('Ana'));
    await userEvent.click(screen.getByText('sair'));
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
    expect(limparToken).toHaveBeenCalled();
  });

  it('desloga quando a sessão expira em outra chamada', async () => {
    entrar.mockResolvedValue({ token: 't1', usuario: { nome: 'Ana' } });
    montar();
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('Ana'));
    act(() => { window.dispatchEvent(new Event('almia:sessao-expirada')); });
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
  });
});