import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BarChart3,
  Users,
  Building2,
  Bot,
  Settings,
} from 'lucide-react';
import './Sidebar.css';

const NAV_PRINCIPAL = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare, badge: 3, path: '/conversas' },
  { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, path: '/agendamentos' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
];

const NAV_CONFIG = [
  { id: 'clinica', label: 'Clínica', icon: Building2, path: '/clinica' },
  { id: 'agente-ia', label: 'Agente IA', icon: Bot, path: '/agente-ia' },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/configuracoes' },
];

export default function Sidebar({ ativo = 'clinica' }) {
  const navigate = useNavigate();

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
          <SbItem key={item.id} item={item} ativo={ativo} onNavigate={navigate} />
        ))}

        <div className="sb-section">Configuração</div>
        {NAV_CONFIG.map((item) => (
          <SbItem key={item.id} item={item} ativo={ativo} onNavigate={navigate} />
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">MR</div>
          <div>
            <div className="sb-user-name">Mariana Reis</div>
            <div className="sb-user-role">Recepcionista</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SbItem({ item, ativo, onNavigate }) {
  const Icon = item.icon;
  const isActive = item.id === ativo;
  return (
    <button
      className={`sb-item ${isActive ? 'active' : ''}`}
      onClick={() => onNavigate(item.path)}
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{item.label}</span>
      {item.badge && <span className="sb-badge">{item.badge}</span>}
    </button>
  );
}