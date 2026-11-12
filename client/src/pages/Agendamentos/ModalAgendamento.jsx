import { useEffect, useState } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { listarPacientes, criarPaciente } from '../../api/pacienteApi';
import { criarAgendamento } from '../../api/agendamentoApi';
import { getClinicConfig } from '../../api/clinicConfigApi';
import './ModalAgendamento.css';

const HORARIOS = [];
for (let h = 8; h < 18; h++) {
  HORARIOS.push(`${String(h).padStart(2, '0')}:00`);
  HORARIOS.push(`${String(h).padStart(2, '0')}:30`);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function chaveDia(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function horaDe(data) {
  const d = new Date(data);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CadastroPaciente({ nomeInicial, onCadastrado, onFechar }) {
  const [form, setForm] = useState({
    nome: nomeInicial || '', telefone: '', dataNascimento: '', email: ''
  });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const dados = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim()
      };
      if (form.dataNascimento) dados.dataNascimento = form.dataNascimento;
      const novo = await criarPaciente(dados);
      onCadastrado(novo);
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="mdl-overlay mdl-overlay-topo">
      <form className="mdl mdl-pequeno" onSubmit={handleSubmit}>
        <div className="mdl-head">
          <h2>Cadastrar paciente</h2>
          <button type="button" className="mdl-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="mdl-corpo">
          <label className="mdl-campo">
            <span>Nome completo</span>
            <input value={form.nome} onChange={(e) => mudar('nome', e.target.value)} autoFocus />
          </label>
          <label className="mdl-campo">
            <span>Telefone (WhatsApp)</span>
            <input value={form.telefone} onChange={(e) => mudar('telefone', e.target.value)}
              placeholder="5547999999999" />
          </label>
          <div className="mdl-linha">
            <label className="mdl-campo">
              <span>Data de nascimento</span>
              <input type="date" value={form.dataNascimento}
                onChange={(e) => mudar('dataNascimento', e.target.value)} />
            </label>
            <label className="mdl-campo">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={(e) => mudar('email', e.target.value)} />
            </label>
          </div>
          {erro && <div className="mdl-erro">{erro}</div>}
        </div>
        <div className="mdl-rodape">
          <button type="button" className="mdl-btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="mdl-btn mdl-btn-primario" disabled={salvando}>
            {salvando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ModalAgendamento({ dataInicial, agendamentos, onFechar, onSalvo }) {
  const hoje = chaveDia(new Date());
  const [pacientes, setPacientes] = useState([]);
  const [config, setConfig] = useState({ listaEspecialidades: [], medicos: [] });
  const [busca, setBusca] = useState('');
  const [listaAberta, setListaAberta] = useState(false);
  const [paciente, setPaciente] = useState(null);
  const [cadastrando, setCadastrando] = useState(false);
  const [especialidade, setEspecialidade] = useState('');
  const [medico, setMedico] = useState('');
  const [data, setData] = useState(dataInicial || hoje);
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarPacientes().then(setPacientes).catch(() => setPacientes([]));
    getClinicConfig().then(setConfig).catch(() => {});
  }, []);

  const especialidades = config.listaEspecialidades || [];
  const medicosDaEspecialidade = (config.medicos || []).filter(
    (m) => !especialidade || !m.especialidade || m.especialidade === especialidade
  );

  const filtrados = pacientes
    .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
    .slice(0, 6);

  function escolherPaciente(p) {
    setPaciente(p);
    setBusca('');
    setListaAberta(false);
  }

  function aoCadastrar(novo) {
    setPacientes((lista) => [...lista, novo]);
    escolherPaciente(novo);
    setCadastrando(false);
  }

  const agora = new Date();
  const horaAgora = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
  const medicoNorm = medico.trim().toLowerCase();

  const ocupados = new Set(
    agendamentos
      .filter((a) => a.status !== 'cancelado' && chaveDia(a.data) === data
        && (a.medico || '').trim().toLowerCase() === medicoNorm)
      .map((a) => horaDe(a.data))
  );

  function indisponivel(h) {
    return ocupados.has(h) || (data === hoje && h <= horaAgora);
  }

  function mudarData(valor) {
    setData(valor);
    setHora('');
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (!paciente) return setErro('Escolha um paciente.');
    if (!especialidade) return setErro('Escolha a especialidade.');
    if (!data || !hora) return setErro('Escolha a data e o horário.');
    setErro(null);
    setSalvando(true);
    try {
      await criarAgendamento({
        pacienteId: paciente._id,
        nome: paciente.nome,
        telefone: paciente.telefone || '',
        especialidade,
        medico,
        data: new Date(`${data}T${hora}`).toISOString(),
        status: 'confirmado',
        origem: 'recepcao'
      });
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  const manha = HORARIOS.filter((h) => h < '12:00');
  const tarde = HORARIOS.filter((h) => h >= '12:00');

  function renderGrade(titulo, horarios) {
    return (
      <div className="hora-bloco">
        <div className="hora-titulo">{titulo}</div>
        <div className="hora-grade">
          {horarios.map((h) => (
            <button
              type="button"
              key={h}
              className={`hora-chip ${hora === h ? 'ativo' : ''}`}
              disabled={indisponivel(h)}
              onClick={() => setHora(h)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mdl-overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <form className="mdl" onSubmit={handleSalvar}>
        <div className="mdl-head">
          <h2>Novo agendamento</h2>
          <button type="button" className="mdl-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="mdl-corpo">
          <div className="mdl-campo">
            <span>Paciente</span>
            {paciente ? (
              <div className="pac-escolhido">
                <div className="pac-avatar">
                  {paciente.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div className="pac-dados">
                  <strong>{paciente.nome}</strong>
                  <small>{paciente.telefone || 'sem telefone'}</small>
                </div>
                <button type="button" className="mdl-link" onClick={() => setPaciente(null)}>
                  Trocar
                </button>
              </div>
            ) : (
              <div className="pac-busca">
                <div className="pac-input">
                  <Search size={15} />
                  <input
                    placeholder="Buscar paciente pelo nome..."
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setListaAberta(true); }}
                    onFocus={() => setListaAberta(true)}
                  />
                </div>
                {listaAberta && (
                  <div className="pac-lista">
                    {filtrados.map((p) => (
                      <button type="button" key={p._id} className="pac-opcao"
                        onClick={() => escolherPaciente(p)}>
                        <strong>{p.nome}</strong>
                        <small>{p.telefone || 'sem telefone'}</small>
                      </button>
                    ))}
                    {filtrados.length === 0 && (
                      <div className="pac-vazio">Nenhum paciente encontrado.</div>
                    )}
                    <button type="button" className="pac-opcao pac-novo"
                      onClick={() => setCadastrando(true)}>
                      <UserPlus size={15} /> Cadastrar novo paciente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mdl-linha">
            <label className="mdl-campo">
              <span>Especialidade</span>
              <select
                value={especialidade}
                onChange={(e) => { setEspecialidade(e.target.value); setMedico(''); setHora(''); }}
              >
                <option value="">Selecione...</option>
                {especialidades.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </label>
            <label className="mdl-campo">
              <span>Médico</span>
              <select
                value={medico}
                onChange={(e) => { setMedico(e.target.value); setHora(''); }}
                disabled={!especialidade}
              >
                <option value="">Qualquer</option>
                {medicosDaEspecialidade.map((m) => (
                  <option key={`${m.nome}-${m.especialidade}`} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            </label>
          </div>
          {especialidades.length === 0 && (
            <div className="mdl-dica">
              Nenhuma especialidade cadastrada. Cadastre em Clínica → Especialidades e médicos.
            </div>
          )}

          <label className="mdl-campo">
            <span>Data</span>
            <input type="date" value={data} min={hoje} onChange={(e) => mudarData(e.target.value)} />
          </label>

          <div className="mdl-campo">
            <span>Horário</span>
            {renderGrade('Manhã', manha)}
            {renderGrade('Tarde', tarde)}
          </div>

          {erro && <div className="mdl-erro">{erro}</div>}
        </div>

        <div className="mdl-rodape">
          <button type="button" className="mdl-btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="mdl-btn mdl-btn-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </form>

      {cadastrando && (
        <CadastroPaciente
          nomeInicial={busca}
          onCadastrado={aoCadastrar}
          onFechar={() => setCadastrando(false)}
        />
      )}
    </div>
  );
}