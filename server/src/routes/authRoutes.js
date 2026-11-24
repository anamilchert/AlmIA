const express = require('express');
const router = express.Router();
const { login, eu, criarUsuario } = require('../controllers/authController');
const autenticar = require('../middlewares/autenticar');
const { exigirPapel } = require('../middlewares/autenticar');

router.post('/login', login);
router.get('/eu', autenticar, eu);
router.post('/usuarios', autenticar, exigirPapel('gestor'), criarUsuario);

module.exports = router;