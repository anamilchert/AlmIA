const { verificarToken } = require('../services/authService');

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Autenticação necessária.' });
  }

  try {
    const dados = verificarToken(token);
    req.usuarioId = dados.sub;
    req.papel = dados.papel;
    req.ownerId = dados.ownerId;
    return next();
  } catch (e) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
}

function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!papeis.includes(req.papel)) {
      return res.status(403).json({ erro: 'Sem permissão para esta ação.' });
    }
    return next();
  };
}

module.exports = autenticar;
module.exports.exigirPapel = exigirPapel;