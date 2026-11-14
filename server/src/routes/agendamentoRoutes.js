const express = require('express');
const router = express.Router();
const {
  listarAgendamentos, criarAgendamento, atualizarStatus, removerAgendamento
} = require('../controllers/agendamentoController');

router.get('/', listarAgendamentos);
router.post('/', criarAgendamento);
router.patch('/:id/status', atualizarStatus);
router.delete('/:id', removerAgendamento);

module.exports = router;