require('dotenv').config();
if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});