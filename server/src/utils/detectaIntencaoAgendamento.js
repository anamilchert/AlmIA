const PALAVRAS_CHAVE = [
  'agendar', 'agendamento', 'marcar consulta', 'marcar exame',
  'remarcar', 'reagendar', 'cancelar consulta', 'cancelar exame',
  'meu histórico', 'minhas consultas', 'ver meus exames'
];

function detectaIntencaoAgendamento(texto) {
  const textoNormalizado = texto.toLowerCase();
  return PALAVRAS_CHAVE.some((p) => textoNormalizado.includes(p));
}

module.exports = detectaIntencaoAgendamento;