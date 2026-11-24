const mongoose = require('mongoose');

const PAPEIS = ['gestor', 'recepcao'];

const usuarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, required: true, select: false },
    papel: { type: String, enum: PAPEIS, default: 'recepcao' },
    ownerId: { type: String, required: true },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
module.exports.PAPEIS = PAPEIS;