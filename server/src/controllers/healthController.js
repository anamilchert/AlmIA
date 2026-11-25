const mongoose = require('mongoose');

function health(req, res) {
  const bancoOk = mongoose.connection.readyState === 1;
  res.status(bancoOk ? 200 : 503).json({
    status: bancoOk ? 'ok' : 'indisponivel',
    banco: bancoOk ? 'conectado' : 'desconectado',
    uptime: Math.round(process.uptime()),
  });
}

module.exports = { health };