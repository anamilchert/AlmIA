jest.mock('../../src/models/Conversa', () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/Paciente', () => ({ create: jest.fn() }));
jest.mock('../../src/services/openaiService', () => ({ gerarResposta: jest.fn() }));
jest.mock('../../src/services/whatsappService', () => ({ enviarMensagemWhatsapp: jest.fn() }));
jest.mock('../../src/controllers/pacienteController', () => ({
  buscarPacientePorTelefone: jest.fn(),
  buscarPacientePorNome: jest.fn(),
}));
jest.mock('../../src/utils/detectaIntencaoAgendamento', () => jest.fn());

const Conversa = require('../../src/models/Conversa');
const Paciente = require('../../src/models/Paciente');
const { gerarResposta } = require('../../src/services/openaiService');
const { enviarMensagemWhatsapp } = require('../../src/services/whatsappService');
const { buscarPacientePorTelefone, buscarPacientePorNome } = require('../../src/controllers/pacienteController');
const detectaIntencaoAgendamento = require('../../src/utils/detectaIntencaoAgendamento');
const {
  listarConversas, obterConversa, criarConversa, enviarMensagem,
  responderComoAtendente, atualizarStatus,
} = require('../../src/controllers/conversaController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function fabricarConversa(extra = {}) {
  return {
    status: 'ia', estado: 'livre', handoffEm: null, pacienteId: null, mensagemPendente: null,
    nome: 'Maria Silva', telefone: '5511987654321', mensagens: [], save: jest.fn(), ...extra,
  };
}

const reqComId = (body) => ({ params: { id: '1' }, body });

beforeEach(() => jest.resetAllMocks());

describe('listarConversas', () => {
  it('resume cada conversa com a última mensagem', async () => {
    Conversa.find.mockReturnValue({
      select: () => ({
        sort: () => Promise.resolve([
          { _id: 'a', nome: 'Maria', telefone: '1', status: 'ia', ultimaMensagemEm: 'd1', mensagens: [{ texto: 'Oi' }, { texto: 'Tudo bem?' }] },
          { _id: 'b', nome: 'João', telefone: '2', status: 'humano', ultimaMensagemEm: 'd2', mensagens: [] },
        ]),
      }),
    });
    const res = criarRes();
    await listarConversas({}, res);
    const resumo = res.json.mock.calls[0][0];
    expect(resumo[0].ultimaMensagem).toBe('Tudo bem?');
    expect(resumo[1].ultimaMensagem).toBe('');
  });

  it('responde 500 se o banco falhar', async () => {
    Conversa.find.mockImplementation(() => { throw new Error('banco'); });
    const res = criarRes();
    await listarConversas({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('obterConversa', () => {
  it('devolve a conversa encontrada', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    const res = criarRes();
    await obterConversa({ params: { id: '1' } }, res);
    expect(res.json).toHaveBeenCalledWith(conversa);
  });

  it('retorna 404 quando não existe', async () => {
    Conversa.findOne.mockResolvedValue(null);
    const res = criarRes();
    await obterConversa({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 se o banco falhar', async () => {
    Conversa.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await obterConversa({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('criarConversa', () => {
  it('exige o nome', async () => {
    const res = criarRes();
    await criarConversa({ body: { nome: '  ' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('vincula o paciente cadastrado pelo telefone e usa o nome do cadastro', async () => {
    buscarPacientePorTelefone.mockResolvedValue({ _id: 'p1', nome: 'Maria Silva' });
    Conversa.create.mockResolvedValue({ _id: 'c1' });
    const res = criarRes();
    await criarConversa({ body: { nome: 'maria', telefone: '5511987654321' } }, res);
    expect(Conversa.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Maria Silva', pacienteId: 'p1' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('cria sem vínculo quando o telefone não é de paciente', async () => {
    buscarPacientePorTelefone.mockResolvedValue(null);
    Conversa.create.mockResolvedValue({ _id: 'c1' });
    await criarConversa({ body: { nome: 'Novo Contato' } }, criarRes());
    expect(Conversa.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Novo Contato', pacienteId: null, telefone: '' })
    );
  });

  it('responde 400 se a criação falhar', async () => {
    buscarPacientePorTelefone.mockResolvedValue(null);
    Conversa.create.mockRejectedValue(new Error('inválido'));
    const res = criarRes();
    await criarConversa({ body: { nome: 'X' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('enviarMensagem', () => {
  it('rejeita mensagem vazia', async () => {
    const res = criarRes();
    await enviarMensagem(reqComId({ texto: ' ' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a conversa não existe', async () => {
    Conversa.findOne.mockResolvedValue(null);
    const res = criarRes();
    await enviarMensagem(reqComId({ texto: 'Oi' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responde pela IA no fluxo normal', async () => {
    const conversa = fabricarConversa({ pacienteId: 'p1' });
    Conversa.findOne.mockResolvedValue(conversa);
    gerarResposta.mockResolvedValue('Resposta da IA');
    await enviarMensagem(reqComId({ texto: 'Qual o horário?' }), criarRes());
    expect(conversa.mensagens.map((m) => m.remetente)).toEqual(['paciente', 'bot']);
    expect(conversa.mensagens[1].texto).toBe('Resposta da IA');
  });

  it('não aciona a IA quando um humano está atendendo', async () => {
    const conversa = fabricarConversa({ status: 'humano' });
    Conversa.findOne.mockResolvedValue(conversa);
    await enviarMensagem(reqComId({ texto: 'Oi' }), criarRes());
    expect(gerarResposta).not.toHaveBeenCalled();
    expect(conversa.mensagens).toHaveLength(1);
  });

  it('pede identificação ao detectar intenção de agendamento sem paciente vinculado', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    detectaIntencaoAgendamento.mockReturnValue(true);
    await enviarMensagem(reqComId({ texto: 'Quero agendar' }), criarRes());
    expect(conversa.estado).toBe('coletando_nome');
    expect(conversa.mensagemPendente).toBe('Quero agendar');
    expect(gerarResposta).not.toHaveBeenCalled();
  });

  it('coletando nome: vincula o paciente encontrado e retoma o pedido pendente', async () => {
    const conversa = fabricarConversa({ estado: 'coletando_nome', mensagemPendente: 'Quero agendar' });
    Conversa.findOne.mockResolvedValue(conversa);
    buscarPacientePorNome.mockResolvedValue({ _id: 'p1', nome: 'Maria Silva' });
    gerarResposta.mockResolvedValue('Vou te ajudar a agendar');
    await enviarMensagem(reqComId({ texto: 'Maria Silva' }), criarRes());
    expect(conversa.pacienteId).toBe('p1');
    expect(conversa.estado).toBe('livre');
    expect(conversa.mensagemPendente).toBeNull();
    expect(conversa.mensagens.at(-1).texto).toBe('Vou te ajudar a agendar');
  });

  it('coletando nome: pede a data de nascimento quando não há cadastro', async () => {
    const conversa = fabricarConversa({ estado: 'coletando_nome' });
    Conversa.findOne.mockResolvedValue(conversa);
    buscarPacientePorNome.mockResolvedValue(null);
    await enviarMensagem(reqComId({ texto: 'Ana Nova' }), criarRes());
    expect(conversa.estado).toBe('coletando_nascimento');
    expect(conversa.nome).toBe('Ana Nova');
  });

  it('coletando nascimento: pede de novo quando a data é inválida', async () => {
    const conversa = fabricarConversa({ estado: 'coletando_nascimento' });
    Conversa.findOne.mockResolvedValue(conversa);
    await enviarMensagem(reqComId({ texto: 'abc' }), criarRes());
    expect(Paciente.create).not.toHaveBeenCalled();
    expect(conversa.mensagens.at(-1).texto).toContain('dd/mm/aaaa');
  });

  it('coletando nascimento: cadastra o paciente e retoma o pedido', async () => {
    const conversa = fabricarConversa({ estado: 'coletando_nascimento', mensagemPendente: 'Quero agendar' });
    Conversa.findOne.mockResolvedValue(conversa);
    Paciente.create.mockResolvedValue({ _id: 'novo' });
    gerarResposta.mockResolvedValue('Agendado!');
    await enviarMensagem(reqComId({ texto: '15/03/1985' }), criarRes());
    expect(Paciente.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Maria Silva', dataNascimento: expect.any(Date) })
    );
    expect(conversa.pacienteId).toBe('novo');
    expect(conversa.estado).toBe('livre');
  });

  it('responde 500 em caso de erro inesperado', async () => {
    Conversa.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await enviarMensagem(reqComId({ texto: 'Oi' }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('responderComoAtendente', () => {
  it('rejeita mensagem vazia', async () => {
    const res = criarRes();
    await responderComoAtendente(reqComId({ texto: '  ' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a conversa não existe', async () => {
    Conversa.findOne.mockResolvedValue(null);
    const res = criarRes();
    await responderComoAtendente(reqComId({ texto: 'Oi' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('passa a conversa para humano e envia ao WhatsApp', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    await responderComoAtendente(reqComId({ texto: 'Olá!' }), criarRes());
    expect(conversa.status).toBe('humano');
    expect(conversa.handoffEm).toBeInstanceOf(Date);
    expect(conversa.mensagens[0]).toEqual({ remetente: 'humano', texto: 'Olá!' });
    expect(enviarMensagemWhatsapp).toHaveBeenCalledWith('5511987654321', 'Olá!');
  });

  it('não envia ao WhatsApp quando a conversa não tem telefone', async () => {
    Conversa.findOne.mockResolvedValue(fabricarConversa({ telefone: '' }));
    await responderComoAtendente(reqComId({ texto: 'Oi' }), criarRes());
    expect(enviarMensagemWhatsapp).not.toHaveBeenCalled();
  });

  it('não falha se o envio ao WhatsApp der erro', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Conversa.findOne.mockResolvedValue(fabricarConversa());
    enviarMensagemWhatsapp.mockRejectedValue(new Error('fora do ar'));
    const res = criarRes();
    await responderComoAtendente(reqComId({ texto: 'Oi' }), res);
    expect(res.json).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('responde 500 se o banco falhar', async () => {
    Conversa.findOne.mockRejectedValue(new Error('banco'));
    const res = criarRes();
    await responderComoAtendente(reqComId({ texto: 'Oi' }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('atualizarStatus', () => {
  it('rejeita status inválido', async () => {
    const res = criarRes();
    await atualizarStatus(reqComId({ status: 'xyz' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a conversa não existe', async () => {
    Conversa.findOne.mockResolvedValue(null);
    const res = criarRes();
    await atualizarStatus(reqComId({ status: 'humano' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('registra handoffEm ao passar para humano', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    await atualizarStatus(reqComId({ status: 'humano' }), criarRes());
    expect(conversa.handoffEm).toBeInstanceOf(Date);
    expect(conversa.save).toHaveBeenCalled();
  });

  it('não apaga o handoffEm ao devolver a conversa ao bot', async () => {
    const historico = new Date('2026-01-01');
    const conversa = fabricarConversa({ status: 'humano', handoffEm: historico });
    Conversa.findOne.mockResolvedValue(conversa);
    await atualizarStatus(reqComId({ status: 'ia' }), criarRes());
    expect(conversa.status).toBe('ia');
    expect(conversa.handoffEm).toBe(historico);
  });

  it('registra encerradaEm ao concluir', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    await atualizarStatus(reqComId({ status: 'concluida' }), criarRes());
    expect(conversa.encerradaEm).toBeInstanceOf(Date);
  });

  it('responde 400 se salvar falhar', async () => {
    const conversa = fabricarConversa();
    conversa.save.mockRejectedValue(new Error('erro'));
    Conversa.findOne.mockResolvedValue(conversa);
    const res = criarRes();
    await atualizarStatus(reqComId({ status: 'humano' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('cadastro pela conversa (anti-duplicação)', () => {
  it('reaproveita o cadastro existente em vez de duplicar', async () => {
    const conversa = fabricarConversa({ estado: 'coletando_nascimento' });
    Conversa.findOne.mockResolvedValue(conversa);
    buscarPacientePorNome.mockResolvedValue({ _id: 'existente' });
    const res = criarRes();
    await enviarMensagem(reqComId({ texto: '20/05/1990' }), res);
    expect(Paciente.create).not.toHaveBeenCalled();
    expect(conversa.pacienteId).toBe('existente');
  });

  it('mantém o cadastro mesmo se a IA falhar', async () => {
    const conversa = fabricarConversa({
      estado: 'coletando_nascimento', mensagemPendente: 'Quero agendar'
    });
    Conversa.findOne.mockResolvedValue(conversa);
    Paciente.create.mockResolvedValue({ _id: 'novo' });
    gerarResposta.mockRejectedValue(new Error('falha'));
    const res = criarRes();
    await enviarMensagem(reqComId({ texto: '20/05/1990' }), res);
    expect(conversa.estado).toBe('livre');
    expect(conversa.pacienteId).toBe('novo');
    expect(res.json).toHaveBeenCalledWith(conversa);
  });
});