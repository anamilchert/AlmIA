const { obterMetricas } = require('../controllers/dashboardController');

router.get('/metricas', obterMetricas);