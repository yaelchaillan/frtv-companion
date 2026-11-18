# FRTV Companion — extension navigateur pour FACEIT

Extension Chrome (Manifest V3) qui intègre les données de la scène CS2 francophone de
[frtv.fr](https://frtv.fr) **directement dans les pages de faceit.com**, avec un look natif
FACEIT signé FRTV, et prolonge les niveaux FACEIT jusqu'au **niveau 20**.

Non affiliée à FACEIT. Pas d'automatisation (auto-accept…), pas de clé API embarquée.

> **Tester l'extension** : télécharge le zip de la
> [dernière version](https://github.com/yaelchaillan/frtv-companion/releases/latest) et suis la
> [notice d'installation](INSTALLATION.md). C'est l'affaire de 2 minutes, sans rien compiler.

## Ce que fait l'extension

| Où | Bloc |
|---|---|
| **Salle de match** | **A.** Sous chaque joueur : forme sur 5 matchs (V/D), Elo gagné ou perdu sur 20 matchs, matchs du jour, rating FRTV. Version étendue si « Masquer les stats FACEIT » est actif. |
| | **B.** Badge de niveau 11 à 20 à la place de l'icône FACEIT (les « Challenger » gardent leur badge). |
| | **C.** Carte d'analyse dans la colonne centrale. **Ligue suivie par FRTV** : prévision Elo FRTV, veto probable, maps, forme, face-à-face. **Matchmaking** : prévision et Elo en jeu (Elo FACEIT moyen), maps et forme des joueurs. Onglets mémorisés. |
| **Profil joueur** | **D.** Suivi de niveau au centre de la carte « Season » (niveau, distance au palier suivant, %). |
| | **E.** Badge FRTV à la place de l'icône de niveau. |
| | **F.** Carte « Scène FR » : rating FRTV 2.0, rang, K/D, ADR, KAST, équipe et son Elo FRTV ; variantes non classé et équipe classée (forme, prochain match). |
| **Popup** | Aujourd'hui (toutes les séries FR du jour par horaire, filtre par division, → salles FACEIT), Elo FRTV (top 10), Live (streams avec miniatures), Réglages par thème. |

Si FACEIT change sa page et que les repères ne sont plus trouvés, un **panneau flottant de
secours** s'affiche à la place.

## Niveaux 11 à 20

FACEIT s'arrête au niveau 10 (2001 Elo et plus). L'extension ajoute des paliers de **250 Elo** :

| Niveau | Elo | | Niveau | Elo |
|---|---|---|---|---|
| 10 | 2001 – 2250 | | 16 | 3501 – 3750 |
| 11 | 2251 – 2500 | | 17 | 3751 – 4000 |
| 12 | 2501 – 2750 | | 18 | 4001 – 4250 |
| 13 | 2751 – 3000 | | 19 | 4251 – 4500 |
| 14 | 3001 – 3250 | | 20 | 4501 et plus |
| 15 | 3251 – 3500 | | | |

Badges en forme d'écu, quatre paliers de prestige (11–13 contour, 14–16 teinté, 17–19 plein,
20 violet avec halo) et des crans qui situent le niveau dans son palier.
Logique : [`src/lib/levels.ts`](src/lib/levels.ts) · badge : [`src/components/LevelBadge.tsx`](src/components/LevelBadge.tsx).

## Réglages (popup → Réglages)

| Réglage | Défaut |
|---|---|
| Niveaux 11 à 20 | activé |
| Carte d'analyse en salle de match | activé |
| Forme sous chaque joueur | activé |
| Cartes du profil | activé |
| Masquer les stats FACEIT sous les joueurs (« Global / 20 derniers matchs », remplacé par la fiche FRTV étendue, comme dans la maquette) | activé |
| Mode debug (réponses FACEIT brutes dans la console, préfixe `[FRTV]`) | désactivé |

## Démarrer

Prérequis : Node.js ≥ 22.

```bash
npm install
npm run build        # génère .output/chrome-mv3
```

**Charger dans Chrome** : `chrome://extensions` → *Mode développeur* → *Charger l'extension
non empaquetée* → dossier `.output/chrome-mv3`. Après chaque `npm run build`, cliquer sur ↻
sur la carte de l'extension.

| Commande | Effet |
|---|---|
| `npm run preview:ui` | Aperçu de tous les blocs et de leurs états sur http://localhost:5190 (jeu de données de référence OldBoys / regnum4games ; la popup interroge l'API FRTV réelle). |
| `npm run preview:ui` → `/salle.html` | Réplique de la maquette « Salle de match » (Claude Design) : page FACEIT simulée avec les vrais repères, blocs insérés par le vrai code (`injectRoomWidgets`) et les vraies marges. `?compact` pour le mode compact, `?repeek=0` sans Repeek. |
| `npm run preview:ui` → `/store.html` | Visuels du Chrome Web Store (5 captures 1280 × 800, vignettes 440 × 280 et 1400 × 560) avec des joueurs fictifs. Textes de la fiche et politique de confidentialité : [store/](store/FICHE-CHROME-WEB-STORE.md). |
| `npm test` | Tests unitaires (Vitest) : niveaux, formatage fr-FR, analyse, générateurs de phrases, lecture FACEIT. |
| `npm run compile` | Vérification TypeScript. |
| `npm run dev` | Mode développement WXT (Chrome dédié, rechargement automatique). |
| `npm run build:firefox` / `npm run zip` | Build Firefox / archive pour les stores. |

> `.npmrc` active `legacy-peer-deps` (npm 11.3 plante sur les dépendances pair de
> Vite/Vitest). `npm test` passe par `scripts/test.mjs` pour contourner un bug de Vitest sous
> Windows quand le chemin commence par `c:` en minuscule.

## Architecture

```
src/
├── entrypoints/
│   ├── background.ts          # relaie les GET vers frtv.fr (+ cache mémoire / storage.session)
│   ├── faceit.content/        # route faceit.com → features, injecte Barlow Condensed dans la page
│   └── popup/                 # popup 4 onglets
├── features/                  # logique par page : room.tsx, profile.tsx, state.ts (état partagé)
├── components/
│   ├── native/                # blocs intégrés : PlayerStrip, RoomCard, LevelTracker, ProfileFrtvCard
│   ├── LevelBadge.tsx         # écu 11–20
│   └── MatchPanel, ProfileCard, Shell   # panneau flottant de secours
├── lib/
│   ├── faceit/                # dom.ts (repères FACEIT), api.ts, stats.ts, route.ts
│   ├── frtv/                  # client, cache, service, analysis, narrative (phrases générées)
│   ├── inject/                # widgets (Shadow DOM par bloc), watch (MutationObserver)
│   ├── levels.ts, format.ts, settings.ts, store.ts
└── styles/ui.css              # tokens --frtv-*, classes frtv-*
preview/                       # aperçu hors extension + jeu de données (fixtures.ts)
store/                         # fiche Chrome Web Store, politique de confidentialité, visuels
```

### Intégration dans faceit.com

- Chaque bloc est un `<frtv-widget>` avec son **Shadow DOM** (styles isolés de FACEIT et des
  autres extensions comme Repeek) et sa racine React.
- Repères FACEIT dans [`src/lib/faceit/dom.ts`](src/lib/faceit/dom.ts) : attributs stables
  (`name="roster1|info|roster2"`, `aria-haspopup`) et préfixes lisibles des composants
  styled-components (`Nickname__Name`, `SkillIcon__StyledSvg`, `RosterPlayerStatsV2__Container`,
  `styles__EloBlock`…), **jamais le hash**. Si FACEIT change sa page, c'est ce fichier qu'on ajuste.
- `WidgetManager` remonte ou replace les blocs quand FACEIT redessine la page ; les éléments
  FACEIT masqués (icône de niveau, boîte de stats) sont restaurés au changement de page.

### Données

- **FACEIT** (routes internes lues avec la session de l'utilisateur, vérifiées le 2026-11-17) :
  `/api/match/v2/match/{id}`, `/api/users/v1/nicknames/{pseudo}`, `/api/users/v1/sessions/me`,
  `/api/stats/v1/stats/time/users/{id}/games/cs2?size=20` (champs codés décodés dans `stats.ts`).
- **FRTV** : API publique `https://frtv.fr/api/v1` (`/elo/ranking`, `/player-stats/ranking`,
  `/matches?team=`, `/events/current-season`, `/api/streams/cs2`). Le service d'arrière-plan
  n'accepte que des GET vers ces préfixes.
- Lien salle FACEIT ↔ match FRTV : `match_series_faceit_id`. Le filtre `team` de l'API fait une
  recherche partielle sur le **nom** (le slug du classement peut être un ancien nom).

## Limites connues

- Les repères DOM ne sont pas couverts par des tests automatisés (il faudrait un
  environnement DOM type happy-dom, non ajouté pour ne pas créer de dépendance) : ils sont
  vérifiés sur faceit.com.
- Le classement Elo FRTV ne couvre qu'une partie des équipes : sans Elo pour les deux,
  la carte affiche « Match non classé FRTV » sans prévision.
- Pour un joueur non classé, le nombre de maps déjà jouées n'est pas disponible dans l'API
  (seuls les joueurs classés y figurent).
- Captures du README à refaire avec la nouvelle interface.
