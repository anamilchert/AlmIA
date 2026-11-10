const Conversa = require('../models/Conversa');

const OWNER_ID_TESTE = 'owner-teste-001';
const TZ = 'America/Sao_Paulo';

function inicioDoDia() {
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  return new Date(`${dia}T00:00:00-03:00`);
}

async function obterMetricas(req, res) {
  try {
    const inicio = inicioDoDia();
    const hoje = { ownerId: OWNER_ID_TESTE, createdAt: { $gte: inicio } };

    const [conversasHoje, semHandoff, handoffsHoje, porHoraRaw] = await Promise.all([
      Conversa.countDocuments(hoje),
      Conversa.countDocuments({ ...hoje, handoffEm: null }),
      Conversa.countDocuments({ ownerId: OWNER_ID_TESTE, handoffEm: { $gte: inicio } }),
      Conversa.aggregate([
        { $match: hoje },
        {
          $group: {
            _id: {
              hora: { $hour: { date: '$createdAt', timezone: TZ } },
              tipo: { $cond: [{ $eq: ['$handoffEm', null] }, 'ia', 'humano'] }
            },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, ia: 0, humano: 0 }));
    porHoraRaw.forEach(({ _id, total }) => { porHora[_id.hora][_id.tipo] += total; });

    res.json({
      conversasHoje,
      resolvidasPelaIA: conversasHoje ? Math.round((semHandoff / conversasHoje) * 100) : 0,
      handoffsHoje,
      tempoMedioRespostaSeg: null,
      porHora
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao calcular métricas.' });
  }
}

module.exports = { obterMetricas };