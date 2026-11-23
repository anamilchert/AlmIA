const { numeroBloqueado } = require('../../src/utils/numerosBloqueados');

afterEach(() => {
  delete process.env.NUMEROS_BLOQUEADOS;
});

describe('numeroBloqueado', () => {
  it('bloqueia o número que está na lista, ignorando formatação e código do país', () => {
    expect(numeroBloqueado('5547999990000', '+55 (47) 99999-0000')).toBe(true);
  });

  it('aceita vários números separados por vírgula', () => {
    const lista = '4733334444, 5511988887777';
    expect(numeroBloqueado('5511988887777', lista)).toBe(true);
    expect(numeroBloqueado('554733334444', lista)).toBe(true);
  });

  it('não bloqueia número que não está na lista', () => {
    expect(numeroBloqueado('5547999990000', '5511988887777')).toBe(false);
  });

  it('não bloqueia nada quando a lista está vazia', () => {
    expect(numeroBloqueado('5547999990000', '')).toBe(false);
  });

  it('não bloqueia quando o número é vazio ou curto demais', () => {
    expect(numeroBloqueado(null, '5547999990000')).toBe(false);
    expect(numeroBloqueado('1234', '1234')).toBe(false);
  });

  it('ignora entradas curtas na lista', () => {
    expect(numeroBloqueado('5547999990000', '123, abc')).toBe(false);
  });

  it('usa a variável NUMEROS_BLOQUEADOS quando a lista não é informada', () => {
    process.env.NUMEROS_BLOQUEADOS = '5547999990000';
    expect(numeroBloqueado('5547999990000')).toBe(true);
    delete process.env.NUMEROS_BLOQUEADOS;
    expect(numeroBloqueado('5547999990000')).toBe(false);
  });
});