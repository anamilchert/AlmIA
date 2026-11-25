const express = require('express');
const cors = require('cors');
const autenticar = require('./middlewares/autenticar');
const { health } = require('./controllers/healthController');

const app = express();

const ORIGENS_PADRAO = ['https://almia.pro', 'https://www.almia.pro', 'http://localhost:5173'];
const origens = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ORIGENS_PADRAO;

app.use(cors({ origin: origens }));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));

app.use('/api/clinic-config', autenticar, require('./routes/clinicConfig.routes'));
app.use('/api/pacientes', autenticar, require('./routes/pacienteRoutes'));
app.use('/api/conversas', autenticar, require('./routes/conversaRoutes'));
app.use('/api/agendamentos', autenticar, require('./routes/agendamentoRoutes'));
app.use('/api/dashboard', autenticar, require('./routes/dashboardRoutes'));

app.get('/api/health', health);

module.exports = app;