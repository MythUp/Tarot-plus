document.addEventListener("DOMContentLoaded", () => {
    const toggleExtension = document.getElementById("toggleExtension");
    const openSiteContainer = document.querySelector(".openSiteButton");

    // Synchroniser la case à cocher avec l'état stocké ou utiliser true par défaut
    chrome.storage.local.get(["enabled", "disabledEmoticons"], (data) => {
        toggleExtension.checked = data.enabled ?? true; // Activer l'extension par défaut
        const disabledEmoticons = data.disabledEmoticons ?? {};
        loadEmoticons(disabledEmoticons);
    });

    // Masquer le bouton si on est déjà sur le site de tarot
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const urlPattern = /^https:\/\/.*\.jeu-tarot-en-ligne\.com\/.*/;

        if (activeTab && urlPattern.test(activeTab.url)) {
            openSiteContainer.style.display = "none";
            console.log("Masquage du bouton d'ouverture de site.");
        }
    });

    // Écouter les changements de la case à cocher
    toggleExtension.addEventListener("change", () => {
        chrome.storage.local.set({ enabled: toggleExtension.checked }, () => {
            console.log("État de l'extension mis à jour :", toggleExtension.checked);

            // Recharger la page si on est sur le site de tarot
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                const urlPattern = /^https:\/\/.*\.jeu-tarot-en-ligne\.com\/.*/;
            
                if (activeTab && urlPattern.test(activeTab.url)) {
                    // Vérifier si l'input caché est présent avant le rechargement
                    chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: () => {
                            const inputElement = document.getElementById("modeleJeuCartes");
                            const shouldStartGame = inputElement && inputElement.value === "0";
                            chrome.storage.local.set({ shouldStartGame });
                        }
                            }, () => {
                                // Recharger la page après avoir vérifié la condition
                                chrome.tabs.reload(activeTab.id, () => {
                                    chrome.scripting.executeScript({
                                        target: { tabId: activeTab.id },
                                        func: () => {
                                            chrome.storage.local.get("shouldStartGame", (data) => {
                                                if (data.shouldStartGame) {
                                                    console.log("Tentative d'appel de startGame() via la console...");
                                                    
                                                    // Ouvrir la console du navigateur (non garanti sur tous les navigateurs)
                                                    console.log("Pour exécuter startGame() manuellement, tapez : startGame()");
                                                
                                                    // Essayer d'exécuter la fonction directement
                                                    if (typeof window.startGame === 'function') {
                                                        console.log("%cLa fonction startGame() est prête, exécution en cours...", "color: green; font-weight: bold;");
                                                        window.startGame();
                                                    } else {
                                                        console.warn("La fonction startGame() n'est pas encore disponible !");
                                                    }
                                                }
                                            });
                                        }
                                    });
                                });
                                
                            });
                }
            });

        });
    });

    // Afficher la version dynamiquement
    const manifestData = chrome.runtime.getManifest();
    document.getElementById("version").textContent = manifestData.version;

    // Ouvrir le site de tarot dans un nouvel onglet
    document.getElementById("openSiteButton").addEventListener("click", () => {
        chrome.tabs.create({ url: "https://jeu-tarot-en-ligne.com/" });
    });
});

// Charger les émoticônes et les afficher
function loadEmoticons(disabledEmoticons) {
    const emoticonsList = document.getElementById("emoticonsList");
    if (!emoticonsList) {
        console.error("Liste des émoticônes introuvable. Vérifiez l'élément avec ID 'emoticonsList'.");
        return;
    }

    emoticonsList.innerHTML = ""; // Vider la liste avant de charger

    // Ajouter les émoticônes
    for (let i = 0; i < 84; i++) {
        createEmoticon(
            `Emoticon${i}`,
            `https://amu11er.github.io/Emoticon${i}.png`,
            disabledEmoticons,
            emoticonsList
        );
    }
}

// Créer un élément d'émoticône
function createEmoticon(id, src, disabledEmoticons, container) {
    const imgElement = document.createElement("img");
    imgElement.src = src;
    imgElement.classList.add("emotIcon");
    imgElement.dataset.id = id;

    // Appliquer l'opacité si désactivé
    if (disabledEmoticons[id]) {
        imgElement.classList.add("inactive");
    }

    // Activer/désactiver au clic
    imgElement.addEventListener("click", () => toggleEmoticon(id, imgElement));
    container.appendChild(imgElement);
}

// Activer ou désactiver une émoticône
function toggleEmoticon(emoticonId, imgElement) {
    chrome.storage.local.get("disabledEmoticons", (data) => {
        const disabledEmoticons = data.disabledEmoticons ?? {};

        if (imgElement.classList.contains("inactive")) {
            // Activer l'émoticône
            delete disabledEmoticons[emoticonId];
            imgElement.classList.remove("inactive");
        } else {
            // Désactiver l'émoticône
            disabledEmoticons[emoticonId] = true;
            imgElement.classList.add("inactive");
        }

        // Sauvegarder l'état des émoticônes
        chrome.storage.local.set({ disabledEmoticons }, () => {
            console.log(`État de l'émoticône ${emoticonId} mis à jour.`);
        });
    });
}
