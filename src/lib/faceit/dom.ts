/**
 * Repères dans les pages faceit.com (relevés le 2026-11-17).
 *
 * FACEIT utilise styled-components : les classes ressemblent à
 * `Roster__Group-sc-21bc48ce-1 bckxMy`. Le préfixe lisible (`Roster__Group`) vient du
 * nom du composant ; le hash change à chaque version. On s'appuie donc sur :
 *   1. les attributs stables (`name="roster1"`, `aria-haspopup`) ;
 *   2. les préfixes lisibles via `[class*="Prefixe"]`, jamais sur le hash.
 * Si FACEIT change sa structure, c'est ce fichier qu'il faut ajuster.
 */
export const SEL = {
  // Salle de match : grille à trois colonnes roster1 | info | roster2
  rosterColumns: '[name="roster1"], [name="roster2"]',
  infoColumn: '[name="info"]',
  infoStack: '[class*="styles__Stack"]',
  playerCard: '[aria-haspopup="dialog"]',
  nickname: '[class*="Nickname__Name"]',
  endSlot: '[class*="EndSlotContainer"]',
  eloText: '[class*="TextBlock__Holder"]',
  skillIcon: 'svg[class*="SkillIcon__StyledSvg"]',
  // Boîte FACEIT « Global / 20 derniers matchs » sous le nom du joueur
  faceitStatsBox: '[class*="RosterPlayerStatsV2__Container"]',
  // Profil : carte équipe en haut de page (lien /teams/{id})
  profileTeamLink: '[class*="styles__CardsRow"] a[href*="/teams/"]',
  profileTeamText: '[class*="styles__TextCol"]',
  // Profil : carte « Season · Matchmaking »
  eloBlock: '[class*="styles__EloBlock"]',
  seasonCard: '[class*="styles__Card-"]',
} as const;

/** Élément ajouté par une extension (la nôtre ou une autre, ex. Repeek). */
export function isForeign(el: Element): boolean {
  return el.tagName.includes('-') || el.hasAttribute('data-repeek-widget') || el.hasAttribute('data-frtv-widget');
}

/** Insère `node` avant le premier élément ajouté par une extension, sinon à la fin. */
export function insertBeforeForeign(container: Element, node: Element): void {
  const firstForeign = [...container.children].find((child) => child !== node && isForeign(child));
  if (firstForeign) container.insertBefore(node, firstForeign);
  else container.append(node);
}

/**
 * Vrai si `node` est dans `container` et qu'aucun élément FACEIT ne le suit (seulement
 * des blocs d'extensions). FACEIT remplit souvent la colonne après notre insertion :
 * dans ce cas, ses blocs passent après le nôtre et il faut le redescendre.
 */
export function isAfterNativeContent(container: Element, node: Element): boolean {
  if (node.parentElement !== container) return false;
  for (let el = node.nextElementSibling; el; el = el.nextElementSibling) {
    if (!isForeign(el)) return false;
  }
  return true;
}

function parseElo(text: string | null | undefined): number | null {
  const digits = (text ?? '').replace(/[^\d]/g, '');
  const value = digits ? Number(digits) : Number.NaN;
  return Number.isFinite(value) && value > 0 && value < 10000 ? value : null;
}

export interface RoomPlayerCard {
  card: HTMLElement;
  nickname: string;
  side: 1 | 2;
  /** Elo affiché par FACEIT sur la carte. */
  elo: number | null;
  /** Icône de niveau FACEIT (absente pour les joueurs « Challenger »). */
  skillIcon: SVGElement | null;
  /** Boîte de stats FACEIT « Global / 20 derniers matchs ». */
  statsBox: HTMLElement | null;
}

export function findRoomInfoStack(root: ParentNode = document): HTMLElement | null {
  const info = root.querySelector<HTMLElement>(SEL.infoColumn);
  if (!info) return null;
  return info.querySelector<HTMLElement>(SEL.infoStack) ?? info;
}

export function findRoomPlayerCards(root: ParentNode = document): RoomPlayerCard[] {
  const cards: RoomPlayerCard[] = [];
  root.querySelectorAll<HTMLElement>(SEL.rosterColumns).forEach((column) => {
    const side = column.getAttribute('name') === 'roster2' ? 2 : 1;
    column.querySelectorAll<HTMLElement>(SEL.playerCard).forEach((card) => {
      const nickname = card.querySelector(SEL.nickname)?.textContent?.trim();
      if (!nickname) return;
      const endSlot = card.querySelector(SEL.endSlot);
      cards.push({
        card,
        nickname,
        side,
        elo: parseElo(endSlot?.querySelector(SEL.eloText)?.textContent),
        skillIcon: endSlot?.querySelector<SVGElement>(SEL.skillIcon) ?? null,
        statsBox: findPlayerStatsBox(card),
      });
    });
  });
  return cards;
}

export function findPlayerStatsBox(card: ParentNode): HTMLElement | null {
  return card.querySelector<HTMLElement>(SEL.faceitStatsBox);
}

export interface ProfileTeam {
  name: string;
  members: number | null;
  faceitTeamId: string | null;
}

/** Équipe affichée en haut du profil FACEIT (« OldBoys · Créée le … · 12 membres »). */
export function findProfileTeam(root: ParentNode = document): ProfileTeam | null {
  const link = root.querySelector<HTMLAnchorElement>(SEL.profileTeamLink);
  if (!link) return null;
  const textCol = link.querySelector(SEL.profileTeamText);
  const name = textCol?.firstElementChild?.textContent?.trim() || textCol?.textContent?.split('\n')[0]?.trim();
  if (!name) return null;
  const members = /(\d+)\s*membres?/i.exec(link.textContent ?? '')?.[1];
  const id = /\/teams\/([0-9a-f-]{36})/i.exec(link.getAttribute('href') ?? '')?.[1] ?? null;
  return { name, members: members ? Number(members) : null, faceitTeamId: id };
}

export interface ProfileAnchors {
  eloBlock: HTMLElement;
  seasonCard: HTMLElement | null;
  skillIcon: SVGElement | null;
  elo: number | null;
}

export function findProfileAnchors(root: ParentNode = document): ProfileAnchors | null {
  const eloBlock = root.querySelector<HTMLElement>(SEL.eloBlock);
  if (!eloBlock) return null;
  const eloText = [...eloBlock.children].find((c) => c.tagName === 'SPAN')?.textContent;
  return {
    eloBlock,
    seasonCard: eloBlock.closest<HTMLElement>(SEL.seasonCard),
    skillIcon: eloBlock.querySelector<SVGElement>(SEL.skillIcon),
    elo: parseElo(eloText),
  };
}

const HIDDEN_ATTR = 'data-frtv-hidden';

const SEP_ATTR = 'data-frtv-sep';

/** Marque les blocs visibles d'autres extensions dans une carte joueur (filet de séparation). */
export function markForeignBlocks(card: Element): void {
  for (const child of card.children) {
    if (!isForeign(child) || child.tagName === 'FRTV-WIDGET') continue;
    const visible = (child as HTMLElement).offsetHeight > 0;
    if (visible) child.setAttribute(SEP_ATTR, '');
    else child.removeAttribute(SEP_ATTR);
  }
}

export function clearForeignMarks(root: ParentNode = document): void {
  root.querySelectorAll(`[${SEP_ATTR}]`).forEach((el) => el.removeAttribute(SEP_ATTR));
}

/** Masque une icône FACEIT (remplacée par notre badge) ; réversible avec `restoreHidden`. */
export function hideElement(el: Element): void {
  if (el.hasAttribute(HIDDEN_ATTR)) return;
  el.setAttribute(HIDDEN_ATTR, '');
  (el as HTMLElement).style.setProperty('display', 'none', 'important');
}

export function restoreHidden(root: ParentNode = document): void {
  root.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
    el.removeAttribute(HIDDEN_ATTR);
    (el as HTMLElement).style.removeProperty('display');
  });
}
