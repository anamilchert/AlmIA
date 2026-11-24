require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');
const { gerarHash } = require('../src/services/authService');

async function main() {
  const [nome, email, senha, papel = 'gestor', ownerId = 'owner-teste-001'] = process.argv.slice(2);

  if (!nome || !email || !senha) {
    console.error('Uso: node scripts/criarUsuario.js "Nome" email senha [gestor|recepcao] [ownerId]');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('A senha deve ter ao menos 8 caracteres.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const existente = await Usuario.findOne({ email: email.toLowerCase() });
  if (existente) {
    console.error('Já existe um usuário com esse e-mail.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const criado = await Usuario.create({
    nome,
    email,
    papel,
    ownerId,
    senhaHash: await gerarHash(senha),
  });
  console.log(`Usuário criado: ${criado.email} (${criado.papel}) na clínica ${criado.ownerId}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});