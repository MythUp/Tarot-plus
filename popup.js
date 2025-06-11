document.addEventListener("DOMContentLoaded", () => {
    const toggleExtension = document.getElementById("toggleExtension");
    const toggleShareForum = document.getElementById("toggleShareForum");
    const toggleEmoticons = document.getElementById("toggleEmoticons");
    const openSiteContainer = document.querySelector(".openSiteButton");

    // Synchroniser les cases à cocher avec l'état stocké ou utiliser true par défaut
    chrome.storage.local.get(["enabledExt", "shareForum", "emoticonsEnabled", "disabledEmoticons"], (data) => {
        toggleExtension.checked = data.enabledExt ?? true;
        toggleShareForum.checked = data.shareForum ?? true;
        toggleEmoticons.checked = data.emoticonsEnabled ?? true;
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
        chrome.storage.local.set({ enabledExt: toggleExtension.checked }, () => {
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

    // Écouter les changements de la case à cocher de partage sur le forum
    toggleShareForum.addEventListener("change", () => {
        chrome.storage.local.set({ shareForum: toggleShareForum.checked }, () => {
            console.log("État du bouton de partage mis à jour :", toggleShareForum.checked);
        });
    });

    // Écouter les changements de la case à cocher pour les émoticônes
    toggleEmoticons.addEventListener("change", () => {
        chrome.storage.local.set({ emoticonsEnabled: toggleEmoticons.checked }, () => {
            console.log("Émoticônes activées ?", toggleEmoticons.checked);
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
    const carouselInner = document.getElementById("emoticonsCarouselInner");
    if (!carouselInner) return;

    carouselInner.innerHTML = "";

    const total = 84;
    const perSlide = 12;

    for (let i = 0; i < total; i += perSlide) {
        const isActive = i === 0 ? "active" : "";
        const slide = document.createElement("div");
        slide.className = `carousel-item ${isActive}`;

        const wrapper = document.createElement("div");
        wrapper.className = "d-flex flex-wrap justify-content-center gap-2 p-2";

        for (let j = i; j < Math.min(i + perSlide, total); j++) {
            const id = `Emoticon${j}`;
            const src = `https://amu11er.github.io/Emoticon${j}.png`;
            const img = createEmoticon(id, src, disabledEmoticons);
            wrapper.appendChild(img);
        }

        slide.appendChild(wrapper);
        carouselInner.appendChild(slide);
    }
}



// Créer un élément d'émoticône
function createEmoticon(id, src, disabledEmoticons) {
    const imgElement = document.createElement("img");
    imgElement.src = src;
    imgElement.width = 32;
    imgElement.height = 32;
    imgElement.classList.add("img-thumbnail", "p-1");
    imgElement.dataset.id = id;
    imgElement.style.cursor = "pointer";

    if (disabledEmoticons[id]) {
        imgElement.classList.add("opacity-25");
    }

    imgElement.addEventListener("click", () => toggleEmoticon(id, imgElement));
    return imgElement;
}


// Activer ou désactiver une émoticône
function toggleEmoticon(emoticonId, imgElement) {
    chrome.storage.local.get("disabledEmoticons", (data) => {
        const disabledEmoticons = data.disabledEmoticons ?? {};

        const isInactive = imgElement.classList.contains("opacity-25");

        if (isInactive) {
            delete disabledEmoticons[emoticonId];
            imgElement.classList.remove("opacity-25");
        } else {
            disabledEmoticons[emoticonId] = true;
            imgElement.classList.add("opacity-25");
        }

        chrome.storage.local.set({ disabledEmoticons }, () => {
            console.log(`État de ${emoticonId} mis à jour.`);
        });
    });
}

