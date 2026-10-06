const express = require('express');
const router = express.Router();
const {
  listarConversas, obterConversa, criarConversa, enviarMensagem
} = require('../controllers/conversaController');

router.get('/', listarConversas);
router.get('/:id', obterConversa);
router.post('/', criarConversa);
router.post('/:id/mensagens', enviarMensagem);

module.exports = router;