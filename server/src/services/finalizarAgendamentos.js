const Agendamento = require('../models/Agendamento');
const Paciente = require('../models/Paciente');

const MINUTO = 60 * 1000;

async function finalizarAgendamentosVencidos(ownerId, agora = new Date()) {
  const candidatos = await Agendamento.find({
    ownerId,
    status: 'confirmado',
    data: { $lt: agora }
  });

  const vencidos = candidatos.filter(
    (a) => new Date(a.data).getTime() + (a.duracaoMinutos || 30) * MINUTO < agora.getTime()
  );

  for (const a of vencidos) {
    let pacienteId = a.pacienteId;
    if (!pacienteId && a.telefone) {
      const paciente = await Paciente.findOne({ ownerId, telefone: a.telefone });
      pacienteId = paciente ? paciente._id : null;
    }

    if (pacienteId) {
      await Paciente.updateOne(
        { _id: pacienteId, ownerId, 'consultas.agendamentoId': { $ne: a._id } },
        {
          $push: {
            consultas: {
              especialidade: a.especialidade,
              medico: a.medico,
              data: a.data,
              status: 'realizada',
              observacoes: a.observacoes,
              agendamentoId: a._id
            }
          }
        }
      );
    }

    a.status = 'concluido';
    await a.save();
  }

  return vencidos.length;
}

module.exports = { finalizarAgendamentosVencidos };