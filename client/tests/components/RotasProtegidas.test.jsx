import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AreaProtegida, ExigePapel } from '../../src/Components/RotasProtegidas';
import { useAuth } from '../../src/context/AuthContext';

vi.mock('../../src/context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/context/HandoffsContext', () => ({
  HandoffsProvider: ({ children }) => <div data-testid="handoffs">{children}</div>,
}));

function montar(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/login" element={<p>Tela de login</p>} />
        <Route path="/dashboard" element={<p>Tela do dashboard</p>} />
        <Route element={<AreaProtegida />}>
          <Route path="/conversas" element={<p>Tela de conversas</p>} />
          <Route element={<ExigePapel papeis={['gestor']} />}>
            <Route path="/clinica" element={<p>Tela da clínica</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ usuario: { nome: 'Ana', papel: 'gestor' }, carregando: false });
});

describe('AreaProtegida', () => {
  it('mostra o carregamento enquanto a sessão é verificada', () => {
    useAuth.mockReturnValue({ usuario: null, carregando: true });
    montar('/conversas');
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('manda para o login quem não está autenticado', () => {
    useAuth.mockReturnValue({ usuario: null, carregando: false });
    montar('/conversas');
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra a página para quem está autenticado', () => {
    montar('/conversas');
    expect(screen.getByText('Tela de conversas')).toBeInTheDocument();
    expect(screen.getByTestId('handoffs')).toBeInTheDocument();
  });
});

describe('ExigePapel', () => {
  it('libera a página para o gestor', () => {
    montar('/clinica');
    expect(screen.getByText('Tela da clínica')).toBeInTheDocument();
  });

  it('manda a recepção de volta para o dashboard', () => {
    useAuth.mockReturnValue({ usuario: { nome: 'Paula', papel: 'recepcao' }, carregando: false });
    montar('/clinica');
    expect(screen.queryByText('Tela da clínica')).toBeNull();
    expect(screen.getByText('Tela do dashboard')).toBeInTheDocument();
  });
});