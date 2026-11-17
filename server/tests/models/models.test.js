const mongoose = require('mongoose');

describe('models', () => {
  it.each([
    'Agendamento',
    'ClinicConfig',
    'Conversa',
    'Paciente',
  ])('%s carrega e registra o model no mongoose', (nome) => {
    const Model = require(`../../src/models/${nome}`);
    expect(Model.prototype instanceof mongoose.Model).toBe(true);
    expect(Model.schema).toBeDefined();
  });
});