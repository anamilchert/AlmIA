const ClinicConfig = require('../models/ClinicConfig');

const OWNER_ID_TESTE = 'owner-teste-001';

exports.getConfig = async (req, res) => {
  try {
    const ownerId = req.userId || OWNER_ID_TESTE;
    let config = await ClinicConfig.findOne({ owner: ownerId });

    if (!config) {
      config = await ClinicConfig.create({
        owner: ownerId,
        dadosGerais: { nomeClinica: '' },
      });
    }

    return res.status(200).json(config);
  } catch (err) {
    console.error('Erro ao buscar configuração da clínica:', err);
    return res.status(500).json({ message: 'Erro ao buscar configuração da clínica.' });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const ownerId = req.userId || OWNER_ID_TESTE;
    const { dadosGerais, horarios, convenios, preparoExames, mensagensBot, avancado } = req.body;

    const updated = await ClinicConfig.findOneAndUpdate(
      { owner: ownerId },
      {
        $set: {
          ...(dadosGerais && { dadosGerais }),
          ...(horarios && { horarios }),
          ...(convenios && { convenios }),
          ...(preparoExames && { preparoExames }),
          ...(mensagensBot && { mensagensBot }),
          ...(avancado && { avancado }),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Erro ao salvar configuração da clínica:', err);
    return res.status(500).json({ message: 'Erro ao salvar configuração da clínica.' });
  }
};

exports.buildContextoParaIA = async (ownerId) => {
  const config = await ClinicConfig.findOne({ owner: ownerId });
  if (!config) return '';

  const horariosTexto = config.horarios
    .filter((h) => h.ativo)
    .map((h) => `${h.dia}: ${h.abertura}–${h.fechamento}`)
    .join(', ');

  const exemplosPreparo = config.preparoExames
    .map((ex) => `- ${ex.nome}: ${ex.instrucoes}`)
    .join('\n');

  return `
Nome da clínica: ${config.dadosGerais.nomeClinica}
Especialidades: ${config.dadosGerais.especialidades}
Endereço: ${config.dadosGerais.endereco}
Telefone: ${config.dadosGerais.telefonePrincipal}
Horário de funcionamento: ${horariosTexto}
Convênios aceitos: ${config.convenios.join(', ')}

Mensagem de boas-vindas padrão: ${config.mensagensBot.boasVindas}
Mensagem fora do horário: ${config.mensagensBot.foraHorario}

Preparo de exames:
${exemplosPreparo}
  `.trim();
};