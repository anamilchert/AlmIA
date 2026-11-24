const express = require('express');
const router = express.Router();
const clinicConfigController = require('../controllers/clinicConfigController');
const { exigirPapel } = require('../middlewares/autenticar');

router.get('/', clinicConfigController.getConfig);
router.put('/', exigirPapel('gestor'), clinicConfigController.updateConfig);

module.exports = router;