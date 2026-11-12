import { useEffect, useState } from 'react';
import { Plus, Bot, Check, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  listarAgendamentos, atualizarStatus, removerAgendamento
} from '../../api/agendamentoApi';
import ModalAgendamento from './ModalAgendamento';
import './Agendamentos.css';

const STATUS_LABEL = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  nao_compareceu: 'Não compareceu'
};

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'confirmado', label: 'Confirmados' }
];

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function chaveDia(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatarDia(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
}

function formatarHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function Calendario({ mes, setMes, agendamentos, diaSelecionado, setDiaSelecionado }) {
  const ano = mes.getFullYear();
  const numMes = mes.getMonth();
  const primeiroDiaSemana = new Date(ano, numMes, 1).getDay();
  const diasNoMes = new Date(ano, numMes + 1, 0).getDate();
  const hoje = chaveDia(new Date());

  const resumo = {};
  agendamentos.forEach((a) => {
    if (a.status === 'cancelado') return;
    const chave = chaveDia(a.data);
    resumo[chave] = resumo[chave] || { total: 0, pendentes: 0 };
    resumo[chave].total += 1;
    if (a.status === 'pendente') resumo[chave].pendentes += 1;
  });

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  const titulo = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  function irParaHoje() {
    const agora = new Date();
    setMes(new Date(agora.getFullYear(), agora.getMonth(), 1));
    setDiaSelecionado(chaveDia(agora));
  }

  return (
    <div className="cal">
      <div className="cal-topo">
        <button className="cal-nav" aria-label="Mês anterior"
          onClick={() => setMes(new Date(ano, numMes - 1, 1))}>
          <ChevronLeft size={16} />
        </button>
        <span className="cal-titulo">{titulo}</span>
        <button className="cal-nav" aria-label="Próximo mês"
          onClick={() => setMes(new Date(ano, numMes + 1, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="cal-grade">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="cal-semana">{d}</div>
        ))}
        {celulas.map((d, i) => {
          if (d === null) return <div key={`v${i}`} />;
          const chave = `${ano}-${pad(numMes + 1)}-${pad(d)}`;
          const info = resumo[chave];
          const classes = [
            'cal-dia',
            chave === hoje ? 'hoje' : '',
            chave === diaSelecionado ? 'selecionado' : ''
          ].join(' ');
          return (
            <button
              key={chave}
              className={classes}
              onClick={() => setDiaSelecionado(chave === diaSelecionado ? null : chave)}
            >
              <span>{d}</span>
              {info && (
                <span className={`cal-marca ${info.pendentes > 0 ? 'pendente' : ''}`}>
                  {info.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button className="agenda-btn cal-hoje" onClick={irParaHoje}>Hoje</button>
    </div>
  );
}

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mes, setMes] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);

  function carregar() {
    setCarregando(true);
    listarAgendamentos()
      .then(setAgendamentos)
      .catch(() => setAgendamentos([]))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarStatus(id, status) {
    try {
      const atualizado = await atualizarStatus(id, status);
      setAgendamentos((lista) => lista.map((a) => (a._id === id ? atualizado : a)));
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(id) {
    try {
      await removerAgendamento(id);
      setAgendamentos((lista) => lista.filter((a) => a._id !== id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setExcluindoId(null);
    }
  }

  const prefixoMes = `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}`;

  const visiveis = agendamentos.filter((a) => {
    if (filtro !== 'todos' && a.status !== filtro) return false;
    const chave = chaveDia(a.data);
    if (diaSelecionado) return chave === diaSelecionado;
    return chave.startsWith(prefixoMes);
  });

  const porDia = visiveis.reduce((acc, a) => {
    const dia = formatarDia(a.data);
    (acc[dia] = acc[dia] || []).push(a);
    return acc;
  }, {});

  const totalPendentes = agendamentos.filter((a) => a.status === 'pendente').length;

  return (
    <div className="agenda-page">
      <header className="agenda-topbar">
        <span className="agenda-title">Agendamentos</span>
        <button className="agenda-btn agenda-btn-primary" onClick={() => setCriando(true)}>
          <Plus size={15} strokeWidth={2} />
          Novo agendamento
        </button>
      </header>

      {criando && (
        <ModalAgendamento
          dataInicial={diaSelecionado}
          agendamentos={agendamentos}
          onFechar={() => setCriando(false)}
          onSalvo={() => { setCriando(false); carregar(); }}
        />
      )}
      {erro && <div className="agenda-erro">{erro}</div>}

      <div className="agenda-filtros">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`agenda-filtro ${filtro === f.id ? 'ativo' : ''}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
            {f.id === 'pendente' && totalPendentes > 0 && (
              <span className="agenda-contador">{totalPendentes}</span>
            )}
          </button>
        ))}
      </div>

      <div className="agenda-corpo">
        <Calendario
          mes={mes}
          setMes={setMes}
          agendamentos={agendamentos}
          diaSelecionado={diaSelecionado}
          setDiaSelecionado={setDiaSelecionado}
        />

        <div className="agenda-lista">
          {carregando && <p className="agenda-vazio">Carregando...</p>}
          {!carregando && visiveis.length === 0 && (
            <p className="agenda-vazio">Nenhum agendamento encontrado.</p>
          )}
          {Object.entries(porDia).map(([dia, itens]) => (
            <section key={dia} className="agenda-dia">
              <h3 className="agenda-dia-titulo">{dia}</h3>
              {itens.map((a) => (
                <div key={a._id} className="agenda-item">
                  <div className="agenda-hora">{formatarHora(a.data)}</div>
                  <div className="agenda-info">
                    <div className="agenda-nome">
                      {a.nome}
                      {a.origem === 'ia' && (
                        <span className="agenda-tag-ia"><Bot size={11} /> IA</span>
                      )}
                    </div>
                    <div className="agenda-sub">
                      {a.especialidade}{a.medico ? ` · ${a.medico}` : ''}
                      {a.telefone ? ` · ${a.telefone}` : ''}
                    </div>
                  </div>
                                   <span className={`agenda-status status-${a.status}`}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>

                  {a.status === 'pendente' && (
                    <div className="agenda-acoes">
                      <button className="agenda-icone ok" aria-label="Confirmar"
                        onClick={() => mudarStatus(a._id, 'confirmado')}>
                        <Check size={15} />
                      </button>
                      <button className="agenda-icone no" aria-label="Cancelar"
                        onClick={() => mudarStatus(a._id, 'cancelado')}>
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {excluindoId === a._id ? (
                    <div className="agenda-confirma">
                      <span>Excluir?</span>
                      <button className="agenda-sim" onClick={() => excluir(a._id)}>Sim</button>
                      <button className="agenda-nao" onClick={() => setExcluindoId(null)}>Não</button>
                    </div>
                  ) : (
                    <button className="agenda-icone lixo" aria-label="Excluir agendamento"
                      onClick={() => setExcluindoId(a._id)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}