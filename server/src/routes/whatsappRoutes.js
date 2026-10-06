const express = require('express');
const router = express.Router();
const { verificarWebhook, receberMensagem } = require('../controllers/whatsappController');

router.get('/webhook', verificarWebhook);
router.post('/webhook', receberMensagem);

module.exports = router;