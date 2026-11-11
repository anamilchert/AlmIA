const buildTimelinePaciente = require('../../src/utils/buildTimelinePaciente');

const base = { dataCadastro: '2024-03-15', consultas: [], conversasResumo: [] };

describe('buildTimelinePaciente', () => {
  it('sempre inclui o evento de cadastro', () => {
    const timeline = buildTimelinePaciente(base);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ tipo: 'cadastro', titulo: 'Cadastro na clínica' });
  });

  it('monta a consulta com título, detalhe e tags', () => {
    const paciente = {
      ...base,
      consultas: [{
        especialidade: 'Ortopedia', medico: 'Dr. Ricardo', data: '2025-03-12',
        status: 'realizada', observacoes: 'Pedido de raio-x.',
      }],
    };
    const evento = buildTimelinePaciente(paciente).find((e) => e.tipo === 'consulta_realizada');
    expect(evento.titulo).toBe('Consulta realizada — Ortopedia');
    expect(evento.detalhe).toBe('Com Dr. Ricardo. Pedido de raio-x.');
    expect(evento.tags).toEqual(['Ortopedia', 'realizada']);
  });

  it('trata status desconhecido como agendada e detalhe vazio sem médico', () => {
    const paciente = {
      ...base,
      consultas: [{ especialidade: 'Geral', data: '2025-01-01', status: 'xyz' }],
    };
    const evento = buildTimelinePaciente(paciente).find((e) => e.tipo === 'consulta_agendada');
    expect(evento.titulo).toBe('Consulta agendada — Geral');
    expect(evento.detalhe).toBe('');
  });

  it('diferencia conversa com humano e conversa com IA', () => {
    const paciente = {
      ...base,
      conversasResumo: [
        { data: '2025-02-01', atendimento: 'humano', detalhe: 'Remarcação', assunto: 'Remarcar' },
        { data: '2025-02-02', atendimento: 'ia', resumoIA: 'Dúvida sobre convênio', assunto: 'Convênio' },
      ],
    };
    const timeline = buildTimelinePaciente(paciente);
    const humano = timeline.find((e) => e.tipo === 'conversa_humano');
    const ia = timeline.find((e) => e.tipo === 'conversa_ia');
    expect(humano.titulo).toBe('Conversa transferida para humano');
    expect(ia.titulo).toBe('Conversa via WhatsApp');
    expect(ia.detalhe).toBe('Dúvida sobre convênio'); // usa resumoIA quando não há detalhe
  });

  it('ordena do evento mais recente para o mais antigo', () => {
    const paciente = {
      ...base,
      consultas: [{ especialidade: 'Ortopedia', data: '2026-05-26', status: 'agendada' }],
      conversasResumo: [{ data: '2025-03-10', atendimento: 'ia', assunto: 'Convênio' }],
    };
    const datas = buildTimelinePaciente(paciente).map((e) => e.data);
    expect(datas).toEqual(['2026-05-26', '2025-03-10', '2024-03-15']);
  });
});