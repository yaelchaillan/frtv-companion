# Installer la version de test de FRTV Companion

FRTV Companion est en cours de validation sur le Chrome Web Store. En attendant, tu peux l'installer à la main en quelques minutes. Ça fonctionne sur Chrome, Edge, Brave et Opera.

## Installation

1. Télécharge le fichier **`frtv-companion-…-chrome.zip`** de la dernière version :
   https://github.com/yaelchaillan/frtv-companion/releases/latest
   Ne prends pas « Source code » : il faudrait le compiler.
2. Clic droit sur le zip, puis **Extraire tout**. Range le dossier obtenu dans un endroit où il restera, par exemple `Documents\FRTV Companion`. Chrome charge l'extension depuis ce dossier : s'il est supprimé, l'extension disparaît.
3. Ouvre **`chrome://extensions`** dans la barre d'adresse.
   - Edge : `edge://extensions`
   - Brave : `brave://extensions`
   - Opera : `opera://extensions`
4. Active le **Mode développeur**, en haut à droite (à gauche sur Edge).
5. Clique sur **Charger l'extension non empaquetée**. Choisis le dossier extrait, celui qui contient le fichier `manifest.json`.
6. Épingle l'extension : clique sur l'icône en forme de pièce de puzzle, puis sur l'épingle à côté de FRTV Companion.
7. Recharge les onglets faceit.com déjà ouverts.

Si le navigateur affiche un avertissement sur les extensions en mode développeur, c'est normal pour une version de test : garde l'extension.

## Ce que tu dois voir

- **Popup** : clique sur l'icône FRTV. Tu y trouves les matchs FR du jour, l'Elo FRTV, les streams en direct et les réglages.
- **Salle de match FACEIT** : forme des joueurs, groupes de matchmaking, analyse du match et niveaux 11 à 20.
- **Profil FACEIT** : progression vers le niveau suivant et carte « Scène FR ».

## Mettre à jour

1. Télécharge le nouveau zip depuis la même page.
2. Remplace le contenu de ton dossier par celui du nouveau zip.
3. Sur `chrome://extensions`, clique sur la flèche circulaire ↻ de la carte FRTV Companion.
4. Recharge tes onglets faceit.com.

## Quand la version officielle sortira

Supprime d'abord la version de test : sur `chrome://extensions`, clique sur **Supprimer** dans la carte FRTV Companion. Installe ensuite la version du Chrome Web Store. Les mises à jour seront alors automatiques.

Si tu gardes les deux, les blocs FRTV s'afficheront en double sur FACEIT. Tes réglages ne sont pas repris : refais-les dans la popup.

## Un problème ?

Envoie une capture d'écran et l'adresse de la page FACEIT concernée. Tu peux aussi ouvrir une *issue* : https://github.com/yaelchaillan/frtv-companion/issues

FRTV Companion n'est pas affilié à FACEIT.
