jest.mock('../../src/models/Conversa', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../src/services/openaiService', () => ({ gerarResposta: jest.fn() }));
jest.mock('../../src/services/whatsappService', () => ({ enviarMensagemWhatsapp: jest.fn() }));
jest.mock('../../src/controllers/pacienteController', () => ({ buscarPacientePorTelefone: jest.fn() }));

const Conversa = require('../../src/models/Conversa');
const { gerarResposta } = require('../../src/services/openaiService');
const { enviarMensagemWhatsapp } = require('../../src/services/whatsappService');
const { buscarPacientePorTelefone } = require('../../src/controllers/pacienteController');
const { verificarWebhook, receberMensagem } = require('../../src/controllers/whatsappController');

const TELEFONE = '5511987654321';

function criarRes() {
  return { status: jest.fn().mockReturnThis(), send: jest.fn(), sendStatus: jest.fn() };
}

function criarReq(mensagem) {
  return {
    body: {
      entry: [{ changes: [{ value: { messages: mensagem ? [mensagem] : undefined, contacts: [{ profile: { name: 'Maria' } }] } }] }],
    },
  };
}

function fabricarConversa(extra = {}) {
  return { status: 'ia', mensagens: [], save: jest.fn(), ...extra };
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env.WHATSAPP_VERIFY_TOKEN = 'token-teste';
});

describe('verificarWebhook', () => {
  it('devolve o challenge quando o token confere', () => {
    const res = criarRes();
    verificarWebhook({ query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'token-teste', 'hub.challenge': 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('abc');
  });

  it('responde 403 quando o token não confere', () => {
    const res = criarRes();
    verificarWebhook({ query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'errado', 'hub.challenge': 'abc' } }, res);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });
});

describe('receberMensagem', () => {
  it('ignora eventos sem mensagem (ex.: status de entrega)', async () => {
    const res = criarRes();
    await receberMensagem(criarReq(null), res);
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(Conversa.findOne).not.toHaveBeenCalled();
  });

  it('avisa que só entende texto quando a mensagem não tem texto', async () => {
    const res = criarRes();
    await receberMensagem(criarReq({ from: TELEFONE, type: 'audio' }), res);
    expect(enviarMensagemWhatsapp).toHaveBeenCalledWith(TELEFONE, expect.stringContaining('texto'));
    expect(Conversa.findOne).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  it('procura só conversa em aberto e responde pelo bot quando o status é ia', async () => {
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    gerarResposta.mockResolvedValue('Resposta da IA');
    const res = criarRes();

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), res);

    expect(Conversa.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: TELEFONE, status: { $ne: 'concluida' } })
    );
    expect(conversa.mensagens.map((m) => m.remetente)).toEqual(['paciente', 'bot']);
    expect(enviarMensagemWhatsapp).toHaveBeenCalledWith(TELEFONE, 'Resposta da IA');
    expect(conversa.save).toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  it('não aciona a IA quando um humano está atendendo', async () => {
    const conversa = fabricarConversa({ status: 'humano' });
    Conversa.findOne.mockResolvedValue(conversa);

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), criarRes());

    expect(gerarResposta).not.toHaveBeenCalled();
    expect(conversa.mensagens).toHaveLength(1);
    expect(conversa.save).toHaveBeenCalled();
  });

  it('cria conversa vinculada ao paciente quando o telefone é cadastrado', async () => {
    Conversa.findOne.mockResolvedValue(null);
    buscarPacientePorTelefone.mockResolvedValue({ _id: 'p1', nome: 'Maria Silva' });
    Conversa.create.mockResolvedValue(fabricarConversa());
    gerarResposta.mockResolvedValue('ok');

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), criarRes());

    expect(Conversa.create).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: TELEFONE, nome: 'Maria Silva', pacienteId: 'p1' })
    );
  });

  it('cria conversa sem vínculo, com o nome do WhatsApp, quando o telefone é novo', async () => {
    Conversa.findOne.mockResolvedValue(null);
    buscarPacientePorTelefone.mockResolvedValue(null);
    Conversa.create.mockResolvedValue(fabricarConversa());
    gerarResposta.mockResolvedValue('ok');

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), criarRes());

    expect(Conversa.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Maria', pacienteId: null })
    );
  });

  it('mantém a mensagem do paciente salva mesmo se a IA falhar', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const conversa = fabricarConversa();
    Conversa.findOne.mockResolvedValue(conversa);
    gerarResposta.mockRejectedValue(new Error('OpenAI fora do ar'));
    const res = criarRes();

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), res);

    expect(conversa.save).toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    spy.mockRestore();
  });

  it('responde 500 em caso de erro inesperado', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Conversa.findOne.mockRejectedValue(new Error('banco caiu'));
    const res = criarRes();

    await receberMensagem(criarReq({ from: TELEFONE, text: { body: 'Oi' } }), res);

    expect(res.sendStatus).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});