import { useEffect, useState } from 'react';
import { Download, Calendar, MessagesSquare, Bot, Clock, UserCheck } from 'lucide-react';
import { obterMetricasDashboard } from '../../api/dashboardApi';
import HandoffsAguardando from './HandoffsAguardando';
import { nomeDoMotivo } from './motivosHandoff';
import './Dashboard.css';

const TZ = 'America/Sao_Paulo';
const ATUALIZAR_MS = 30000;
const RAIO = 40;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

const ASSUNTOS = {
  agendamento: { nome: 'Agendamento', cor: '#29A96E' },
  convenios: { nome: 'Convênios', cor: '#3D95E0' },
  preparo_exames: { nome: 'Preparo de exames', cor: '#6AAFE8' },
  horarios_endereco: { nome: 'Horários e endereço', cor: '#F5A524' },
  valores: { nome: 'Valores', cor: '#8A94A6' },
  outro: { nome: 'Outros', cor: '#C4EBDA' }
};

const STATUS_AGENDAMENTO = {
  confirmado: ['Confirmado', 'pill-done'],
  concluido: ['Concluído', 'pill-done'],
  pendente: ['Pendente', 'pill-open'],
  cancelado: ['Cancelado', 'pill-open'],
  nao_compareceu: ['Não compareceu', 'pill-open']
};

const SEM_DADOS = {
  conversasHoje: 0,
  conversasOntem: 0,
  resolvidasPelaIA: 0,
  resolvidasPelaIAOntem: 0,
  handoffsHoje: 0,
  handoffsOntem: 0,
  tempoMedioRespostaSeg: null,
  agendamentosIAHoje: 0,
  porHora: [],
  assuntosSemana: [],
  agendamentosIA: [],
  handoffsRecentes: []
};

function variacaoPercentual(atual, anterior) {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function iniciais(nome) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatarQuando(valor) {
  const data = new Date(valor);
  const dia = (d) => d.toLocaleDateString('pt-BR', { timeZone: TZ });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  if (dia(data) === dia(new Date())) return hora;
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })} ${hora}`;
}

function montarMetricas(d) {
  const varConversas = variacaoPercentual(d.conversasHoje, d.conversasOntem);
  const difResolvidas = d.resolvidasPelaIA - d.resolvidasPelaIAOntem;
  const difHandoffs = d.handoffsHoje - d.handoffsOntem;
  const tempo = d.tempoMedioRespostaSeg;

  return [
    {
      label: 'Conversas hoje',
      valor: String(d.conversasHoje),
      icone: MessagesSquare,
      cor: 'blue',
      footer: varConversas === null ? '—' : `${varConversas >= 0 ? '↑' : '↓'} ${Math.abs(varConversas)}%`,
      footerClasse: varConversas !== null && varConversas < 0 ? 'trend-down' : 'trend-up',
      footerTexto: 'vs ontem'
    },
    {
      label: 'Resolvidas pela IA',
      valor: `${d.resolvidasPelaIA}%`,
      icone: Bot,
      cor: 'green',
      footer: `${difResolvidas >= 0 ? '↑' : '↓'} ${Math.abs(difResolvidas)}pp`,
      footerClasse: difResolvidas < 0 ? 'trend-down' : 'trend-up',
      footerTexto: 'vs ontem'
    },
    {
      label: 'Tempo médio resposta',
      valor: tempo === null ? '—' : `${tempo.toFixed(1)}s`,
      icone: Clock,
      cor: 'blue',
      footer: tempo === null ? '—' : tempo < 3 ? 'dentro da meta' : 'acima da meta',
      footerClasse: tempo !== null && tempo >= 3 ? 'trend-down' : 'trend-up',
      footerTexto: 'meta: <3s'
    },
    {
      label: 'Handoffs para humano',
      valor: String(d.handoffsHoje),
      icone: UserCheck,
      cor: 'amber',
      footer: `${difHandoffs > 0 ? '↑' : difHandoffs < 0 ? '↓' : '='} ${Math.abs(difHandoffs)}`,
      footerClasse: difHandoffs > 0 ? 'trend-down' : 'trend-up',
      footerTexto: 'vs ontem'
    }
  ];
}

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const resposta = await obterMetricasDashboard();
        if (ativo) {
          setDados(resposta);
          setErro(false);
        }
      } catch (e) {
        if (ativo) setErro(true);
      }
    }

    carregar();
    const timer = setInterval(carregar, ATUALIZAR_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, []);

  const d = dados || SEM_DADOS;
  const metricas = montarMetricas(d);

  const porHora = d.porHora.filter((h) => (h.hora >= 7 && h.hora <= 19) || h.ia + h.humano > 0);
  const maxHora = Math.max(1, ...porHora.map((h) => h.ia + h.humano));

  const totalAssuntos = d.assuntosSemana.reduce((soma, a) => soma + a.total, 0);
  const tipos = d.assuntosSemana.map((a) => ({
    nome: (ASSUNTOS[a.assunto] || ASSUNTOS.outro).nome,
    cor: (ASSUNTOS[a.assunto] || ASSUNTOS.outro).cor,
    pct: Math.round((a.total / totalAssuntos) * 100),
    total: a.total
  }));

  let acumulado = 0;
  const segmentos = tipos.map((t) => {
    const tamanho = (t.total / totalAssuntos) * CIRCUNFERENCIA;
    const seg = (
      <circle
        key={t.nome}
        cx="55"
        cy="55"
        r={RAIO}
        fill="none"
        stroke={t.cor}
        strokeWidth="18"
        strokeDasharray={`${tamanho} ${CIRCUNFERENCIA}`}
        strokeDashoffset={-acumulado}
        transform="rotate(-90 55 55)"
      />
    );
    acumulado += tamanho;
    return seg;
  });

  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ
  });

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <span className="topbar-date">
          <Calendar size={15} /> {dataHoje}
        </span>
        <button className="btn"><Calendar size={14} /> Esta semana</button>
        <button className="btn btn-primary"><Download size={14} /> Exportar</button>
      </div>

      {erro && <div className="dash-aviso">Não foi possível carregar os dados do dashboard.</div>}

      <HandoffsAguardando />

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
                  {h.ia > 0 && (
                    <div className="bar-seg" style={{ height: `${(h.ia / maxHora) * 100}%`, background: '#3D95E0' }} title={`${h.ia} IA`} />
                  )}
                </div>
                <span className="bar-label">{String(h.hora).padStart(2, '0')}h</span>
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
              <div className="section-sub">Últimos 7 dias</div>
            </div>
          </div>
          {totalAssuntos === 0 ? (
            <div className="vazio">Ainda não há conversas classificadas.</div>
          ) : (
            <div className="donut-wrap">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r={RAIO} fill="none" stroke="#EDF0F5" strokeWidth="18" />
                {segmentos}
                <text x="55" y="51" textAnchor="middle" fontSize="18" fontWeight="600" fill="#1E2530" fontFamily="DM Mono, monospace">{totalAssuntos}</text>
                <text x="55" y="64" textAnchor="middle" fontSize="10" fill="#8A94A6" fontFamily="DM Sans, sans-serif">total</text>
              </svg>
              <div className="donut-labels">
                {tipos.map((t) => (
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
          )}
        </div>
      </div>

      <div className="bottom-row">
        <div className="chart-card">
          <div className="section-header">
            <div className="section-title">Agendamentos feitos pela IA</div>
            <div className="section-sub">{d.agendamentosIAHoje} hoje</div>
          </div>
          <div className="handoff-list">
            {d.agendamentosIA.length === 0 && <div className="vazio">Nenhum agendamento feito pela IA ainda.</div>}
            {d.agendamentosIA.map((a) => {
              const [rotulo, classe] = STATUS_AGENDAMENTO[a.status] || STATUS_AGENDAMENTO.pendente;
              return (
                <div className="hf-item" key={a._id}>
                  <div className="hf-avatar">{iniciais(a.nome)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="hf-name">{a.nome}</div>
                    <div className="hf-reason">{a.medico || a.especialidade}</div>
                  </div>
                  <span className="hf-time">{formatarQuando(a.data)}</span>
                  <span className={`status-pill ${classe}`}>{rotulo}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div className="section-title">Handoffs recentes</div>
            <div className="section-sub">IA → atendente humano</div>
          </div>
          <div className="handoff-list">
            {d.handoffsRecentes.length === 0 && <div className="vazio">Nenhum handoff até agora.</div>}
            {d.handoffsRecentes.map((h) => (
              <div className="hf-item" key={h._id}>
                <div className="hf-avatar">{iniciais(h.nome)}</div>
                <div style={{ flex: 1 }}>
                  <div className="hf-name">{h.nome}</div>
                  <div className="hf-reason">{nomeDoMotivo(h.motivo)}</div>
                </div>
                <span className="hf-time">{formatarQuando(h.desde)}</span>
                <span className={`status-pill ${h.aberto ? 'pill-open' : 'pill-done'}`}>
                  {h.aberto ? 'Aberto' : 'Resolvido'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}