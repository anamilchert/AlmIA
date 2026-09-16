function buildTimelinePaciente(paciente) {
  const eventos = [];

  eventos.push({
    tipo: 'cadastro',
    titulo: 'Cadastro na clínica',
    data: paciente.dataCadastro,
    detalhe: 'Primeiro acesso registrado na clínica.'
  });

  paciente.consultas.forEach((c) => {
    eventos.push({
      tipo: c.status === 'realizada' ? 'consulta_realizada' : 'consulta_agendada',
      titulo: `Consulta ${c.status === 'realizada' ? 'realizada' : 'agendada'} — ${c.especialidade}`,
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