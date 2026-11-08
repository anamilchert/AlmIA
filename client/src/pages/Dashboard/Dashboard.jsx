import { Download, Calendar, MessagesSquare, Bot, Clock, UserCheck } from 'lucide-react';
import './Dashboard.css';

// TODO: trocar por dados da API (ex.: dashboardApi.js)
const porHora = [
  { hora: '07h', ia: 2, humano: 0 },
  { hora: '08h', ia: 5, humano: 1 },
  { hora: '09h', ia: 8, humano: 2 },
  { hora: '10h', ia: 7, humano: 3 },
  { hora: '11h', ia: 6, humano: 1 },
  { hora: '12h', ia: 3, humano: 1 },
  { hora: '13h', ia: 7, humano: 2 },
  { hora: '14h', ia: 4, humano: 3 },
];

const tiposSolicitacao = [
  { nome: 'Convênios', pct: 40, cor: '#3D95E0' },
  { nome: 'Agendamento', pct: 25, cor: '#29A96E' },
  { nome: 'Preparo exames', pct: 20, cor: '#6AAFE8' },
  { nome: 'Outros', pct: 15, cor: '#C4EBDA' },
];

const perguntas = [
  { texto: 'Quais convênios vocês aceitam?', qtd: 18 },
  { texto: 'Qual o horário de funcionamento?', qtd: 13 },
  { texto: 'Como faço para agendar?', qtd: 10 },
  { texto: 'Qual o preparo para colonoscopia?', qtd: 7 },
  { texto: 'Vocês atendem particular?', qtd: 5 },
];

const handoffs = [
  { iniciais: 'JF', nome: 'João Ferreira', motivo: 'Remarcação com erro no site', hora: '14:31', status: 'aberto' },
  { iniciais: 'RS', nome: 'Renata Souza', motivo: 'Dúvida sobre preparo específico', hora: '14:18', status: 'aberto' },
  { iniciais: 'PM', nome: 'Paulo Mendes', motivo: 'Solicitou falar com atendente', hora: '13:55', status: 'aberto' },
  { iniciais: 'AB', nome: 'Ana Beatriz', motivo: 'Reclamação sobre tempo de espera', hora: '12:10', status: 'resolvido' },
  { iniciais: 'MO', nome: 'Marcos Oliveira', motivo: 'Confirmação manual de agendamento', hora: '11:42', status: 'resolvido' },
];

const metricas = [
  { label: 'Conversas hoje', valor: '48', icone: MessagesSquare, cor: 'blue', footer: '↑ 12%', footerClasse: 'trend-up', footerTexto: 'vs ontem' },
  { label: 'Resolvidas pela IA', valor: '71%', icone: Bot, cor: 'green', footer: '↑ 4pp', footerClasse: 'trend-up', footerTexto: 'vs semana passada' },
  { label: 'Tempo médio resposta', valor: '1.8s', icone: Clock, cor: 'blue', footer: '↓ 0.4s', footerClasse: 'trend-up', footerTexto: 'meta: <3s' },
  { label: 'Handoffs para humano', valor: '14', icone: UserCheck, cor: 'amber', footer: '↑ 3', footerClasse: 'trend-down', footerTexto: 'vs ontem' },
];

const RAIO = 40;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function Dashboard() {
  const maxHora = Math.max(...porHora.map((h) => h.ia + h.humano));
  const maxPergunta = Math.max(...perguntas.map((p) => p.qtd));

  let acumulado = 0;
  const segmentos = tiposSolicitacao.map((t) => {
    const tamanho = (t.pct / 100) * CIRCUNFERENCIA;
    const seg = (
      <circle
        key={t.nome}
        cx="55" cy="55" r={RAIO}
        fill="none" stroke={t.cor} strokeWidth="18"
        strokeDasharray={`${tamanho} ${CIRCUNFERENCIA}`}
        strokeDashoffset={-acumulado}
        transform="rotate(-90 55 55)"
      />
    );
    acumulado += tamanho;
    return seg;
  });

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <span className="topbar-date">
          <Calendar size={15} /> 25 de maio de 2026
        </span>
        <button className="btn"><Calendar size={14} /> Esta semana</button>
        <button className="btn btn-primary"><Download size={14} /> Exportar</button>
      </div>

      <div className="metrics-grid">
        {metricas.map((m) => {
          const Icone = m.icone;
          return (
            <div className="metric-card" key={m.label}>
              <div className="metric-top">
                <span className="metric-label">{m.label}</span>
                <div className={`metric-icon icon-${m.cor}`}><Icone size={16} /></div>
              </div>
              <div className="metric-value">{m.valor}</div>
              <div className="metric-footer">
                <span className={m.footerClasse}>{m.footer}</span>
                <span className="trend-neutral">{m.footerTexto}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="section-header">
            <div>
              <div className="section-title">Conversas por hora</div>
              <div className="section-sub">Hoje — IA vs atendimento humano</div>
            </div>
          </div>
          <div className="bar-chart">
            {porHora.map((h) => (
              <div className="bar-col" key={h.hora}>
                <div className="bar-stack">
                  {h.humano > 0 && (
                    <div className="bar-seg" style={{ height: `${(h.humano / maxHora) * 100}%`, background: '#29A96E' }} title={`${h.humano} humano`} />
                  )}
                  <div className="bar-seg" style={{ height: `${(h.ia / maxHora) * 100}%`, background: '#3D95E0' }} title={`${h.ia} IA`} />
                </div>
                <span className="bar-label">{h.hora}</span>
              </div>
            ))}
          </div>
          <div className="bar-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#3D95E0' }} />IA</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#29A96E' }} />Humano</div>
          </div>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div>
              <div className="section-title">Tipos de solicitação</div>
              <div className="section-sub">Distribuição desta semana</div>
            </div>
          </div>
          <div className="donut-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={RAIO} fill="none" stroke="#EDF0F5" strokeWidth="18" />
              {segmentos}
              <text x="55" y="51" textAnchor="middle" fontSize="18" fontWeight="600" fill="#1E2530" fontFamily="DM Mono, monospace">48</text>
              <text x="55" y="64" textAnchor="middle" fontSize="10" fill="#8A94A6" fontFamily="DM Sans, sans-serif">total</text>
            </svg>
            <div className="donut-labels">
              {tiposSolicitacao.map((t) => (
                <div className="donut-row" key={t.nome}>
                  <div className="donut-name">{t.nome}</div>
                  <div className="donut-bar-bg">
                    <div className="donut-bar-fill" style={{ width: `${t.pct}%`, background: t.cor }} />
                  </div>
                  <div className="donut-pct">{t.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <div className="chart-card">
          <div className="section-header">
            <div className="section-title">Perguntas mais frequentes</div>
            <div className="section-sub">Hoje</div>
          </div>
          <div className="question-list">
            {perguntas.map((p, i) => (
              <div className="q-item" key={p.texto}>
                <span className="q-rank">{i + 1}</span>
                <span className="q-text">{p.texto}</span>
                <div className="q-bar-bg">
                  <div className="q-bar-fill" style={{ width: `${(p.qtd / maxPergunta) * 100}%` }} />
                </div>
                <span className="q-count">{p.qtd}x</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div className="section-title">Handoffs recentes</div>
            <div className="section-sub">IA → atendente humano</div>
          </div>
          <div className="handoff-list">
            {handoffs.map((h) => (
              <div className="hf-item" key={h.nome + h.hora}>
                <div className="hf-avatar">{h.iniciais}</div>
                <div style={{ flex: 1 }}>
                  <div className="hf-name">{h.nome}</div>
                  <div className="hf-reason">{h.motivo}</div>
                </div>
                <span className="hf-time">{h.hora}</span>
                <span className={`status-pill ${h.status === 'aberto' ? 'pill-open' : 'pill-done'}`}>
                  {h.status === 'aberto' ? 'Aberto' : 'Resolvido'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}