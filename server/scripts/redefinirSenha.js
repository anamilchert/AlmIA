require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');
const { gerarHash } = require('../src/services/authService');

async function main() {
  const [email, novaSenha] = process.argv.slice(2);

  if (!email || !novaSenha) {
    console.error('Uso: node scripts/redefinirSenha.js email novaSenha');
    process.exit(1);
  }
  if (novaSenha.length < 8) {
    console.error('A senha deve ter ao menos 8 caracteres.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const usuario = await Usuario.findOne({ email: email.toLowerCase() });
  if (!usuario) {
    console.error('Usuário não encontrado.');
    await mongoose.disconnect();
    process.exit(1);
  }

  usuario.senhaHash = await gerarHash(novaSenha);
  await usuario.save();
  console.log(`Senha redefinida para ${usuario.email}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});