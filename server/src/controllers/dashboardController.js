const Conversa = require('../models/Conversa');
const Agendamento = require('../models/Agendamento');

const TZ = 'America/Sao_Paulo';
const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDoDia(base = new Date()) {
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(base);
  return new Date(`${dia}T00:00:00-03:00`);
}

async function contarPeriodo(ownerId, inicio, fim) {
  const periodo = { $gte: inicio, $lt: fim };
  const [conversas, semHandoff, handoffs] = await Promise.all([
    Conversa.countDocuments({ ownerId, createdAt: periodo }),
    Conversa.countDocuments({ ownerId, createdAt: periodo, handoffEm: null }),
    Conversa.countDocuments({ ownerId, handoffEm: periodo })
  ]);

  return {
    conversas,
    handoffs,
    resolvidas: conversas ? Math.round((semHandoff / conversas) * 100) : 0
  };
}

function calcularTempoMedioRespostaSeg(conversas, inicio) {
  const tempos = [];

  conversas.forEach((conversa) => {
    let aguardandoDesde = null;
    conversa.mensagens.forEach((m) => {
      const quando = new Date(m.data).getTime();
      if (m.remetente === 'paciente') {
        if (aguardandoDesde === null) aguardandoDesde = quando;
      } else if (aguardandoDesde !== null) {
        if (aguardandoDesde >= inicio.getTime()) tempos.push((quando - aguardandoDesde) / 1000);
        aguardandoDesde = null;
      }
    });
  });

  if (!tempos.length) return null;
  const media = tempos.reduce((soma, t) => soma + t, 0) / tempos.length;
  return Math.round(media * 10) / 10;
}

async function obterMetricas(req, res) {
  try {
    const inicio = inicioDoDia();
    const fimHoje = new Date(inicio.getTime() + DIA_MS);
    const inicioOntem = new Date(inicio.getTime() - DIA_MS);
    const inicioSemana = new Date(inicio.getTime() - 6 * DIA_MS);

    const [
      hoje,
      ontem,
      conversasDoDia,
      porHoraRaw,
      assuntos,
      agendamentosIAHoje,
      agendamentosIA,
      handoffsRecentes
    ] = await Promise.all([
      contarPeriodo(inicio, fimHoje),
      contarPeriodo(inicioOntem, inicio),
      Conversa.find({ ownerId: req.ownerId, ultimaMensagemEm: { $gte: inicio } }).select('mensagens'),
      Conversa.aggregate([
        { $match: { ownerId: req.ownerId, createdAt: { $gte: inicio } } },
        {
          $group: {
            _id: {
              hora: { $hour: { date: '$createdAt', timezone: TZ } },
              tipo: { $cond: [{ $eq: ['$handoffEm', null] }, 'ia', 'humano'] }
            },
            total: { $sum: 1 }
          }
        }
      ]),
      Conversa.aggregate([
        { $match: { ownerId: req.ownerId, createdAt: { $gte: inicioSemana } } },
        { $group: { _id: { $ifNull: ['$assunto', 'outro'] }, total: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Agendamento.countDocuments({ ownerId: req.ownerId, origem: 'ia', createdAt: { $gte: inicio } }),
      Agendamento.find({ ownerId: req.ownerId, origem: 'ia' }).sort({ createdAt: -1 }).limit(5),
      Conversa.find({ ownerId: req.ownerId, handoffEm: { $ne: null } })
        .sort({ handoffEm: -1 })
        .limit(5)
        .select('nome motivoHandoff handoffEm aguardandoHumano')
    ]);

    const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, ia: 0, humano: 0 }));
    porHoraRaw.forEach(({ _id, total }) => {
      porHora[_id.hora][_id.tipo] += total;
    });

    res.json({
      conversasHoje: hoje.conversas,
      conversasOntem: ontem.conversas,
      resolvidasPelaIA: hoje.resolvidas,
      resolvidasPelaIAOntem: ontem.resolvidas,
      handoffsHoje: hoje.handoffs,
      handoffsOntem: ontem.handoffs,
      tempoMedioRespostaSeg: calcularTempoMedioRespostaSeg(conversasDoDia, inicio),
      agendamentosIAHoje,
      porHora,
      assuntosSemana: assuntos.map(({ _id, total }) => ({ assunto: _id, total })),
      agendamentosIA: agendamentosIA.map((a) => ({
        _id: a._id,
        nome: a.nome,
        especialidade: a.especialidade,
        medico: a.medico,
        data: a.data,
        status: a.status
      })),
      handoffsRecentes: handoffsRecentes.map((c) => ({
        _id: c._id,
        nome: c.nome,
        motivo: c.motivoHandoff,
        desde: c.handoffEm,
        aberto: Boolean(c.aguardandoHumano)
      }))
    });
  } catch (err) {
    console.error('[Dashboard] Erro ao calcular métricas:', err);
    res.status(500).json({ erro: 'Erro ao calcular métricas.' });
  }
}

module.exports = { obterMetricas };