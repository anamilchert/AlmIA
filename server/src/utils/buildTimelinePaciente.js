const STATUS_CONSULTA = {
  agendada: { tipo: 'consulta_agendada', titulo: 'agendada' },
  realizada: { tipo: 'consulta_realizada', titulo: 'realizada' },
  a_remarcar: { tipo: 'consulta_a_remarcar', titulo: 'a remarcar' },
  nao_compareceu: { tipo: 'consulta_nao_compareceu', titulo: 'não compareceu' },
  cancelada: { tipo: 'consulta_cancelada', titulo: 'cancelada' }
};

function buildTimelinePaciente(paciente) {
  const eventos = [];

  eventos.push({
    tipo: 'cadastro',
    titulo: 'Cadastro na clínica',
    data: paciente.dataCadastro,
    detalhe: 'Primeiro acesso registrado na clínica.'
  });

  paciente.consultas.forEach((c) => {
    const info = STATUS_CONSULTA[c.status] || STATUS_CONSULTA.agendada;

    eventos.push({
      tipo: info.tipo,
      titulo: `Consulta ${info.titulo} — ${c.especialidade}`,
      data: c.data,
      detalhe: [c.medico && `Com ${c.medico}.`, c.observacoes].filter(Boolean).join(' '),
      tags: [c.especialidade, c.status].filter(Boolean)
    });
  });

  paciente.conversasResumo.forEach((conv) => {
    eventos.push({
      tipo: conv.atendimento === 'humano' ? 'conversa_humano' : 'conversa_ia',
      titulo: conv.atendimento === 'humano'
        ? 'Conversa transferida para humano'
        : 'Conversa via WhatsApp',
      data: conv.data,
      detalhe: conv.detalhe || conv.resumoIA,
      tags: [conv.assunto]
    });
  });

  return eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
}

module.exports = buildTimelinePaciente;