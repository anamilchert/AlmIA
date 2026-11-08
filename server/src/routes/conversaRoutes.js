const express = require('express');
const router = express.Router();
const {
  listarConversas, obterConversa, criarConversa, enviarMensagem,
  responderComoAtendente, atualizarStatus
} = require('../controllers/conversaController');

router.get('/', listarConversas);
router.get('/:id', obterConversa);
router.post('/', criarConversa);
router.post('/:id/mensagens', enviarMensagem);
router.post('/:id/atendente', responderComoAtendente);
router.patch('/:id', atualizarStatus);

module.exports = router;