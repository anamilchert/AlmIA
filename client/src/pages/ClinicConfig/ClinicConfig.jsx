import { useState, useEffect } from 'react';
import {
  Building2, Clock, IdCard, FileText, MessageCircle, SlidersHorizontal,
  Save, Plus, X, Trash2, CheckCircle2,
} from 'lucide-react';
import { getClinicConfig, saveClinicConfig } from '../../api/clinicConfigApi';
import './ClinicConfig.css';

const SECOES = [
  { id: 'dados', label: 'Dados gerais', icon: Building2 },
  { id: 'horarios', label: 'Horários', icon: Clock },
  { id: 'convenios', label: 'Convênios', icon: IdCard },
  { id: 'exames', label: 'Preparo de exames', icon: FileText },
  { id: 'bot', label: 'Mensagens do bot', icon: MessageCircle },
  { id: 'avancado', label: 'Avançado', icon: SlidersHorizontal },
];

export default function ClinicConfig() {
  const [secaoAtiva, setSecaoAtiva] = useState('dados');
  const [config, setConfig] = useState(null);
  const [novoConvenio, setNovoConvenio] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [statusSalvo, setStatusSalvo] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    getClinicConfig()
      .then((data) => setConfig(data))
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  }, []);

  function atualizarDadosGerais(campo, valor) {
    setConfig((prev) => ({
      ...prev,
      dadosGerais: { ...prev.dadosGerais, [campo]: valor },
    }));
  }

  function atualizarHorario(index, campo, valor) {
    setConfig((prev) => {
      const horarios = [...prev.horarios];
      horarios[index] = { ...horarios[index], [campo]: valor };
      return { ...prev, horarios };
    });
  }

  function adicionarConvenio() {
    const valor = novoConvenio.trim();
    if (!valor) return;
    setConfig((prev) => {
      if (prev.convenios.includes(valor)) return prev;
      return { ...prev, convenios: [...prev.convenios, valor] };
    });
    setNovoConvenio('');
  }

  function removerConvenio(index) {
    setConfig((prev) => ({
      ...prev,
      convenios: prev.convenios.filter((_, i) => i !== index),
    }));
  }

  function atualizarExame(index, campo, valor) {
    setConfig((prev) => {
      const preparoExames = [...prev.preparoExames];
      preparoExames[index] = { ...preparoExames[index], [campo]: valor };
      return { ...prev, preparoExames };
    });
  }

  function adicionarExame() {
    setConfig((prev) => ({
      ...prev,
      preparoExames: [...prev.preparoExames, { nome: 'Novo exame', instrucoes: '' }],
    }));
  }

  function removerExame(index) {
    setConfig((prev) => ({
      ...prev,
      preparoExames: prev.preparoExames.filter((_, i) => i !== index),
    }));
  }

  function atualizarMensagemBot(campo, valor) {
    setConfig((prev) => ({
      ...prev,
      mensagensBot: { ...prev.mensagensBot, [campo]: valor },
    }));
  }

  function atualizarAvancado(campo, valor) {
    setConfig((prev) => ({
      ...prev,
      avancado: { ...prev.avancado, [campo]: valor },
    }));
  }

  async function handleSalvar() {
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await saveClinicConfig(config);
      setConfig(atualizado);
      setStatusSalvo(true);
      setTimeout(() => setStatusSalvo(false), 3000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="cfg-loading">Carregando configurações...</div>;
  if (!config) return <div className="cfg-loading">Não foi possível carregar as configurações.</div>;

  return (
    <div className="cfg-page">
     <div className="cfg-topbar">
        <span className="cfg-topbar-title">Configurações da clínica</span>
        <span className={`save-status ${statusSalvo ? 'visible' : ''}`}>
            <CheckCircle2 size={15} strokeWidth={2} />
            Salvo
        </span>
        <button className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
            <Save size={15} strokeWidth={2} />
            {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
        </div>

      {erro && <div className="cfg-erro">{erro}</div>}

      <div className="cfg-body">
       <nav className="page-nav">
  {SECOES.map((s) => {
    const Icon = s.icon;
    return (
      <div
        key={s.id}
        className={`page-nav-item ${secaoAtiva === s.id ? 'active' : ''}`}
        onClick={() => setSecaoAtiva(s.id)}
      >
        <Icon size={16} strokeWidth={1.8} />
        {s.label}
      </div>
    );
  })}
</nav>

        <div className="page-content">
     <div className="page-content-inner">
          {secaoAtiva === 'dados' && (
            <section className="cfg-card">
              <header className="cfg-card-header">
                <div className="cfg-card-title">Dados gerais</div>
                <div className="cfg-card-sub">Informações básicas exibidas ao paciente</div>
              </header>
              <div className="cfg-card-body form-grid">
                <div className="field form-full">
                  <label>Nome da clínica</label>
                  <input
                    type="text"
                    value={config.dadosGerais.nomeClinica}
                    onChange={(e) => atualizarDadosGerais('nomeClinica', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    value={config.dadosGerais.cnpj}
                    onChange={(e) => atualizarDadosGerais('cnpj', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Especialidades</label>
                  <input
                    type="text"
                    value={config.dadosGerais.especialidades}
                    onChange={(e) => atualizarDadosGerais('especialidades', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Telefone principal</label>
                  <input
                    type="text"
                    value={config.dadosGerais.telefonePrincipal}
                    onChange={(e) => atualizarDadosGerais('telefonePrincipal', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>WhatsApp de atendimento</label>
                  <input
                    type="text"
                    value={config.dadosGerais.whatsappAtendimento}
                    onChange={(e) => atualizarDadosGerais('whatsappAtendimento', e.target.value)}
                  />
                </div>
                <div className="field form-full">
                  <label>Endereço completo</label>
                  <input
                    type="text"
                    value={config.dadosGerais.endereco}
                    onChange={(e) => atualizarDadosGerais('endereco', e.target.value)}
                  />
                </div>
                <div className="field form-full">
                  <label>Site / link de agendamento online</label>
                  <input
                    type="text"
                    value={config.dadosGerais.siteAgendamento}
                    onChange={(e) => atualizarDadosGerais('siteAgendamento', e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {secaoAtiva === 'horarios' && (
            <section className="cfg-card">
              <header className="cfg-card-header">
                <div className="cfg-card-title">Horários de funcionamento</div>
                <div className="cfg-card-sub">Ative os dias e defina os turnos de atendimento</div>
              </header>
              <div className="cfg-card-body">
                <div className="horario-grid">
                  {config.horarios.map((h, i) => (
                    <div className="dia-col" key={h.dia}>
                      <div className="dia-label">{h.dia}</div>
                      <button
                        className={`dia-toggle ${h.ativo ? 'on' : ''}`}
                        onClick={() => atualizarHorario(i, 'ativo', !h.ativo)}
                        aria-label={h.dia}
                      />
                      <input
                        type="time"
                        className="hora-input"
                        value={h.abertura}
                        onChange={(e) => atualizarHorario(i, 'abertura', e.target.value)}
                        disabled={!h.ativo}
                      />
                      <div className="hora-dash">até</div>
                      <input
                        type="time"
                        className="hora-input"
                        value={h.fechamento}
                        onChange={(e) => atualizarHorario(i, 'fechamento', e.target.value)}
                        disabled={!h.ativo}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {secaoAtiva === 'convenios' && (
            <section className="cfg-card">
              <header className="cfg-card-header">
                <div className="cfg-card-title">Convênios aceitos</div>
                <div className="cfg-card-sub">O bot responderá automaticamente com essa lista</div>
              </header>
              <div className="cfg-card-body">
                <div className="conv-wrap">
                  {config.convenios.map((c, i) => (
                    <div className="conv-tag" key={c}>
                      {c}
                      <button onClick={() => removerConvenio(i)} aria-label={`Remover ${c}`}>
                        <X size={13} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-conv-row">
                  <input
                    type="text"
                    value={novoConvenio}
                    placeholder="Adicionar convênio..."
                    onChange={(e) => setNovoConvenio(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && adicionarConvenio()}
                  />
                  <button className="btn btn-primary" onClick={adicionarConvenio}>
                    <Plus size={15} strokeWidth={2} />
                    Adicionar
                    </button>
                </div>
              </div>
            </section>
          )}

          {secaoAtiva === 'exames' && (
            <section className="cfg-card">
              <header className="cfg-card-header">
                <div className="cfg-card-title">Preparo de exames</div>
                <div className="cfg-card-sub">
                  Instruções enviadas automaticamente pelo bot quando solicitado
                </div>
              </header>
              <div className="cfg-card-body form-grid">
                {config.preparoExames.map((ex, i) => (
                  <div className="field form-full exame-item" key={i}>
                    <div className="exame-item-head">
                      <input
                        type="text"
                        className="exame-nome-input"
                        value={ex.nome}
                        onChange={(e) => atualizarExame(i, 'nome', e.target.value)}
                      />
                      <button className="btn-remover-exame" onClick={() => removerExame(i)}>
                        <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                    </div>
                    <textarea
                      rows={2}
                      value={ex.instrucoes}
                      onChange={(e) => atualizarExame(i, 'instrucoes', e.target.value)}
                    />
                  </div>
                ))}
                <button className="btn" onClick={adicionarExame}>
                <Plus size={15} strokeWidth={2} />
                Adicionar exame
                </button>
              </div>
            </section>
          )}

          {secaoAtiva === 'bot' && (
            <section className="cfg-card">
              <header className="cfg-card-header">
                <div className="cfg-card-title">Mensagens do assistente</div>
                <div className="cfg-card-sub">Textos padrão enviados em momentos específicos</div>
              </header>
              <div className="cfg-card-body form-grid">
                <div className="field form-full">
                  <label>Mensagem de boas-vindas</label>
                  <textarea
                    rows={3}
                    value={config.mensagensBot.boasVindas}
                    onChange={(e) => atualizarMensagemBot('boasVindas', e.target.value)}
                  />
                </div>
                <div className="field form-full">
                  <label>Mensagem de transferência para humano</label>
                  <textarea
                    rows={3}
                    value={config.mensagensBot.transferenciaHumano}
                    onChange={(e) => atualizarMensagemBot('transferenciaHumano', e.target.value)}
                  />
                </div>
                <div className="field form-full">
                  <label>Mensagem fora do horário</label>
                  <textarea
                    rows={3}
                    value={config.mensagensBot.foraHorario}
                    onChange={(e) => atualizarMensagemBot('foraHorario', e.target.value)}
                  />
                </div>
                <div className="field form-full">
                  <label>Mensagem de encerramento</label>
                  <textarea
                    rows={2}
                    value={config.mensagensBot.encerramento}
                    onChange={(e) => atualizarMensagemBot('encerramento', e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {secaoAtiva === 'avancado' && (
            <>
              <section className="cfg-card">
                <header className="cfg-card-header">
                  <div className="cfg-card-title">Comportamento do assistente</div>
                  <div className="cfg-card-sub">Controles de automação e limites de atuação da IA</div>
                </header>
                <div className="cfg-card-body">
                  <ToggleRow
                    label="Atendimento fora do horário comercial"
                    desc="O bot responde automaticamente mesmo fora do expediente"
                    valor={config.avancado.atendimentoForaHorario}
                    onChange={(v) => atualizarAvancado('atendimentoForaHorario', v)}
                  />
                  <ToggleRow
                    label="Identificar-se como assistente virtual"
                    desc="Informa ao paciente que está falando com IA no início da conversa"
                    valor={config.avancado.identificarComoIA}
                    onChange={(v) => atualizarAvancado('identificarComoIA', v)}
                  />
                  <ToggleRow
                    label="Handoff automático ao detectar frustração"
                    desc="Transfere para humano quando o paciente demonstra insatisfação"
                    valor={config.avancado.handoffAutomatico}
                    onChange={(v) => atualizarAvancado('handoffAutomatico', v)}
                  />
                  <ToggleRow
                    label="Confirmar agendamentos sem humano"
                    desc="Permite que o bot confirme datas diretamente"
                    valor={config.avancado.confirmarAgendamentoSemHumano}
                    onChange={(v) => atualizarAvancado('confirmarAgendamentoSemHumano', v)}
                  />
                  <ToggleRow
                    label="Notificar equipe por e-mail em handoffs"
                    desc="Envia alerta para a recepção a cada transferência para humano"
                    valor={config.avancado.notificarEquipeEmail}
                    onChange={(v) => atualizarAvancado('notificarEquipeEmail', v)}
                  />
                </div>
              </section>

              <section className="cfg-card" style={{ marginTop: 16 }}>
                <header className="cfg-card-header">
                  <div className="cfg-card-title">Limites de resposta</div>
                  <div className="cfg-card-sub">Controle de performance do assistente</div>
                </header>
                <div className="cfg-card-body form-grid cols3">
                  <div className="field">
                    <label>Timeout da IA (segundos)</label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={config.avancado.timeoutIA}
                      onChange={(e) => atualizarAvancado('timeoutIA', Number(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label>Tentativas antes de handoff</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={config.avancado.tentativasAntesHandoff}
                      onChange={(e) => atualizarAvancado('tentativasAntesHandoff', Number(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label>Histórico por conversa (msgs)</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={config.avancado.historicoMensagens}
                      onChange={(e) => atualizarAvancado('historicoMensagens', Number(e.target.value))}
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
 </div> 
  );
}

function ToggleRow({ label, desc, valor, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-label">{label}</div>
        <div className="toggle-desc">{desc}</div>
      </div>
      <button className={`toggle ${valor ? 'on' : ''}`} onClick={() => onChange(!valor)} aria-label="toggle" />
    </div>
  );
}