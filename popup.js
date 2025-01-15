document.addEventListener("DOMContentLoaded", () => {
    const toggleExtension = document.getElementById("toggleExtension");

    // Synchroniser la case à cocher avec l'état stocké ou utiliser true par défaut
    chrome.storage.local.get(["enabled", "disabledEmoticons"], (data) => {
        toggleExtension.checked = data.enabled ?? true; // Activer l'extension par défaut

        // Charger les états des émoticônes désactivées
        const disabledEmoticons = data.disabledEmoticons ?? {};
        loadEmoticons(disabledEmoticons);
    });

    // Écouter les changements de la case à cocher pour l'activation/désactivation de l'extension
    toggleExtension.addEventListener("change", () => {
        chrome.storage.local.set({ enabled: toggleExtension.checked });
    });
});

function loadEmoticons(disabledEmoticons) {
    const emoticonsList = document.getElementById("emoticonsList");
    const emoticons = [];

    // Ajouter les émoticônes (ici, nous allons supposer qu'il y en a 62 émoticônes)
    for (let i = 0; i < 62; i++) {
        const emoticonId = `Emoticon${i}`;
        emoticons.push(emoticonId);

        const item = document.createElement("div");
        item.classList.add("d-flex", "align-items-center", "mb-2");

        // Créer une émoticône cliquable
        const imgElement = document.createElement("img");
        imgElement.src = `https://jeu-tarot-en-ligne.com/images/Emoticon/Emoticon${i}.png?v2`;
        imgElement.classList.add("emotIcon");
        imgElement.dataset.id = emoticonId;

        // Appliquer l'opacité si l'émoticône est désactivée
        if (disabledEmoticons[emoticonId]) {
            imgElement.classList.add("inactive");
        }

        // Ajouter l'élément à la liste
        emoticonsList.appendChild(imgElement);

        // Ajouter un événement de clic sur l'image pour activer/désactiver
        imgElement.addEventListener("click", () => toggleEmoticon(emoticonId, imgElement));
    }
}

function toggleEmoticon(emoticonId, imgElement) {
    chrome.storage.local.get("disabledEmoticons", (data) => {
        const disabledEmoticons = data.disabledEmoticons ?? {};

        // Si l'émoticône est activée, on la désactive
        if (imgElement.classList.contains("inactive")) {
            delete disabledEmoticons[emoticonId];
            imgElement.classList.remove("inactive");
        } else {
            disabledEmoticons[emoticonId] = true;
            imgElement.classList.add("inactive");
        }

        // Sauvegarder l'état dans le stockage local
        chrome.storage.local.set({ disabledEmoticons });
    });
}
