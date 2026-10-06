const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clinic-config', require('./routes/clinicConfig.routes'));
app.use('/api/pacientes', require('./routes/pacienteRoutes'));
app.use('/api/conversas', require('./routes/conversaRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;