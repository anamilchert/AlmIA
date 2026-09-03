const express = require('express');
const router = express.Router();
const clinicConfigController = require('../controllers/clinicConfigController');

// MODO TESTE: sem authMiddleware por enquanto.
// const authMiddleware = require('../middlewares/authMiddleware');
// router.use(authMiddleware);

router.get('/', clinicConfigController.getConfig);
router.put('/', clinicConfigController.updateConfig);

module.exports = router;