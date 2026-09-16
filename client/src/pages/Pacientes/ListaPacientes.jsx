import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listarPacientes } from '../../api/pacienteApi';
import './ListaPacientes.css';

export default function ListaPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listarPacientes()
      .then(setPacientes)
      .catch(() => setPacientes([]))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pacientes-page">
      <header className="pacientes-topbar">
        <span className="topbar-title">Pacientes</span>
      </header>

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
          </div>
        ))}
      </div>
    </div>
  );
}