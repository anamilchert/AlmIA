import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../../src/pages/Login/Login';
import { useAuth } from '../../src/context/AuthContext';

vi.mock('../../src/context/AuthContext', () => ({ useAuth: vi.fn() }));

const entrarMock = vi.fn();

function montar(entradas = ['/login']) {
  return render(
    <MemoryRouter initialEntries={entradas}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>Tela do dashboard</p>} />
        <Route path="/conversas" element={<p>Tela de conversas</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function preencherEEnviar(email = 'ana@almia.pro', senha = 'senha-segura-1') {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  entrarMock.mockReset();
  useAuth.mockReturnValue({ usuario: null, entrar: entrarMock });
});

describe('Login', () => {
  it('entra com e-mail e senha e vai para o dashboard', async () => {
    entrarMock.mockResolvedValue({ nome: 'Ana' });
    montar();

    await preencherEEnviar();

    expect(entrarMock).toHaveBeenCalledWith('ana@almia.pro', 'senha-segura-1');
    expect(await screen.findByText('Tela do dashboard')).toBeInTheDocument();
  });

  it('volta para a página que o usuário tentou abrir', async () => {
    entrarMock.mockResolvedValue({ nome: 'Ana' });
    montar([{ pathname: '/login', state: { de: '/conversas' } }]);

    await preencherEEnviar();

    expect(await screen.findByText('Tela de conversas')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro quando as credenciais são inválidas', async () => {
    entrarMock.mockRejectedValue(new Error('E-mail ou senha inválidos.'));
    montar();

    await preencherEEnviar();

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.queryByText('Tela do dashboard')).toBeNull();
  });

  it('redireciona direto quando já existe uma sessão', () => {
    useAuth.mockReturnValue({ usuario: { nome: 'Ana' }, entrar: entrarMock });
    montar();
    expect(screen.getByText('Tela do dashboard')).toBeInTheDocument();
  });

  it('mostra e esconde a senha ao clicar no olho', async () => {
    montar();
    const campo = screen.getByLabelText('Senha');
    expect(campo).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(campo).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(campo).toHaveAttribute('type', 'password');
  });

  it('mostra a orientação ao clicar em esqueci minha senha', async () => {
    montar();
    expect(screen.queryByText(/redefinição/)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));

    expect(screen.getByText(/redefinição/)).toBeInTheDocument();
  });
});