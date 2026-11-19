import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../../src/Components/Layout/Layout';

vi.mock('../../src/Components/Sidebar/Sidebar', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ ativo }) => createElement('div', { 'data-testid': 'sidebar' }, ativo),
  };
});

describe('Layout', () => {
  it('mostra o conteúdo dentro da área principal', () => {
    render(
      <Layout ativo="pacientes">
        <p>Conteúdo da página</p>
      </Layout>
    );

    const principal = screen.getByRole('main');
    expect(principal).toHaveTextContent('Conteúdo da página');
  });

  it('repassa o item ativo para o menu lateral', () => {
    render(<Layout ativo="dashboard" />);
    expect(screen.getByTestId('sidebar')).toHaveTextContent('dashboard');
  });
});