const Conversa = require('../models/Conversa');
const Paciente = require('../models/Paciente');
const { gerarResposta } = require('../services/openaiService');
const detectaIntencaoAgendamento = require('../utils/detectaIntencaoAgendamento');
const { buscarPacientePorTelefone, buscarPacientePorNome } = require('./pacienteController');

const OWNER_ID_TESTE = 'owner-teste-001';

async function listarConversas(req, res) {
  try {
    const conversas = await Conversa.find({ ownerId: OWNER_ID_TESTE })
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

async function obterConversa(req, res) {
  try {
    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: OWNER_ID_TESTE });
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

    // vínculo automático e silencioso, se o telefone já for de um paciente conhecido
    const pacienteExistente = await buscarPacientePorTelefone(telefone);

    const novaConversa = await Conversa.create({
      ownerId: OWNER_ID_TESTE,
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

    const conversa = await Conversa.findOne({ _id: req.params.id, ownerId: OWNER_ID_TESTE });
    if (!conversa) return res.status(404).json({ erro: 'Conversa não encontrada.' });

    conversa.mensagens.push({ remetente: 'paciente', texto: texto.trim() });

    // --- ETAPA: coletando nome (só entra aqui se uma intenção já disparou isso) ---
    if (conversa.estado === 'coletando_nome') {
      const nomeInformado = texto.trim();
      const pacienteExistente = await buscarPacientePorNome(nomeInformado);
      conversa.nome = nomeInformado;

      if (pacienteExistente) {
        conversa.pacienteId = pacienteExistente._id;
        conversa.estado = 'livre';
        conversa.mensagens.push({
          remetente: 'bot',
          texto: `Encontrei seu cadastro, ${pacienteExistente.nome.split(' ')[0]}! Só um instante...`
        });
        await resolverPedidoPendente(conversa);
      } else {
        conversa.estado = 'coletando_nascimento';
        conversa.mensagens.push({
          remetente: 'bot',
          texto: 'Não encontrei seu cadastro. Pra continuar, poderia informar sua data de nascimento? (dd/mm/aaaa)'
        });
      }

      conversa.ultimaMensagemEm = new Date();
      await conversa.save();
      return res.json(conversa);
    }

    // --- ETAPA: coletando nascimento ---
    if (conversa.estado === 'coletando_nascimento') {
      const [dia, mes, ano] = texto.trim().split('/');
      const dataNascimento = ano ? new Date(`${ano}-${mes}-${dia}`) : null;

      if (!dataNascimento || isNaN(dataNascimento)) {
        conversa.mensagens.push({
          remetente: 'bot',
          texto: 'Não consegui entender a data. Pode informar no formato dd/mm/aaaa?'
        });
        conversa.ultimaMensagemEm = new Date();
        await conversa.save();
        return res.json(conversa);
      }

      const novoPaciente = await Paciente.create({
        ownerId: OWNER_ID_TESTE,
        nome: conversa.nome,
        telefone: conversa.telefone,
        dataNascimento,
        consultas: [],
        conversasResumo: []
      });

      conversa.pacienteId = novoPaciente._id;
      conversa.estado = 'livre';
      conversa.mensagens.push({
        remetente: 'bot',
        texto: `Cadastro concluído, ${conversa.nome.split(' ')[0]}! Só um instante...`
      });

      await resolverPedidoPendente(conversa);

      conversa.ultimaMensagemEm = new Date();
      await conversa.save();
      return res.json(conversa);
    }

    // --- FLUXO NORMAL: responde direto, sem interromper ---
    const precisaIdentificar = detectaIntencaoAgendamento(texto) && !conversa.pacienteId;

    if (precisaIdentificar) {
      conversa.estado = 'coletando_nome';
      conversa.mensagemPendente = texto.trim();
      conversa.mensagens.push({
        remetente: 'bot',
        texto: 'Claro! Pra localizar ou criar seu agendamento, preciso confirmar seu nome completo primeiro.'
      });
    } else if (conversa.status === 'ia') {
      const respostaIA = await gerarResposta(conversa.mensagens);
      conversa.mensagens.push({ remetente: 'bot', texto: respostaIA });
    }

    conversa.ultimaMensagemEm = new Date();
    await conversa.save();
    res.json(conversa);

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao enviar mensagem.', detalhes: err.message });
  }
}

// depois de identificar o paciente, retoma o pedido original (ex: "quero agendar...")
async function resolverPedidoPendente(conversa) {
  if (!conversa.mensagemPendente) return;

  const respostaIA = await gerarResposta(conversa.mensagens);
  conversa.mensagens.push({ remetente: 'bot', texto: respostaIA });
  conversa.mensagemPendente = null;
}

module.exports = { listarConversas, obterConversa, criarConversa, enviarMensagem };