const Conversa = require('../models/Conversa');
const Paciente = require('../models/Paciente');
const { enviarMensagemWhatsapp } = require('../services/whatsappService');
const { avaliarHandoff, registrarAssunto, responderIA } = require('../services/handoffService');
const detectaIntencaoAgendamento = require('../utils/detectaIntencaoAgendamento');
const { buscarPacientePorTelefone, buscarPacientePorNome } = require('./pacienteController');

const STATUS_VALIDOS = ['ia', 'humano', 'concluida'];
const HANDOFF_NA_PRIMEIRA_FALA = false;

const SAUDACAO = 'Olá! Como posso ajudar você hoje?';
const PEDIR_NOME = 'Claro! Preciso do seu nome completo.';
const PEDIR_NASCIMENTO = 'Poderia informar sua data de nascimento?';
const DATA_INVALIDA = 'Não consegui entender a data. Pode informar no formato dd/mm/aaaa?';

function interpretarData(texto) {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const valida =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  if (!valida || data > new Date()) return null;
  return data;
}

function botDiz(conversa, texto) {
  conversa.mensagens.push({ remetente: 'bot', texto });
}

async function responderOuEncaminhar(conversa, { handoffEmFalha }) {
  const resposta = await responderIA(conversa, { handoffEmFalha });
  if (resposta) botDiz(conversa, resposta);
  return resposta;
}

async function salvarEResponder(conversa, res) {
  conversa.ultimaMensagemEm = new Date();
  await conversa.save();
  return res.json(conversa);
}

async function listarConversas(req, res) {
  try {
    const conversas = await Conversa.find({ ownerId: req.ownerId })
      .select('nome telefone status ultimaMensagemEm mensagens')
      .sort({ ultimaMensagemEm: -1 });

    const resumo = conversas.map((c) => ({
      _id: c._id,
      nome: c.nome,
      telefone: c.telefone,
      status: c.status,
      ultimaMensagemEm: c.ultimaMensagemEm,
      ultimaMensagem: c.mensagens[c.mensagens.length - 1]?.texto || ''
    }));

    res.json(resumo);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar conversas.' });
  }
}

async function listarHandoffs(req, res) {
  try {
    const conversas = await Conversa.find({ ownerId: req.ownerId, aguardandoHumano: true })
      .select('nome telefone motivoHandoff urgenciaHandoff handoffEm');

    const peso = { alta: 0, media: 1, baixa: 2 };
    const itens = conversas
      .map((c) => ({
        _id: c._id,
        nome: c.nome,
        telefone: c.telefone,
        motivo: c.motivoHandoff,
        urgencia: c.urgenciaHandoff || 'media',
        desde: c.handoffEm
      }))
      .sort((a, b) => peso[a.urgencia] - peso[b.urgencia] || new Date(a.desde) - new Date(b.desde));

    res.json({ total: itens.length, itens });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar handoffs.' });
  }
}

async function obterConversa(req, res) {
  try {
    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada.' });
    res.json(conversa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar conversa.' });
  }
}

async function criarConversa(req, res) {
  try {
    const { nome, telefone } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'Nome é obrigatório para iniciar uma conversa.' });
    }

    const pacienteExistente = await buscarPacientePorTelefone(telefone, req.ownerId);

    const novaConversa = await Conversa.create({
      ownerId: req.ownerId,
      nome: pacienteExistente ? pacienteExistente.nome : nome.trim(),
      telefone: telefone || '',
      pacienteId: pacienteExistente ? pacienteExistente._id : null,
      mensagens: []
    });

    res.status(201).json(novaConversa);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar conversa.', detalhes: err.message });
  }
}

async function enviarMensagem(req, res) {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Mensagem vazia.' });
    }

    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada.' });

    const textoLimpo = texto.trim();
    const primeiraFala = !conversa.mensagens.some((m) => m.remetente === 'bot');
    const avaliarHandoffAgora = HANDOFF_NA_PRIMEIRA_FALA || !primeiraFala;

    if (primeiraFala && !conversa.pacienteId && conversa.telefone) {
      const conhecido = await buscarPacientePorTelefone(conversa.telefone, req.ownerId);
      if (conhecido) {
        conversa.pacienteId = conhecido._id;
        conversa.nome = conhecido.nome;
      }
    }

    conversa.mensagens.push({ remetente: 'paciente', texto: textoLimpo });

    if (conversa.status !== 'ia') {
      return await salvarEResponder(conversa, res);
    }

        if (avaliarHandoffAgora) {
      if (await avaliarHandoff(conversa)) {
        return await salvarEResponder(conversa, res);
      }
    } else {
      await registrarAssunto(conversa);
    }

    if (conversa.estado === 'coletando_nome') {
      conversa.nome = textoLimpo;
      const existente = await buscarPacientePorNome(textoLimpo, req.ownerId);

      if (existente) {
        conversa.pacienteId = existente._id;
        conversa.estado = 'livre';
        conversa.mensagemPendente = null;
        await responderOuEncaminhar(conversa, { handoffEmFalha: true });
      } else {
        conversa.estado = 'coletando_nascimento';
        botDiz(conversa, PEDIR_NASCIMENTO);
      }
      return await salvarEResponder(conversa, res);
    }

    if (conversa.estado === 'coletando_nascimento') {
      const dataNascimento = interpretarData(textoLimpo);

      if (!dataNascimento) {
        botDiz(conversa, DATA_INVALIDA);
        return await salvarEResponder(conversa, res);
      }

      let paciente = await buscarPacientePorNome(conversa.nome, req.ownerId);
      if (!paciente) {
        paciente = await Paciente.create({
          ownerId: req.ownerId,
          nome: conversa.nome,
          telefone: conversa.telefone,
          dataNascimento,
          consultas: [],
          conversasResumo: []
        });
      }

      conversa.pacienteId = paciente._id;
      conversa.estado = 'livre';
      conversa.mensagemPendente = null;
      await responderOuEncaminhar(conversa, { handoffEmFalha: true });
      return await salvarEResponder(conversa, res);
    }

    if (detectaIntencaoAgendamento(textoLimpo) && !conversa.pacienteId) {
      conversa.estado = 'coletando_nome';
      conversa.mensagemPendente = textoLimpo;
      botDiz(conversa, PEDIR_NOME);
    } else {
      const resposta = await responderOuEncaminhar(conversa, { handoffEmFalha: avaliarHandoffAgora });
      if (!resposta && conversa.status === 'ia') botDiz(conversa, SAUDACAO);
    }

    return await salvarEResponder(conversa, res);
  } catch (err) {
    console.error('[Conversa] Erro ao enviar mensagem:', err);
    res.status(500).json({ erro: 'Erro ao enviar mensagem.', detalhes: err.message });
  }
}

async function removerConversa(req, res) {
  try {
    const removida = await Conversa.findOneAndDelete({ _id: req.params.id, ownerId: req.ownerId });
    if (!removida) return res.status(404).json({ erro: 'Conversa não encontrada.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao apagar conversa.' });
  }
}

async function responderComoAtendente(req, res) {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Mensagem vazia.' });
    }

    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada.' });

    const textoLimpo = texto.trim();
    conversa.mensagens.push({ remetente: 'humano', texto: textoLimpo });

    if (conversa.status === 'ia') {
      conversa.status = 'humano';
      conversa.handoffEm = conversa.handoffEm || new Date();
    }
    conversa.aguardandoHumano = false;

    conversa.ultimaMensagemEm = new Date();
    await conversa.save();

    if (conversa.telefone) {
      try {
        await enviarMensagemWhatsapp(conversa.telefone, textoLimpo);
      } catch (e) {
        console.error('Falha ao enviar ao WhatsApp:', e.message);
      }
    }

    res.json(conversa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao responder.', detalhes: err.message });
  }
}

async function atualizarStatus(req, res) {
  try {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada.' });

    conversa.status = status;
    conversa.aguardandoHumano = false;
    if (status === 'humano' && !conversa.handoffEm) conversa.handoffEm = new Date();
    if (status === 'concluida') conversa.encerradaEm = new Date();

    await conversa.save();
    res.json(conversa);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao atualizar status.', detalhes: err.message });
  }
}

module.exports = {
  listarConversas,
  listarHandoffs,
  obterConversa,
  criarConversa,
  enviarMensagem,
  responderComoAtendente,
  atualizarStatus,
  removerConversa
};