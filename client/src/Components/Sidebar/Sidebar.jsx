import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  Building2,
  LogOut,
} from 'lucide-react';
import { useHandoffs } from '../../context/HandoffsContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const NAV_PRINCIPAL = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare, path: '/conversas' },
  { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, path: '/agendamentos' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes' },
];

const NAV_CONFIG = [
  { id: 'clinica', label: 'Clínica', icon: Building2, path: '/clinica' },
];

const ROTULO_PAPEL = { gestor: 'Gestor', recepcao: 'Recepcionista' };

function iniciais(nome = '') {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

export default function Sidebar({ ativo = 'clinica' }) {
  const navigate = useNavigate();
  const { total } = useHandoffs();
  const { usuario, sair } = useAuth();
  const ehGestor = usuario?.papel === 'gestor';

  function aoSair() {
    sair();
    navigate('/login');
  }

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-logo-mark">A</div>
        <div>
          <div className="sb-logo-name">Almia</div>
          <div className="sb-logo-tag">CRM Inteligente</div>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-section">Principal</div>
        {NAV_PRINCIPAL.map((item) => (
          <SbItem
            key={item.id}
            item={item}
            ativo={ativo}
            onNavigate={navigate}
            badge={item.id === 'conversas' && total > 0 ? total : null}
          />
        ))}

        {ehGestor && (
          <>
            <div className="sb-section">Configuração</div>
            {NAV_CONFIG.map((item) => (
              <SbItem key={item.id} item={item} ativo={ativo} onNavigate={navigate} />
            ))}
          </>
        )}
      </nav>

      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">{iniciais(usuario?.nome)}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{usuario?.nome}</div>
            <div className="sb-user-role">{ROTULO_PAPEL[usuario?.papel] || ''}</div>
          </div>
          <button className="sb-logout" onClick={aoSair} aria-label="Sair" title="Sair">
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SbItem({ item, ativo, onNavigate, badge = null }) {
  const Icon = item.icon;
  const isActive = item.id === ativo;
  return (
    <button
      className={`sb-item ${isActive ? 'active' : ''}`}
      onClick={() => onNavigate(item.path)}
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{item.label}</span>
      {badge && <span className="sb-badge">{badge}</span>}
    </button>
  );
}