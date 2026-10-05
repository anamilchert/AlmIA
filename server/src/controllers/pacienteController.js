const Paciente = require('../models/Paciente');
const buildTimelinePaciente = require('../utils/buildTimelinePaciente');
const XLSX = require('xlsx');

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

async function buscarPacientePorTelefone(telefone) {
  if (!telefone) return null;
  return Paciente.findOne({ ownerId: OWNER_ID_TESTE, telefone });
}

async function buscarPacientePorNome(nome) {
  return Paciente.findOne({
    ownerId: OWNER_ID_TESTE,
    nome: { $regex: `^${nome.trim()}$`, $options: 'i' }
  });
}

async function importarPacientes(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const primeiraAba = workbook.SheetNames[0];
    const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

    const pacientesParaCriar = linhas
      .filter((l) => l.nome && l.nome.trim())
      .map((l) => ({
        ownerId: OWNER_ID_TESTE,
        nome: String(l.nome).trim(),
        telefone: l.telefone ? String(l.telefone).trim() : '',
        dataNascimento: l.dataNascimento ? new Date(l.dataNascimento) : undefined,
        cidade: l.cidade || '',
        email: l.email || '',
        planoSaude: l.operadora ? { operadora: l.operadora } : undefined
      }));

    if (pacientesParaCriar.length === 0) {
      return res.status(400).json({ erro: 'Nenhum paciente válido encontrado na planilha.' });
    }

    const criados = await Paciente.insertMany(pacientesParaCriar);
    res.status(201).json({ total: criados.length, pacientes: criados });
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao importar planilha.', detalhes: err.message });
  }
}

module.exports = {
  listarPacientes,
  obterPaciente,
  criarPaciente,
  buscarPacientePorTelefone,
  buscarPacientePorNome,
  importarPacientes
};