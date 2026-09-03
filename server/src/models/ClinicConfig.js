const mongoose = require('mongoose');

const horarioDiaSchema = new mongoose.Schema(
  {
    dia: { type: String, required: true },
    ativo: { type: Boolean, default: false },
    abertura: { type: String, default: '' },
    fechamento: { type: String, default: '' },
  },
  { _id: false }
);

const preparoExameSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    instrucoes: { type: String, default: '' },
  },
  { _id: false }
);

const clinicConfigSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      unique: true,
    },

    dadosGerais: {
      nomeClinica: { type: String, trim: true, default: '' },
      cnpj: { type: String, trim: true, default: '' },
      especialidades: { type: String, trim: true, default: '' },
      telefonePrincipal: { type: String, trim: true, default: '' },
      whatsappAtendimento: { type: String, trim: true, default: '' },
      endereco: { type: String, trim: true, default: '' },
      siteAgendamento: { type: String, trim: true, default: '' },
    },

    horarios: {
      type: [horarioDiaSchema],
      default: () => [
        { dia: 'Seg', ativo: true, abertura: '07:00', fechamento: '18:00' },
        { dia: 'Ter', ativo: true, abertura: '07:00', fechamento: '18:00' },
        { dia: 'Qua', ativo: true, abertura: '07:00', fechamento: '18:00' },
        { dia: 'Qui', ativo: true, abertura: '07:00', fechamento: '18:00' },
        { dia: 'Sex', ativo: true, abertura: '07:00', fechamento: '18:00' },
        { dia: 'Sáb', ativo: true, abertura: '08:00', fechamento: '13:00' },
        { dia: 'Dom', ativo: false, abertura: '', fechamento: '' },
      ],
    },

    convenios: { type: [String], default: [] },

    preparoExames: { type: [preparoExameSchema], default: [] },

    mensagensBot: {
      boasVindas: { type: String, default: '' },
      transferenciaHumano: { type: String, default: '' },
      foraHorario: { type: String, default: '' },
      encerramento: { type: String, default: '' },
    },

    avancado: {
      atendimentoForaHorario: { type: Boolean, default: true },
      identificarComoIA: { type: Boolean, default: true },
      handoffAutomatico: { type: Boolean, default: true },
      confirmarAgendamentoSemHumano: { type: Boolean, default: false },
      notificarEquipeEmail: { type: Boolean, default: true },
      timeoutIA: { type: Number, default: 5, min: 2, max: 30 },
      tentativasAntesHandoff: { type: Number, default: 2, min: 1, max: 5 },
      historicoMensagens: { type: Number, default: 20, min: 5, max: 100 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClinicConfig', clinicConfigSchema);