import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Phone, Mail, MapPin, IdCard, Building2,
  FileCheck, CalendarCheck, UserPlus, UserCheck, Stethoscope, MessagesSquare,
  CalendarX, XCircle
} from 'lucide-react';
import { obterPaciente } from '../../api/pacienteApi';
import './HistoricoPaciente.css';

const ICONE_EVENTO = {
  cadastro: <UserPlus size={14} />,
  consulta_agendada: <Calendar size={14} />,
  consulta_realizada: <Stethoscope size={14} />,
  consulta_a_remarcar: <CalendarX size={14} />,
  consulta_nao_compareceu: <XCircle size={14} />,
  consulta_cancelada: <XCircle size={14} />,
  conversa_ia: <MessagesSquare size={14} />,
  conversa_humano: <UserCheck size={14} />
};

const COR_EVENTO = {
  cadastro: 'blue',
  consulta_agendada: 'blue',
  consulta_realizada: 'green',
  consulta_a_remarcar: 'amber',
  consulta_nao_compareceu: 'gray',
  consulta_cancelada: 'red',
  conversa_ia: 'green',
  conversa_humano: 'amber'
};

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;

  const hoje = new Date();
  const nascimento = new Date(dataNascimento);

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());

  if (aindaNaoFezAniversario) idade--;

  return idade;
}

export default function HistoricoPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [aba, setAba] = useState('timeline');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    obterPaciente(id)
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) return <div className="historico-loading">Carregando...</div>;
  if (!dados) return <div className="historico-loading">Paciente não encontrado.</div>;

  const { paciente, timeline, stats } = dados;
  const iniciais = paciente.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const idade = calcularIdade(paciente.dataNascimento);

  return (
    <div className="historico-page">
      <header className="historico-topbar">
        <div className="breadcrumb">
          <span className="bread-link" onClick={() => navigate('/pacientes')}>Pacientes</span>
          <span className="bread-sep">/</span>
          <span className="bread-cur">{paciente.nome}</span>
        </div>
      </header>

      <div className="historico-body">

        {/* PERFIL */}
        <aside className="perfil-col">
          <div className="perfil-hero">
            <div className="p-avatar">{iniciais}</div>
            <div>
              <div className="p-nome">{paciente.nome}</div>
              <div className="p-sub">
                Paciente desde {new Date(paciente.dataCadastro).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            {paciente.planoSaude?.operadora && (
              <span className="pbadge pb-blue">{paciente.planoSaude.operadora}</span>
            )}
          </div>

          <div className="perfil-section">
            <div className="ps-title">Dados pessoais</div>
            {paciente.dataNascimento && (
              <div className="ps-row"><Calendar size={14} /><span>Nascimento</span>
                <strong>{new Date(paciente.dataNascimento).toLocaleDateString('pt-BR')}{idade !== null ? ` (${idade} anos)` : ''}</strong>
              </div>
            )}
            {paciente.telefone && (
              <div className="ps-row"><Phone size={14} /><span>Telefone</span><strong>{paciente.telefone}</strong></div>
            )}
            {paciente.email && (
              <div className="ps-row"><Mail size={14} /><span>E-mail</span><strong>{paciente.email}</strong></div>
            )}
            {paciente.cidade && (
              <div className="ps-row"><MapPin size={14} /><span>Cidade</span><strong>{paciente.cidade}</strong></div>
            )}
            {paciente.cpf && (
              <div className="ps-row"><IdCard size={14} /><span>CPF</span><strong>{paciente.cpf}</strong></div>
            )}
          </div>

          {paciente.planoSaude?.operadora && (
            <div className="perfil-section">
              <div className="ps-title">Plano de saúde</div>
              <div className="ps-row"><Building2 size={14} /><span>Operadora</span><strong>{paciente.planoSaude.operadora}</strong></div>
              {paciente.planoSaude.carteirinha && (
                <div className="ps-row"><FileCheck size={14} /><span>Carteirinha</span><strong>{paciente.planoSaude.carteirinha}</strong></div>
              )}
              {paciente.planoSaude.validade && (
                <div className="ps-row"><CalendarCheck size={14} /><span>Validade</span><strong>{paciente.planoSaude.validade}</strong></div>
              )}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-box"><div className="stat-n">{stats.consultas}</div><div className="stat-l">Consultas</div></div>
            <div className="stat-box"><div className="stat-n">{stats.conversas}</div><div className="stat-l">Conversas</div></div>
            <div className="stat-box"><div className="stat-n">{stats.especialidades}</div><div className="stat-l">Especialidades</div></div>
            <div className="stat-box"><div className="stat-n">{stats.emAberto}</div><div className="stat-l">Em aberto</div></div>
          </div>

          {paciente.observacoesInternas && (
            <div className="perfil-section">
              <div className="ps-title">Observações internas</div>
              <div className="obs-box">{paciente.observacoesInternas}</div>
            </div>
          )}
        </aside>

        {/* CONTEÚDO */}
        <main className="historico-main">
          <div className="tabs">
            <div className={`tab ${aba === 'timeline' ? 'on' : ''}`} onClick={() => setAba('timeline')}>Linha do tempo</div>
            <div className={`tab ${aba === 'conversas' ? 'on' : ''}`} onClick={() => setAba('conversas')}>Conversas</div>
            <div className={`tab ${aba === 'agendamentos' ? 'on' : ''}`} onClick={() => setAba('agendamentos')}>Agendamentos</div>
          </div>

          {aba === 'timeline' && (
            <div className="sec-card">
              <div className="sec-head">
                <span className="sec-title">Linha do tempo — interações</span>
                <span className="sec-count">{timeline.length} eventos</span>
              </div>
              <div className="timeline">
                {timeline.map((ev, i) => (
                  <div className="tl-item" key={i}>
                    <div className="tl-left">
                      <div className={`tl-dot tl-${COR_EVENTO[ev.tipo]}`}>{ICONE_EVENTO[ev.tipo]}</div>
                      {i < timeline.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <div className="tl-header">
                        <span className="tl-titulo">{ev.titulo}</span>
                        <span className="tl-data">{new Date(ev.data).toLocaleString('pt-BR')}</span>
                      </div>
                      {ev.detalhe && <div className="tl-detalhe">{ev.detalhe}</div>}
                      {ev.tags?.length > 0 && (
                        <div className="tl-tags">
                          {ev.tags.map((t, j) => <span className="tl-tag" key={j}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aba === 'conversas' && (
            <div className="sec-card">
              <div className="sec-head">
                <span className="sec-title">Histórico de conversas</span>
                <span className="sec-count">{paciente.conversasResumo.length} conversas</span>
              </div>
              <table className="conv-table">
                <thead>
                  <tr><th>Data</th><th>Assunto</th><th>Atendimento</th><th>Msgs</th><th>Duração</th></tr>
                </thead>
                <tbody>
                  {paciente.conversasResumo.map((c, i) => (
                    <tr key={i}>
                      <td>{new Date(c.data).toLocaleString('pt-BR')}</td>
                      <td>{c.assunto}</td>
                      <td><span className={`ct-status ct-${c.atendimento === 'humano' ? 'human' : 'bot'}`}>{c.atendimento === 'humano' ? 'Humano' : 'IA'}</span></td>
                      <td>{c.mensagens}</td>
                      <td>{c.duracaoMinutos != null ? `${c.duracaoMinutos} min` : 'Em andamento'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aba === 'agendamentos' && (
            <div className="sec-card">
              <div className="sec-head">
                <span className="sec-title">Agendamentos</span>
                <span className="sec-count">{paciente.consultas.length} registros</span>
              </div>
              <table className="conv-table">
                <thead>
                  <tr><th>Data</th><th>Especialidade</th><th>Médico</th><th>Status</th><th>Convênio</th></tr>
                </thead>
                <tbody>
                  {paciente.consultas.map((c, i) => (
                    <tr key={i}>
                      <td>{new Date(c.data).toLocaleString('pt-BR')}</td>
                      <td>{c.especialidade}</td>
                      <td>{c.medico || '—'}</td>
                      <td><span className={`status-pill status-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                      <td>{c.convenio || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}