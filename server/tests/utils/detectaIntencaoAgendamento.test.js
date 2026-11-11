const detectaIntencaoAgendamento = require('../../src/utils/detectaIntencaoAgendamento');

describe('detectaIntencaoAgendamento', () => {
  it.each([
    'Quero agendar uma consulta',
    'Preciso REMARCAR minha consulta',
    'Gostaria de marcar exame de sangue',
    'Posso cancelar consulta de amanhã?',
    'Quero ver meus exames',
  ])('detecta a intenção em: %s', (texto) => {
    expect(detectaIntencaoAgendamento(texto)).toBe(true);
  });

  it.each([
    'Qual o horário de funcionamento?',
    'Vocês atendem pelo Amil?',
    'Qual o preparo para colonoscopia?',
    '',
  ])('não detecta intenção em: "%s"', (texto) => {
    expect(detectaIntencaoAgendamento(texto)).toBe(false);
  });
});