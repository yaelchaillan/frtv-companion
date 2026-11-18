# Fiche Chrome Web Store · FRTV Companion

Ce fichier contient tout ce qu'il faut copier dans le Developer Dashboard, onglet par onglet. Les visuels sont dans [images/](images/).

Les visuels se régénèrent avec `npm run preview:ui`, puis la page http://localhost:5190/store.html. Ils utilisent des joueurs et des équipes fictifs, sauf la popup qui affiche les vraies données publiques FRTV.

---

## 0. Avant tout : le paquet

Envoie **[.output/frtv-companion-0.1.1-chrome.zip](../.output/frtv-companion-0.1.1-chrome.zip)** dans *Build → Package*. Il remplace le 0.1.0 déjà envoyé : version 0.1.1, avec les licences et deux correctifs d'affichage.

Pour chaque mise à jour : augmente `version` dans `package.json`, lance `npm run zip`, puis envoie le nouveau zip.

---

## 1. Store listing

### Description

```
FRTV Companion apporte les données de FRTV, le hub de la scène Counter-Strike 2 francophone, directement dans FACEIT.

DANS LA SALLE DE MATCH
• Un en-tête de match lisible : équipes, score, map, liens vers les pages FRTV et comparatif des deux équipes (Elo moyen, victoires, K/D, ADR, headshots).
• Pour chaque joueur : drapeau, Elo, niveau, forme sur les 5 derniers matchs, évolution de l'Elo sur 20 matchs, matchs du jour et rating FRTV.
• Les groupes de matchmaking : vois d'un coup d'œil qui a lancé la partie en duo, trio ou à cinq.
• En ligue : Elo FRTV des équipes, prévision, veto probable, bilans par map et forme récente.

NIVEAUX 11 À 20
Au-delà du niveau 10, un niveau FRTV tous les 250 Elo (niveau 11 dès 2 251 Elo, niveau 20 dès 4 501 Elo), dans la salle de match et sur les profils.

SUR LES PROFILS
Suivi de progression vers le niveau suivant et carte « Scène FR » : rating FRTV du joueur, son classement et celui de son équipe.

DANS LA POPUP
• Aujourd'hui : toutes les séries FR du jour par horaire, filtrables par division, avec accès direct aux salles FACEIT.
• Elo FRTV : le top 10 des équipes et leur évolution sur 7 jours.
• Live : les streams Counter-Strike francophones en direct sur Twitch.
• Réglages : active ou désactive chaque fonction, appliqué tout de suite.

RESPECT DE TA VIE PRIVÉE
Pas de compte, pas de publicité, pas de traçage. L'extension lit les pages FACEIT que tu ouvres avec ta propre session et interroge l'API publique de frtv.fr. Tes réglages restent dans ton navigateur.

FRTV Companion est édité par FRTV (frtv.fr). Non affilié à FACEIT. FACEIT est une marque de son propriétaire.
```

### Category

**Games** (rubrique *Lifestyle*). Choix de repli : **Entertainment**.

### Language

**Français (French)**

### Graphic assets

| Champ | Fichier |
|---|---|
| Store icon (128 × 128) | [images/icone-128.png](images/icone-128.png) |
| Screenshots (1280 × 800), dans cet ordre | [1-salle.png](images/1-salle.png), [2-analyse.png](images/2-analyse.png), [3-joueurs.png](images/3-joueurs.png), [4-niveaux.png](images/4-niveaux.png), [5-popup.png](images/5-popup.png) |
| Small promo tile (440 × 280) | [images/tile-440x280.png](images/tile-440x280.png) |
| Marquee promo tile (1400 × 560) | [images/marquee-1400x560.png](images/marquee-1400x560.png) |

Toutes les images sont en PNG 24 bits sans transparence, comme demandé.

### Additional fields

| Champ | Valeur |
|---|---|
| Official URL | `frtv.fr` si le domaine est vérifié dans Google Search Console avec ce compte (badge « site officiel ») ; sinon laisse vide |
| Homepage URL | `https://frtv.fr` |
| Support URL | `https://frtv.fr/contact` |
| Mature content | Désactivé |

---

## 2. Privacy

### Single purpose description

```
Afficher les données de la scène Counter-Strike 2 francophone (FRTV) sur faceit.com : en salle de match (forme des joueurs, Elo FRTV, veto probable, niveaux 11 à 20) et sur les profils, avec un résumé de la scène FR dans la popup.
```

### Permission justification

**storage**
```
Mémoriser localement les réglages de l'utilisateur (fonctions activées ou non) et le dernier onglet ouvert dans la popup.
```

**Host permission justification** (un seul champ pour les deux domaines)
```
https://www.faceit.com/* : le script de contenu ajoute l'interface FRTV aux pages de faceit.com (salle de match, profils). Il lit, avec la session de l'utilisateur, les données du match et des joueurs affichés via les API de faceit.com (même origine) pour calculer la forme, l'Elo et les niveaux.
https://frtv.fr/* : le service d'arrière-plan interroge l'API publique de frtv.fr (classement Elo FRTV des équipes, rating des joueurs, matchs de la scène FR, streams en direct) et met les réponses en cache.
```

### Remote code

**No, I am not using remote code.**
Justification si demandée :
```
Tout le JavaScript est inclus dans le paquet. Les réponses de frtv.fr et de faceit.com sont uniquement des données JSON, jamais exécutées.
```

### Data usage

Coche uniquement **Website content**. Les pseudos et noms d'équipes affichés sur la page FACEIT sont envoyés à frtv.fr pour retrouver les données FRTV correspondantes.

Ne coche pas les autres catégories :
- l'identifiant FACEIT de l'utilisateur est lu mais reste dans le navigateur ;
- aucune donnée d'identité, de localisation, d'historique ou d'authentification n'est collectée.

Coche ensuite les trois engagements :
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

Publie le texte de [politique-confidentialite.md](politique-confidentialite.md) sur frtv.fr, par exemple à `https://frtv.fr/extension/confidentialite` ou comme section de `https://frtv.fr/confidentialite`. Colle ensuite l'adresse ici. Cette page doit être en ligne avant la soumission.

---

## 3. Distribution

| Champ | Valeur |
|---|---|
| Payments | Free of charge |
| Visibility | **Unlisted** pour une bêta avec la communauté (installation par lien uniquement), puis **Public** |
| Distribution | All regions |

---

## 4. Access → Test instructions (en anglais, pour l'équipe de validation)

```
No account or login is needed for the extension itself. It adds information about the French Counter-Strike 2 scene (data from the public API of frtv.fr) to faceit.com pages.

1. Popup: click the toolbar icon. Tabs: "Aujourd'hui" (today's French league matches, filter chips by division), "Elo FRTV" (team ranking), "Live" (French CS2 streams), "Réglages" (feature toggles, applied immediately).
2. Match room: open https://www.faceit.com/fr/cs2/room/1-fce053be-5f31-4c47-a1bf-1bdabe27423a . The match header, player columns (form, Elo trend, FRTV rating) and the "Analyse" card (prediction, likely veto, maps, form) are added by the extension. FACEIT may ask to sign in with a free FACEIT account to show match data.
3. Profiles: click a player name in the room to open their FACEIT profile. The extension adds a level progress card (custom levels 11 to 20 above 2,250 Elo) and a "Scène FR" card for players ranked by FRTV.

All features can be turned off in the popup's "Réglages" tab. The extension is not affiliated with FACEIT.
```

---

## 5. À faire de ton côté (non délégable)

- **Compte :** déclaration Trader ou Non-trader dans les paramètres du compte. Si tu choisis Trader, ton nom, ton adresse et ton téléphone seront publics.
- **Politique de confidentialité :** la mettre en ligne sur frtv.fr.
- **Backend FRTV :** obtenir le feu vert de son propriétaire sur le trafic de l'API (cache de 5 à 60 minutes selon les données).
- **Soumission :** cliquer *Submit for review* quand tous les onglets sont verts.
