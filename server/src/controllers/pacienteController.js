const Paciente = require('../models/Paciente');
const buildTimelinePaciente = require('../utils/buildTimelinePaciente');

const OWNER_ID_TESTE = 'owner-teste-001'; // TODO: substituir por req.userId

async function listarPacientes(req, res) {
  try {
    const pacientes = await Paciente.find({ ownerId: OWNER_ID_TESTE })
      .select('nome telefone planoSaude.operadora dataCadastro');
    res.json(pacientes);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pacientes.' });
  }
}

async function obterPaciente(req, res) {
  try {
    const paciente = await Paciente.findOne({
      _id: req.params.id,
      ownerId: OWNER_ID_TESTE
    });

    if (!paciente) {
      return res.status(404).json({ erro: 'Paciente não encontrado.' });
    }

    res.json({
      paciente,
      timeline: buildTimelinePaciente(paciente),
      stats: {
        consultas: paciente.consultas.length,
        conversas: paciente.conversasResumo.length,
        especialidades: [...new Set(paciente.consultas.map(c => c.especialidade))].length,
        emAberto: paciente.conversasResumo.filter(c => c.duracaoMinutos === null).length
      }
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar paciente.' });
  }
}

async function criarPaciente(req, res) {
  try {
    const novoPaciente = await Paciente.create({
      ...req.body,
      ownerId: OWNER_ID_TESTE
    });
    res.status(201).json(novoPaciente);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar paciente.', detalhes: err.message });
  }
}

module.exports = { listarPacientes, obterPaciente, criarPaciente };