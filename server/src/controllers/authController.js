const Usuario = require('../models/Usuario');
const { PAPEIS } = require('../models/Usuario');
const { gerarHash, conferirSenha, gerarToken } = require('../services/authService');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 8;

function dadosPublicos(usuario) {
  return {
    id: String(usuario._id),
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
  };
}

async function login(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });
    }

    const usuario = await Usuario.findOne({ email, ativo: true }).select('+senhaHash');
    const confere = usuario ? await conferirSenha(senha, usuario.senhaHash) : false;

    if (!confere) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    return res.json({ token: gerarToken(usuario), usuario: dadosPublicos(usuario) });
  } catch (err) {
    console.error('[Auth] Erro no login:', err.message);
    return res.status(500).json({ erro: 'Erro ao entrar.' });
  }
}

async function eu(req, res) {
  try {
    const usuario = await Usuario.findOne({ _id: req.usuarioId, ativo: true });
    if (!usuario) {
      return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    }
    return res.json({ usuario: dadosPublicos(usuario) });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
}

async function criarUsuario(req, res) {
  try {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const papel = req.body.papel || 'recepcao';

    if (!nome) return res.status(400).json({ erro: 'Informe o nome.' });
    if (!EMAIL_VALIDO.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
    if (senha.length < SENHA_MINIMA) {
      return res.status(400).json({ erro: `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.` });
    }
    if (!PAPEIS.includes(papel)) return res.status(400).json({ erro: 'Perfil inválido.' });

    const existente = await Usuario.findOne({ email });
    if (existente) return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail.' });

    const criado = await Usuario.create({
      nome,
      email,
      papel,
      ownerId: req.ownerId,
      senhaHash: await gerarHash(senha),
    });

    return res.status(201).json({ usuario: dadosPublicos(criado) });
  } catch (err) {
    console.error('[Auth] Erro ao criar usuário:', err.message);
    return res.status(500).json({ erro: 'Erro ao criar usuário.' });
  }
}

module.exports = { login, eu, criarUsuario };