import { describe, expect, it } from 'vitest';
import { addDays, buildFrtvUrl, isoDay } from './url';

describe('buildFrtvUrl', () => {
  it('accepte les routes de l’API FRTV', () => {
    expect(buildFrtvUrl('/api/v1/elo/ranking')).toBe('https://frtv.fr/api/v1/elo/ranking');
    expect(buildFrtvUrl('/api/v1/matches?team=oldboys&limit=100')).toBe('https://frtv.fr/api/v1/matches?team=oldboys&limit=100');
    expect(buildFrtvUrl('/api/streams/cs2')).toBe('https://frtv.fr/api/streams/cs2');
  });

  it('refuse tout le reste', () => {
    for (const bad of ['/auth/me', 'https://evil.example/api/v1/x', '//evil.example/api/v1/x', '/api/v1/../auth/me', '/admin', '']) {
      expect(() => buildFrtvUrl(bad)).toThrow();
    }
  });
});

describe('dates', () => {
  it('formate une date locale', () => {
    expect(isoDay(new Date(2026, 10, 7, 23, 30))).toBe('2026-11-07');
    expect(isoDay(addDays(new Date(2026, 10, 30), 1))).toBe('2026-12-01');
  });
});
