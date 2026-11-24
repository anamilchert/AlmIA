const ClinicConfig = require('../models/ClinicConfig');


exports.getConfig = async (req, res) => {
  try {
    const ownerId = req.ownerId;
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
    const ownerId = req.ownerId;
    const {
      dadosGerais,
      horarios,
      convenios,
      aceitaParticular,
      listaEspecialidades,
      medicos,
      preparoExames,
      mensagensBot,
      avancado,
    } = req.body;

    const updated = await ClinicConfig.findOneAndUpdate(
      { owner: ownerId },
      {
        $set: {
          ...(dadosGerais && { dadosGerais }),
          ...(horarios && { horarios }),
          ...(convenios && { convenios }),
          ...(typeof aceitaParticular === 'boolean' && { aceitaParticular }),
          ...(listaEspecialidades && { listaEspecialidades }),
          ...(medicos && { medicos }),
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

  const especialidadesTexto = (config.listaEspecialidades || []).join(', ');

  const aceitaParticular = config.aceitaParticular !== false;

    const medicosTexto = (config.medicos || [])
    .map((m) => {
      const titulo = m.especialidade ? `${m.nome} (${m.especialidade})` : m.nome;
      const partes = [];
      if (aceitaParticular) {
        const valor = Number.isFinite(m.valorConsulta)
          ? `R$ ${m.valorConsulta.toFixed(2).replace('.', ',')}`
          : 'valor não informado';
        partes.push(`consulta particular ${valor}`);
      }
      if (m.atendeConvenio === false || !(config.convenios || []).length) {
        partes.push('atende apenas particular');
      } else if ((m.convenios || []).length) {
        partes.push(`convênios aceitos: ${m.convenios.join(', ')}`);
      } else {
        partes.push(`convênios aceitos: ${config.convenios.join(', ')}`);
      }
      if (m.informacoesExtras) partes.push(`informações extras: ${m.informacoesExtras}`);
      return partes.length ? `- ${titulo}: ${partes.join('; ')}` : `- ${titulo}`;
    })
    .join('\n');
    
  const particularTexto = aceitaParticular
    ? 'a clínica atende particular'
    : 'a clínica NÃO atende particular, apenas convênios';

  return `
Nome da clínica: ${config.dadosGerais.nomeClinica}
Especialidades: ${especialidadesTexto}
Médicos:
${medicosTexto}
Endereço: ${config.dadosGerais.endereco}
Telefone: ${config.dadosGerais.telefonePrincipal}
Horário de funcionamento: ${horariosTexto}
Convênios aceitos: ${config.convenios.join(', ')}
Consulta particular: ${particularTexto}

Mensagem de boas-vindas padrão: ${config.mensagensBot.boasVindas}
Mensagem fora do horário: ${config.mensagensBot.foraHorario}

Preparo de exames:
${exemplosPreparo}
  `.trim();
};