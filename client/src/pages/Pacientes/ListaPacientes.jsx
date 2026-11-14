import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { listarPacientes, removerPaciente } from '../../api/pacienteApi';
import './ListaPacientes.css';

export default function ListaPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState(null);
  const [erro, setErro] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listarPacientes()
      .then(setPacientes)
      .catch(() => setPacientes([]))
      .finally(() => setCarregando(false));
  }, []);

  async function excluir(id) {
    try {
      await removerPaciente(id);
      setPacientes((lista) => lista.filter((p) => p._id !== id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setExcluindoId(null);
    }
  }

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pacientes-page">
      <header className="pacientes-topbar">
        <span className="topbar-title">Pacientes</span>
      </header>

      {erro && <div className="paciente-erro">{erro}</div>}

      <div className="pacientes-search">
        <Search size={15} strokeWidth={1.8} />
        <input
          placeholder="Buscar paciente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="pacientes-list">
        {carregando && <p className="pacientes-empty">Carregando...</p>}
        {!carregando && filtrados.length === 0 && (
          <p className="pacientes-empty">Nenhum paciente encontrado.</p>
        )}
        {filtrados.map((p) => (
          <div
            key={p._id}
            className="paciente-row"
            onClick={() => navigate(`/pacientes/${p._id}`)}
          >
            <div className="paciente-avatar">
              {p.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
            </div>
            <div className="paciente-info">
              <div className="paciente-nome">{p.nome}</div>
              <div className="paciente-sub">{p.telefone || 'sem telefone'}</div>
            </div>
            {p.planoSaude?.operadora && (
              <span className="paciente-plano">{p.planoSaude.operadora}</span>
            )}

            <div className="paciente-acoes" onClick={(e) => e.stopPropagation()}>
              {excluindoId === p._id ? (
                <div className="paciente-confirma">
                  <span>Excluir?</span>
                  <button className="paciente-sim" onClick={() => excluir(p._id)}>Sim</button>
                  <button className="paciente-nao" onClick={() => setExcluindoId(null)}>Não</button>
                </div>
              ) : (
                <button className="paciente-lixo" aria-label="Excluir paciente"
                  onClick={() => setExcluindoId(p._id)}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}