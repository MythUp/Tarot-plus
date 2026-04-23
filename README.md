# Tarot+

Tarot+ est une extension pour https://jeu-tarot-en-ligne.com qui enrichit l'interface en ajoutant des émoticônes, des corrections d'émojis et un bouton de partage pour les sujets du forum.

## Installation

- Depuis les stores :
  - Microsoft Edge Add-ons : https://microsoftedge.microsoft.com/addons/detail/jeutarotenlignecom•em/cjbhkjcikmgcmimfohpeidokeffgfibj
  - Opera Add-ons : https://addons.opera.com/fr/extensions/details/jeu-tarot-en-lignecomemoji/
- Développement / installation locale :
  1. Télécharger ou cloner le projet depuis GitHub :
     ```bash
     git clone https://github.com/MythUp/Tarot-plus.git
     ```
  2. Ouvrir la page Extensions du navigateur et activer le mode développeur.
  3. Cliquer sur « Charger l'extension non empaquetée » et sélectionner le dossier du projet.

## Fonctionnalités

- Émoticônes (réactions) : débloque la totalité des émoticônes du jeu et ajoute des émoticônes inédites propres à l'extension.
- Émojis (corrections Unicode) : applique des correctifs pour assurer l'affichage des caractères Unicode que le site ne prend pas correctement en charge.
- Censure du chat : masque, révélé au clic, ou supprime les messages contenant des mots indésirables.
- Bouton forum : affiche un bouton à côté du titre d'un sujet pour partager facilement le lien du sujet dans le chat du salon.

## Détails

- Fichiers principaux :
  - `manifest.json` — métadonnées et permissions.
  - `content.js` — injection côté page pour intégrer l'interface.
  - `background.js` — service worker.
  - `popup.html`, `popup.js`, `popup.css` — interface de la popup.
  - `buttonForum.js`, `emot.js`, `unicodeBridge.js` — utilitaires et adaptations.
  - `emots/` — dossier contenant les émoticônes.
- Permissions (extraites de `manifest.json`) : `activeTab`, `storage`, `scripting`, `tabs`.
- Hôte ciblé : `https://*.jeu-tarot-en-ligne.com/*`.
- Vie privée : tout fonctionne localement dans l'extension ; vos informations personnelles ne sont jamais collectées ni transmises.
