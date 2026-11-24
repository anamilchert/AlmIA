const Agendamento = require('../models/Agendamento');
  const { finalizarAgendamentosVencidos } = require('../services/finalizarAgendamentos');

const STATUS_VALIDOS = ['pendente', 'confirmado', 'cancelado', 'concluido', 'nao_compareceu'];

async function listarAgendamentos(req, res) {
  try {
         try {
        await finalizarAgendamentosVencidos(req.ownerId);
      } catch (e) {
        console.error('Falha ao finalizar agendamentos vencidos:', e.message);
      }
    const { status, inicio, fim } = req.query;
    const filtro = { ownerId: req.ownerId };
    if (status) filtro.status = status;
    if (inicio || fim) {
      filtro.data = {};
      if (inicio) filtro.data.$gte = new Date(inicio);
      if (fim) filtro.data.$lte = new Date(fim);
    }
    const agendamentos = await Agendamento.find(filtro).sort({ data: 1 });
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar agendamentos.' });
  }
}

async function criarAgendamento(req, res) {
  try {
    const { nome, especialidade, data } = req.body;
    if (!nome || !especialidade || !data) {
      return res.status(400).json({ erro: 'Nome, especialidade e data são obrigatórios.' });
    }
    const novo = await Agendamento.create({ ...req.body, ownerId: req.ownerId });
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar agendamento.', detalhes: err.message });
  }
}

async function atualizarStatus(req, res) {
  try {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }
    const atualizado = await Agendamento.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.ownerId },
      { status },
      { new: true }
    );
    if (!atualizado) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
}

async function removerAgendamento(req, res) {
  try {
    const removido = await Agendamento.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.ownerId
    });
    if (!removido) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir agendamento.' });
  }
}

module.exports = { listarAgendamentos, criarAgendamento, atualizarStatus, removerAgendamento };