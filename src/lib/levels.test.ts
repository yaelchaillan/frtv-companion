import { describe, expect, it } from 'vitest';
import { capToFaceit, computeLevel, levelFloor } from './levels';

describe('computeLevel', () => {
  it('garde le niveau FACEIT sous 2001 Elo', () => {
    expect(computeLevel(1999, 9)).toMatchObject({ level: 9, isCustom: false, nextAt: 2001 });
    expect(computeLevel(1200, 5)).toMatchObject({ level: 5, nextAt: null, progress: null });
  });

  it('place le niveau 10 entre 2001 et 2250', () => {
    expect(computeLevel(2001, 10)).toMatchObject({ level: 10, isCustom: false, floor: 2001, nextAt: 2251, progress: 0 });
    expect(computeLevel(2250)).toMatchObject({ level: 10 });
  });

  it('applique les paliers FRTV de 250 Elo', () => {
    expect(computeLevel(2251)).toMatchObject({ level: 11, isCustom: true, floor: 2251, nextAt: 2501 });
    expect(computeLevel(2500)?.level).toBe(11);
    expect(computeLevel(2501)?.level).toBe(12);
    expect(computeLevel(2751)?.level).toBe(13);
    expect(computeLevel(3001)?.level).toBe(14);
    expect(computeLevel(3250)?.level).toBe(14);
  });

  it('continue jusqu’au niveau 20 (4501+) puis plafonne', () => {
    expect(computeLevel(3251)).toMatchObject({ level: 15, nextAt: 3501 });
    expect(computeLevel(3434)?.level).toBe(15);
    expect(computeLevel(3501)?.level).toBe(16);
    expect(computeLevel(3856)?.level).toBe(17);
    expect(computeLevel(4501)).toMatchObject({ level: 20, nextAt: null, progress: 1 });
    expect(computeLevel(5299)).toMatchObject({ level: 20, nextAt: null });
  });

  it("fait primer l'Elo sur un niveau FACEIT incohérent", () => {
    expect(computeLevel(2600, 9)?.level).toBe(12);
  });

  it('calcule la progression dans le palier', () => {
    expect(computeLevel(2376)?.progress).toBeCloseTo(0.5);
  });

  it('renvoie null sans donnée exploitable', () => {
    expect(computeLevel(null, null)).toBeNull();
    expect(computeLevel(Number.NaN, 0)).toBeNull();
    expect(computeLevel(undefined, 11)).toBeNull();
  });
});

describe('levelFloor', () => {
  it('donne le seuil des niveaux 10 à 20', () => {
    expect([10, 11, 12, 15, 16, 20].map(levelFloor)).toEqual([2001, 2251, 2501, 3251, 3501, 4501]);
    expect(levelFloor(9)).toBeNull();
    expect(levelFloor(21)).toBeNull();
  });
});

describe('capToFaceit', () => {
  it('ramène les niveaux 11+ au niveau 10', () => {
    expect(capToFaceit(computeLevel(2900)!)).toMatchObject({ level: 10, isCustom: false });
    expect(capToFaceit(computeLevel(1500, 7)!)).toMatchObject({ level: 7 });
  });
});
