describe('rotas', () => {
  it.each([
    'agendamentoRoutes',
    'authRoutes',
    'clinicConfig.routes',
    'conversaRoutes',
    'dashboardRoutes',
    'pacienteRoutes',
    'whatsappRoutes',
  ])('%s carrega e define rotas', (arquivo) => {
    const router = require(`../../src/routes/${arquivo}`);
    expect(typeof router).toBe('function');
    expect(router.stack.length).toBeGreaterThan(0);
  });
});