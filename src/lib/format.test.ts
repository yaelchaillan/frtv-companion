import { describe, expect, it } from 'vitest';
import { fmtDecimal, fmtInt, fmtPct, fmtRating, fmtRelativeDay, fmtSigned, fmtTier, fmtUntil, plural } from './format';

const NNBSP = ' ';

describe('nombres fr-FR', () => {
  it('sépare les milliers par une espace fine insécable', () => {
    expect(fmtInt(3856)).toBe(`3${NNBSP}856`);
    expect(fmtInt(42)).toBe('42');
  });

  it('formate ratings, décimales et pourcentages', () => {
    expect(fmtRating(1.284)).toBe('1,28');
    expect(fmtDecimal(85.34)).toBe('85,3');
    expect(fmtDecimal(74)).toBe('74,0');
    expect(fmtPct(0.62)).toBe(`62${NNBSP}%`);
  });

  it('utilise le vrai signe moins', () => {
    expect(fmtSigned(134)).toBe('+134');
    expect(fmtSigned(-131)).toBe('−131');
    expect(fmtSigned(0.2)).toBe('±0');
    expect(fmtSigned(-1500)).toBe(`−1${NNBSP}500`);
  });

  it('accorde le pluriel', () => {
    expect(plural(1, 'match')).toBe('1 match');
    expect(plural(3, 'match')).toBe('3 matchs');
  });
});

describe('dates et durées', () => {
  it('donne un délai lisible', () => {
    const now = Date.UTC(2026, 10, 17, 12, 0);
    expect(fmtUntil(now + 35 * 60_000, now)).toBe(`dans 35${NNBSP}min`);
    expect(fmtUntil(now + 2 * 3600_000, now)).toBe(`dans 2${NNBSP}h`);
    expect(fmtUntil(now - 1000, now)).toBeNull();
  });

  it('nomme le jour relatif', () => {
    const now = new Date(2026, 10, 17, 12, 0);
    expect(fmtRelativeDay(new Date(2026, 10, 17, 20, 0).getTime(), now)).toBe('Ce soir 20:00');
    expect(fmtRelativeDay(new Date(2026, 10, 17, 14, 0).getTime(), now)).toBe("Aujourd'hui 14:00");
    expect(fmtRelativeDay(new Date(2026, 10, 18, 19, 0).getTime(), now)).toBe('Demain 19:00');
  });
});

describe('fmtTier', () => {
  it('rend les divisions lisibles', () => {
    expect(fmtTier('ADVANCED')).toBe('Advanced');
    expect(fmtTier('OPEN_5_8')).toBe('Open 5-8');
    expect(fmtTier('OPEN_10')).toBe('Open 10');
    expect(fmtTier('Open5-8')).toBe('Open 5-8');
    expect(fmtTier('Open10')).toBe('Open 10');
    expect(fmtTier('Main')).toBe('Main');
    expect(fmtTier(null)).toBeNull();
  });
});
