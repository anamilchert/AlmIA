const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CUSTO_HASH = 10;
const EXPIRACAO = process.env.JWT_EXPIRES_IN || '8h';

function segredo() {
  const valor = process.env.JWT_SECRET;
  if (!valor || valor.length < 16) {
    throw new Error('JWT_SECRET não configurado ou curto demais.');
  }
  return valor;
}

function gerarHash(senha) {
  return bcrypt.hash(senha, CUSTO_HASH);
}

function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

function gerarToken(usuario) {
  return jwt.sign(
    { sub: String(usuario._id), papel: usuario.papel, ownerId: usuario.ownerId },
    segredo(),
    { expiresIn: EXPIRACAO }
  );
}

function verificarToken(token) {
  return jwt.verify(token, segredo());
}

module.exports = { gerarHash, conferirSenha, gerarToken, verificarToken };