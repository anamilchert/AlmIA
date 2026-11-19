import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatConversa from '../../src/pages/Conversas/ChatConversa';
import { obterConversa, enviarMensagem } from '../../src/api/conversaApi';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
const alertMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 'c1' }),
}));
vi.mock('../../src/api/conversaApi', () => ({
  obterConversa: vi.fn(),
  enviarMensagem: vi.fn(),
}));

const conversa = {
  _id: 'c1',
  nome: 'Maria Silva',
  telefone: '5511987654321',
  mensagens: [
    { remetente: 'paciente', texto: 'Oi', data: '2026-11-19T15:00:00Z' },
    { remetente: 'bot', texto: 'Olá! Como posso ajudar?', data: '2026-11-19T15:00:05Z' },
  ],
};

beforeEach(() => {
  navigateMock.mockReset();
  obterConversa.mockReset();
  enviarMensagem.mockReset();
  alertMock.mockReset();
  vi.stubGlobal('alert', alertMock);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  obterConversa.mockResolvedValue(conversa);
});

describe('ChatConversa', () => {
  it('mostra "Carregando..." e depois o cabeçalho e as mensagens', async () => {
    render(<ChatConversa />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(obterConversa).toHaveBeenCalledWith('c1');
    expect(screen.getByText('MS')).toBeInTheDocument();
    expect(screen.getByText('5511987654321')).toBeInTheDocument();

    expect(screen.getByText('Oi').closest('.msg')).toHaveClass('msg-paciente');
    expect(screen.getByText('Olá! Como posso ajudar?').closest('.msg')).toHaveClass('msg-bot');
  });

  it('mostra "sem telefone" quando a conversa não tem número', async () => {
    obterConversa.mockResolvedValue({ ...conversa, telefone: '' });
    render(<ChatConversa />);
    expect(await screen.findByText('sem telefone')).toBeInTheDocument();
  });

  it('avisa quando a conversa não é encontrada', async () => {
    obterConversa.mockRejectedValue(new Error('404'));
    render(<ChatConversa />);
    expect(await screen.findByText('Conversa não encontrada.')).toBeInTheDocument();
  });

  it('volta para a lista de conversas', async () => {
    render(<ChatConversa />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(navigateMock).toHaveBeenCalledWith('/conversas');
  });

  it('envia a mensagem, limpa o campo e mostra a conversa atualizada', async () => {
    enviarMensagem.mockResolvedValue({
      ...conversa,
      mensagens: [
        ...conversa.mensagens,
        { remetente: 'humano', texto: 'Resposta nova', data: '2026-11-19T15:01:00Z' },
      ],
    });
    render(<ChatConversa />);
    await screen.findByText('Maria Silva');

    const campo = screen.getByPlaceholderText('Digite sua mensagem...');
    await userEvent.type(campo, '  Bom dia  ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(enviarMensagem).toHaveBeenCalledWith('c1', 'Bom dia');
    expect(await screen.findByText('Resposta nova')).toBeInTheDocument();
    expect(campo).toHaveValue('');
  });

  it('não envia mensagem vazia ou só com espaços', async () => {
    render(<ChatConversa />);
    await screen.findByText('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await userEvent.type(screen.getByPlaceholderText('Digite sua mensagem...'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(enviarMensagem).not.toHaveBeenCalled();
  });

  it('avisa o usuário quando o envio falha', async () => {
    enviarMensagem.mockRejectedValue(new Error('rede caiu'));
    render(<ChatConversa />);
    await screen.findByText('Maria Silva');

    await userEvent.type(screen.getByPlaceholderText('Digite sua mensagem...'), 'Oi');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await vi.waitFor(() =>
      expect(alertMock).toHaveBeenCalledWith('Erro ao enviar mensagem: rede caiu')
    );
  });
});