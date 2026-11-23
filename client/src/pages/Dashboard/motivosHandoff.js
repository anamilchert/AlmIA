export const MOTIVOS = {
  sintomas_fisicos: 'Sintomas físicos',
  emergencia: 'Possível emergência',
  pedido_humano: 'Pediu atendimento humano',
  reclamacao: 'Reclamação',
  nao_resolvido: 'IA não está resolvendo',
  duvida_clinica: 'Dúvida clínica',
  falha_ia: 'IA indisponível',
  outro: 'Precisa de atenção',
  sem_informacao: 'IA não tinha a informação',
};

export function nomeDoMotivo(motivo) {
  if (!motivo) return 'Assumida pela equipe';
  return MOTIVOS[motivo] || MOTIVOS.outro;
}