import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandoffsProvider, useHandoffs } from '../../src/context/HandoffsContext';
import { listarHandoffs } from '../../src/api/conversaApi';

vi.mock('../../src/api/conversaApi', () => ({ listarHandoffs: vi.fn() }));

const startMock = vi.fn();

// Áudio falso: o jsdom não tem AudioContext.
class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  resume() { return Promise.resolve(); }
  createOscillator() {
    return { type: '', frequency: { value: 0 }, connect: (g) => g, start: startMock, stop: vi.fn() };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

function Consumidor() {
  const { total, itens, somAtivo, alternarSom } = useHandoffs();
  return (
    <div>
      <span data-testid="total">{total}</span>
      <span data-testid="itens">{itens.length}</span>
      <span data-testid="som">{String(somAtivo)}</span>
      <button onClick={alternarSom}>alternar som</button>
    </div>
  );
}

const renderizar = () =>
  render(
    <HandoffsProvider>
      <Consumidor />
    </HandoffsProvider>
  );

// Deixa as promessas pendentes terminarem (usado nos testes com relógio falso).
const aguardar = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  listarHandoffs.mockReset();
  listarHandoffs.mockResolvedValue({ total: 0, itens: [] });
  startMock.mockReset();
  localStorage.clear();
  document.title = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HandoffsContext', () => {
  it('fora do provider devolve os valores padrão', () => {
    render(<Consumidor />);
    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('itens')).toHaveTextContent('0');
    expect(screen.getByTestId('som')).toHaveTextContent('false');
  });

  it('carrega os handoffs ao montar e mostra o total no título da aba', async () => {
    listarHandoffs.mockResolvedValue({ total: 2, itens: [{ _id: 'a' }, { _id: 'b' }] });
    renderizar();

    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('2'));
    expect(screen.getByTestId('itens')).toHaveTextContent('2');
    expect(document.title).toBe('(2) Almia');
  });

  it('usa o título simples quando não há handoffs', async () => {
    renderizar();
    await waitFor(() => expect(document.title).toBe('Almia'));
  });

  it('busca de novo a cada 5 segundos e mantém o último estado se a busca falhar', async () => {
    vi.useFakeTimers();
    listarHandoffs
      .mockResolvedValueOnce({ total: 2, itens: [{ _id: 'a' }, { _id: 'b' }] })
      .mockRejectedValue(new Error('fora do ar'));
    renderizar();

    await aguardar(0);
    expect(screen.getByTestId('total')).toHaveTextContent('2');

    await aguardar(5000);
    expect(listarHandoffs).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('total')).toHaveTextContent('2');
  });

  it('começa com o som ligado quando isso foi salvo no navegador', () => {
    localStorage.setItem('almia:som', '1');
    renderizar();
    expect(screen.getByTestId('som')).toHaveTextContent('true');
  });

  it('alterna o som e guarda a escolha no navegador', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'alternar som' }));
    expect(screen.getByTestId('som')).toHaveTextContent('true');
    expect(localStorage.getItem('almia:som')).toBe('1');
    expect(startMock).toHaveBeenCalled(); // toca um aviso ao ligar

    await userEvent.click(screen.getByRole('button', { name: 'alternar som' }));
    expect(screen.getByTestId('som')).toHaveTextContent('false');
    expect(localStorage.getItem('almia:som')).toBe('0');
  });

  it('liga o som mesmo quando o navegador não tem suporte a áudio', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'alternar som' }));
    expect(screen.getByTestId('som')).toHaveTextContent('true');
  });

  it('toca o aviso quando chega um handoff novo com o som ligado', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    localStorage.setItem('almia:som', '1');
    listarHandoffs
      .mockResolvedValueOnce({ total: 1, itens: [{ _id: 'a' }] })
      .mockResolvedValueOnce({ total: 2, itens: [{ _id: 'a' }, { _id: 'b' }] });
    renderizar();

    await aguardar(0); // primeira busca: só registra os existentes
    expect(startMock).not.toHaveBeenCalled();

    // o navegador só libera o áudio depois de um clique na página
    await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
    await aguardar(0);

    await aguardar(5000); // segunda busca traz o handoff "b"
    expect(startMock).toHaveBeenCalled();
  });

  it('não toca o aviso quando o som está desligado', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    listarHandoffs
      .mockResolvedValueOnce({ total: 1, itens: [{ _id: 'a' }] })
      .mockResolvedValueOnce({ total: 2, itens: [{ _id: 'a' }, { _id: 'b' }] });
    renderizar();

    await aguardar(0);
    await aguardar(5000);

    expect(startMock).not.toHaveBeenCalled();
  });
});