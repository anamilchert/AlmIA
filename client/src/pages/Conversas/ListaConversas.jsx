import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Bot, UserCheck, CheckCircle2 } from 'lucide-react';
import { listarConversas, criarConversa } from '../../api/conversaApi';
import './ListaConversas.css';

const STATUS_INFO = {
  ia: { label: 'IA', icon: Bot, classe: 'status-ia' },
  humano: { label: 'Humano', icon: UserCheck, classe: 'status-humano' },
  concluida: { label: 'Concluída', icon: CheckCircle2, classe: 'status-concluida' }
};

export default function ListaConversas() {
  const [conversas, setConversas] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [erro, setErro] = useState(null);
  const navigate = useNavigate();

  function carregar() {
    setCarregando(true);
    listarConversas()
      .then(setConversas)
      .catch(() => setConversas([]))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriarConversa(e) {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }
    setErro(null);
    try {
      const nova = await criarConversa({ nome: novoNome.trim(), telefone: novoTelefone.trim() });
      setCriando(false);
      setNovoNome('');
      setNovoTelefone('');
      navigate(`/conversas/${nova._id}`);
    } catch (err) {
      setErro(err.message);
    }
  }

  const filtradas = conversas.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="conversas-page">
      <header className="conversas-topbar">
        <span className="topbar-title">Conversas</span>
        <button className="btn btn-primary" onClick={() => setCriando(true)}>
          <Plus size={15} strokeWidth={2} />
          Nova conversa
        </button>
      </header>

      {criando && (
        <form className="nova-conversa-form" onSubmit={handleCriarConversa}>
          <input
            type="text"
            placeholder="Nome completo"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="Telefone (opcional)"
            value={novoTelefone}
            onChange={(e) => setNovoTelefone(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Iniciar</button>
          <button type="button" className="btn" onClick={() => setCriando(false)}>Cancelar</button>
        </form>
      )}
      {erro && <div className="conversas-erro">{erro}</div>}

      <div className="conversas-search">
        <Search size={15} strokeWidth={1.8} />
        <input
          placeholder="Buscar conversa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="conversas-list">
        {carregando && <p className="conversas-empty">Carregando...</p>}
        {!carregando && filtradas.length === 0 && (
          <p className="conversas-empty">Nenhuma conversa encontrada.</p>
        )}
        {filtradas.map((c) => {
          const info = STATUS_INFO[c.status] || STATUS_INFO.ia;
          const Icon = info.icon;
          return (
            <div key={c._id} className="conversa-row" onClick={() => navigate(`/conversas/${c._id}`)}>
              <div className="conversa-avatar">
                {c.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div className="conversa-info">
                <div className="conversa-nome">{c.nome}</div>
                <div className="conversa-preview">{c.ultimaMensagem || 'Sem mensagens ainda'}</div>
              </div>
              <span className={`conversa-status ${info.classe}`}>
                <Icon size={12} strokeWidth={2} />
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}