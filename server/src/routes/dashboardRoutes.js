const express = require('express');
const router = express.Router();
const { obterMetricas } = require('../controllers/dashboardController');

router.get('/metricas', obterMetricas);

module.exports = router;