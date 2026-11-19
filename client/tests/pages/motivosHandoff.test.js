import { describe, it, expect } from 'vitest';
import { MOTIVOS, nomeDoMotivo } from '../../src/pages/Dashboard/motivosHandoff';

describe('nomeDoMotivo', () => {
  it('devolve o texto de cada motivo conhecido', () => {
    Object.entries(MOTIVOS).forEach(([chave, texto]) => {
      expect(nomeDoMotivo(chave)).toBe(texto);
    });
  });

  it('usa o texto da assunção manual quando não há motivo', () => {
    expect(nomeDoMotivo(null)).toBe('Assumida pela equipe');
    expect(nomeDoMotivo('')).toBe('Assumida pela equipe');
    expect(nomeDoMotivo(undefined)).toBe('Assumida pela equipe');
  });

  it('usa o texto genérico para motivo desconhecido', () => {
    expect(nomeDoMotivo('motivo_inventado')).toBe('Precisa de atenção');
  });
});