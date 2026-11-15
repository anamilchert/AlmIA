const express = require('express');
const router = express.Router();
const {
  listarConversas,
  listarHandoffs,
  obterConversa,
  criarConversa,
  enviarMensagem,
  responderComoAtendente,
  atualizarStatus,
  removerConversa
} = require('../controllers/conversaController');

router.get('/', listarConversas);
router.get('/handoffs', listarHandoffs);
router.get('/:id', obterConversa);
router.post('/', criarConversa);
router.post('/:id/mensagens', enviarMensagem);
router.post('/:id/atendente', responderComoAtendente);
router.patch('/:id', atualizarStatus);
router.delete('/:id', removerConversa);

module.exports = router;