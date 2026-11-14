const mongoose = require('mongoose');

const agendamentoSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },

  pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', default: null },
  nome: { type: String, required: true },
  telefone: { type: String, default: '' },

  especialidade: { type: String, required: true },
  medico: { type: String, default: '' },
  data: { type: Date, required: true },
  duracaoMinutos: { type: Number, default: 30 },

  status: {
    type: String,
    enum: ['pendente', 'confirmado', 'cancelado', 'concluido', 'nao_compareceu'],
    default: 'pendente'
  },
  origem: { type: String, enum: ['recepcao', 'ia'], default: 'recepcao' },
  observacoes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Agendamento', agendamentoSchema);