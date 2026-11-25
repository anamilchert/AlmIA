jest.mock('mongoose', () => ({ connection: { readyState: 1 } }));

const mongoose = require('mongoose');
const { health } = require('../../src/controllers/healthController');

function criarRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('health', () => {
  it('responde 200 quando o banco está conectado', () => {
    mongoose.connection.readyState = 1;
    const res = criarRes();
    health({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', banco: 'conectado' })
    );
  });

  it('responde 503 quando o banco não está conectado', () => {
    mongoose.connection.readyState = 0;
    const res = criarRes();
    health({}, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'indisponivel', banco: 'desconectado' })
    );
  });
});