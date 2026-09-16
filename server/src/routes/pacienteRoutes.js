const express = require('express');
const router = express.Router();
const { listarPacientes, obterPaciente, criarPaciente } = require('../controllers/pacienteController');

router.get('/', listarPacientes);
router.get('/:id', obterPaciente);
router.post('/', criarPaciente);

module.exports = router;