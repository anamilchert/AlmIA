const mongoose = require('mongoose');

const consultaSchema = new mongoose.Schema({
  especialidade: { type: String, required: true },
  medico: { type: String, default: '' },
  data: { type: Date, required: true },
  status: {
    type: String,
    enum: ['agendada', 'realizada', 'a_remarcar', 'nao_compareceu', 'cancelada'],
    default: 'agendada'
  },
  convenio: { type: String, default: '' },
  observacoes: { type: String, default: '' }
});

const conversaResumoSchema = new mongoose.Schema({
  data: { type: Date, required: true },
  assunto: { type: String, required: true },
  detalhe: { type: String, default: '' },
  atendimento: { type: String, enum: ['ia', 'humano'], default: 'ia' },
  mensagens: { type: Number, default: 0 },
  duracaoMinutos: { type: Number, default: null }, // null = "em andamento"
  resumoIA: { type: String, default: '' }
});

const pacienteSchema = new mongoose.Schema({
  ownerId: { type: String, required: true }, // TODO: trocar por req.userId quando auth existir

  nome: { type: String, required: true },
  dataNascimento: { type: Date },
  telefone: { type: String, default: '' },
  email: { type: String, default: '' },
  cidade: { type: String, default: '' },
  cpf: { type: String, default: '' },

  planoSaude: {
    operadora: { type: String, default: '' },
    carteirinha: { type: String, default: '' },
    validade: { type: String, default: '' }
  },

  observacoesInternas: { type: String, default: '' },

  dataCadastro: { type: Date, default: Date.now },

  consultas: [consultaSchema],
  conversasResumo: [conversaResumoSchema]
}, { timestamps: true });

module.exports = mongoose.model('Paciente', pacienteSchema);