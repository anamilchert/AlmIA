const Agendamento = require('../models/Agendamento');
const ClinicConfig = require('../models/ClinicConfig');

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PASSO_MINUTOS = 30;
const FUSO = '-03:00';
const MAX_DIAS_A_FRENTE = 90;
const MINUTO = 60 * 1000;
const DIA_MS = 24 * 60 * MINUTO;
const STATUS_OCUPADOS = ['pendente', 'confirmado'];
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const ferramentas = [
  {
    type: 'function',
    function: {
      name: 'consultar_horarios_livres',
      description:
        'Lista os horários livres para consulta em uma data. Use sempre antes de sugerir ou confirmar horários.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data no formato AAAA-MM-DD' },
          especialidade: { type: 'string', description: 'Especialidade desejada. Pode omitir se a clínica tiver apenas uma' },
          medico: { type: 'string', description: 'Nome do médico, apenas se o paciente pediu um específico' }
        },
        required: ['data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'criar_agendamento',
      description:
        'Cria o agendamento de uma consulta. Só chame depois de o paciente escolher dia e horário.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data no formato AAAA-MM-DD' },
          hora: { type: 'string', description: 'Horário no formato HH:mm' },
          especialidade: { type: 'string', description: 'Especialidade da consulta. Pode omitir se a clínica tiver apenas uma' },
          medico: { type: 'string', description: 'Nome do médico, apenas se o paciente pediu um específico' },
          nome_completo: {
            type: 'string',
            description: 'Nome completo do paciente. Obrigatório somente quando o paciente ainda não é cadastrado'
          }
        },
        required: ['data', 'hora']
      }
    }
  }
];

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function dataLocal(dia, hora) {
  return new Date(`${dia}T${hora}:00${FUSO}`);
}

function diaValido(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia || '')) return false;
  const d = dataLocal(dia, '12:00');
  if (Number.isNaN(d.getTime())) return false;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === dia;
}

function paraMinutos(hora) {
  const [h, m] = String(hora || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function gerarHorarios(abertura, fechamento) {
  const inicio = paraMinutos(abertura);
  const fim = paraMinutos(fechamento);
  if (inicio === null || fim === null) return [];
  const horarios = [];
  for (let m = inicio; m + PASSO_MINUTOS <= fim; m += PASSO_MINUTOS) {
    horarios.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return horarios;
}

function acharPorNome(lista, texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  return (
    lista.find((item) => normalizar(item) === alvo) ||
    lista.find((item) => normalizar(item).includes(alvo)) ||
    null
  );
}

async function prepararDia(ownerId, { data, especialidade, medico }) {
  if (!diaValido(data)) return { erro: 'Data inválida. Use o formato AAAA-MM-DD.' };

  const agora = Date.now();
  if (dataLocal(data, '23:59').getTime() < agora) return { erro: 'Essa data já passou.' };
  if (dataLocal(data, '00:00').getTime() > agora + MAX_DIAS_A_FRENTE * DIA_MS) {
    return { erro: `Só é possível agendar até ${MAX_DIAS_A_FRENTE} dias à frente.` };
  }

  const config = await ClinicConfig.findOne({ owner: ownerId });
  if (!config) return { erro: 'A clínica ainda não configurou os horários de atendimento.' };

  const lista = config.listaEspecialidades || [];
  const informada = normalizar(especialidade) ? especialidade : lista.length === 1 ? lista[0] : '';
  let especialidadeFinal = informada;
  if (lista.length) {
    especialidadeFinal = acharPorNome(lista, informada);
    if (!especialidadeFinal) {
      return {
        erro: informada
          ? `Especialidade não encontrada. Disponíveis: ${lista.join(', ')}.`
          : `Informe a especialidade. Disponíveis: ${lista.join(', ')}.`
      };
    }
  } else if (!informada) {
    return { erro: 'Informe a especialidade.' };
  }

  const doutores = (config.medicos || [])
    .filter((m) => normalizar(m.especialidade) === normalizar(especialidadeFinal))
    .map((m) => m.nome);

  let candidatos = doutores;
  if (medico) {
    const achado = acharPorNome(doutores, medico);
    if (!achado) {
      return {
        erro: doutores.length
          ? `Médico não encontrado nessa especialidade. Disponíveis: ${doutores.join(', ')}.`
          : 'Não há médicos cadastrados nessa especialidade.'
      };
    }
    candidatos = [achado];
  }

  const diaSemana = DIAS[dataLocal(data, '12:00').getUTCDay()];
  const janela = (config.horarios || []).find((h) => h.dia === diaSemana);
  if (!janela || !janela.ativo) return { erro: `A clínica não atende em ${diaSemana}.` };

  const inicioDia = dataLocal(data, '00:00');
  const ocupados = await Agendamento.find({
    ownerId,
    status: { $in: STATUS_OCUPADOS },
    data: { $gte: inicioDia, $lt: new Date(inicioDia.getTime() + DIA_MS) }
  });

  return { especialidade: especialidadeFinal, candidatos, janela, ocupados, diaSemana };
}

function medicoLivre(ocupados, { inicio, fim, especialidade, candidatos }) {
  const sobrepoe = (a) => {
    const ai = new Date(a.data).getTime();
    const af = ai + (a.duracaoMinutos || PASSO_MINUTOS) * MINUTO;
    return ai < fim && af > inicio;
  };

  if (!candidatos.length) {
    const ocupado = ocupados.some(
      (a) => sobrepoe(a) && normalizar(a.especialidade) === normalizar(especialidade)
    );
    return ocupado ? null : '';
  }

  const livre = candidatos.find(
    (m) => !ocupados.some((a) => sobrepoe(a) && normalizar(a.medico) === normalizar(m))
  );
  return livre === undefined ? null : livre;
}

async function horariosLivres(ownerId, params) {
  const preparado = await prepararDia(ownerId, params);
  if (preparado.erro) return { erro: preparado.erro };

  const { especialidade, candidatos, janela, ocupados, diaSemana } = preparado;
  const agora = Date.now();

  const horarios = gerarHorarios(janela.abertura, janela.fechamento).filter((hora) => {
    const inicio = dataLocal(params.data, hora).getTime();
    if (inicio <= agora) return false;
    return (
      medicoLivre(ocupados, { inicio, fim: inicio + PASSO_MINUTOS * MINUTO, especialidade, candidatos }) !==
      null
    );
  });

  return { data: params.data, dia_semana: diaSemana, especialidade, horarios };
}

async function agendar(ownerId, contato, params) {
  if (!REGEX_HORA.test(params.hora || '')) return { erro: 'Hora inválida. Use o formato HH:mm.' };

  const preparado = await prepararDia(ownerId, params);
  if (preparado.erro) return { erro: preparado.erro };

  const { especialidade, candidatos, janela, ocupados, diaSemana } = preparado;

  if (!gerarHorarios(janela.abertura, janela.fechamento).includes(params.hora)) {
    return { erro: 'Esse horário está fora do funcionamento da clínica.' };
  }

  const inicioDate = dataLocal(params.data, params.hora);
  const inicio = inicioDate.getTime();
  if (inicio <= Date.now()) return { erro: 'Esse horário já passou.' };

  const medico = medicoLivre(ocupados, {
    inicio,
    fim: inicio + PASSO_MINUTOS * MINUTO,
    especialidade,
    candidatos
  });
  if (medico === null) return { erro: 'Esse horário não está mais disponível.' };

  const nome = contato.pacienteId ? contato.nome : String(params.nome_completo || '').trim();
  if (!nome) return { erro: 'Informe o nome completo do paciente para agendar.' };

  if (contato.telefone) {
    const duplicado = await Agendamento.findOne({
      ownerId,
      telefone: contato.telefone,
      status: { $in: STATUS_OCUPADOS },
      data: inicioDate
    });
    if (duplicado) return { erro: 'O paciente já tem um agendamento nesse horário.' };
  }

  await Agendamento.create({
    ownerId,
    pacienteId: contato.pacienteId || null,
    nome,
    telefone: contato.telefone || '',
    especialidade,
    medico,
    data: inicioDate,
    duracaoMinutos: PASSO_MINUTOS,
    status: 'confirmado',
    origem: 'ia'
  });

  return {
    ok: true,
    especialidade,
    medico: medico || null,
    data: params.data.split('-').reverse().join('/'),
    hora: params.hora,
    dia_semana: diaSemana
  };
}

async function regrasDeEscolha(ownerId) {
  const config = await ClinicConfig.findOne({ owner: ownerId });
  if (!config) return '';

  const lista = config.listaEspecialidades || [];
  const medicos = config.medicos || [];

  if (lista.length <= 1 && medicos.length <= 1) {
    const especialidade = lista[0] || (medicos[0] && medicos[0].especialidade) || '';
    const medico = (medicos[0] && medicos[0].nome) || '';
    const partes = [
      especialidade ? `a especialidade ${especialidade}` : 'uma única especialidade',
      medico ? `o médico ${medico}` : ''
    ].filter(Boolean);
    return `Esta clínica tem apenas ${partes.join(' e ')}. Não pergunte especialidade nem médico. Se o paciente ainda não disse dia e horário, consulte os próximos dias com consultar_horarios_livres e ofereça os 3 primeiros horários livres. Agende assim que ele escolher.`;
  }

  const regras = [];

  if (lista.length > 1) {
    regras.push(
      `Especialidades disponíveis: ${lista.join(', ')}. Se o paciente não disse qual quer, pergunte a especialidade.`
    );
  } else if (lista.length === 1) {
    regras.push(`A única especialidade é ${lista[0]}; não pergunte qual especialidade.`);
  }

  const porEspecialidade = medicos
    .filter((m) => m.especialidade)
    .reduce((acc, m) => {
      acc[m.especialidade] = acc[m.especialidade] || [];
      acc[m.especialidade].push(m.nome);
      return acc;
    }, {});

  const descricao = Object.entries(porEspecialidade)
    .map(([esp, nomes]) => `${esp}: ${nomes.join(', ')}`)
    .join('; ');

  regras.push(
    `Médicos por especialidade: ${descricao || 'não informado'}. Depois de definida a especialidade, se ela tiver mais de um médico, pergunte se o paciente tem preferência por algum e, se não tiver, agende sem informar médico. Se tiver só um médico, não pergunte.`
  );

  return regras.join(' ');
}

async function executarFerramenta(nome, args, { ownerId, contato }) {
  try {
    if (nome === 'consultar_horarios_livres') return await horariosLivres(ownerId, args);
    if (nome === 'criar_agendamento') return await agendar(ownerId, contato || {}, args);
    return { erro: `Ferramenta desconhecida: ${nome}` };
  } catch (e) {
    console.error('[Agenda IA] Erro na ferramenta', nome, '-', e.message);
    return { erro: 'Não foi possível acessar a agenda agora.' };
  }
}

module.exports = { ferramentas, executarFerramenta, horariosLivres, agendar, regrasDeEscolha };