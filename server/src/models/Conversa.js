const mongoose = require('mongoose');

const mensagemSchema = new mongoose.Schema({
  remetente: { type: String, enum: ['paciente', 'bot', 'humano'], required: true },
  texto: { type: String, required: true },
  data: { type: Date, default: Date.now }
});

const conversaSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },

  nome: { type: String, default: 'Contato não identificado' },
  telefone: { type: String, default: '' },

  pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', default: null },

  estado: {
    type: String,
    enum: ['livre', 'coletando_nome', 'coletando_nascimento'],
    default: 'livre'
  },

  mensagemPendente: { type: String, default: null },

  status: {
    type: String,
    enum: ['ia', 'humano', 'concluida'],
    default: 'ia'
  },

  mensagens: [mensagemSchema],

  ultimaMensagemEm: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Conversa', conversaSchema);