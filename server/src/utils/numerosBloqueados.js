function ultimosOitoDigitos(numero) {
  return String(numero || '').replace(/\D/g, '').slice(-8);
}

function numeroBloqueado(numero, lista = process.env.NUMEROS_BLOQUEADOS) {
  const alvo = ultimosOitoDigitos(numero);
  if (alvo.length < 8) return false;
  return String(lista || '')
    .split(',')
    .map(ultimosOitoDigitos)
    .filter((chave) => chave.length === 8)
    .includes(alvo);
}

module.exports = { numeroBloqueado };