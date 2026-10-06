import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { obterConversa, enviarMensagem } from '../../api/conversaApi';
import './ChatConversa.css';

export default function ChatConversa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversa, setConversa] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const fimRef = useRef(null);

  function carregar() {
    obterConversa(id)
      .then(setConversa)
      .catch(() => setConversa(null))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, [id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversa?.mensagens?.length]);

  async function handleEnviar(e) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;

    setEnviando(true);
    const textoEnviado = texto.trim();
    setTexto('');

    try {
      const atualizada = await enviarMensagem(id, textoEnviado);
      setConversa(atualizada);
    } catch (err) {
      alert('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <div className="chat-loading">Carregando...</div>;
  if (!conversa) return <div className="chat-loading">Conversa não encontrada.</div>;

  const iniciais = conversa.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="chat-page">
      <header className="chat-head">
        <button className="icon-btn" onClick={() => navigate('/conversas')} aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <div className="chat-avatar">{iniciais}</div>
        <div className="chat-info">
          <div className="chat-nome">{conversa.nome}</div>
          <div className="chat-sub">{conversa.telefone || 'sem telefone'}</div>
        </div>
      </header>

      <div className="chat-msgs">
        {conversa.mensagens.map((m, i) => (
          <div key={i} className={`msg msg-${m.remetente}`}>
            <div className="msg-bub">{m.texto}</div>
            <div className="msg-time">
              {new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleEnviar}>
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
        />
        <button type="submit" className="send-btn" disabled={enviando} aria-label="Enviar">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}