const tarotUrlPattern = /^https:\/\/.*\.jeu-tarot-en-ligne\.com\/.*/;

document.addEventListener("DOMContentLoaded", () => {
    const toggleExtension = document.getElementById("toggleExtension");
    const toggleShareForum = document.getElementById("toggleShareForum");
    const toggleEmoticons = document.getElementById("toggleEmoticons");
    const toggleUnicodeDecoding = document.getElementById("toggleUnicodeDecoding");
    const toggleCensure = document.getElementById("toggleCensure");
    const censureModeInputs = Array.from(document.querySelectorAll("input[name='censureMode']"));
    const censureScopeInputs = Array.from(document.querySelectorAll("input[name='censureScope']"));
    const openSiteContainer = document.querySelector(".openSiteButton");

    chrome.storage.local.get([
        "enabledExt",
        "shareForum",
        "emoticonsEnabled",
        "unicodeDecodingEnabled",
        "disabledEmoticons",
        "censureEnabled",
        "censureMode",
        "censureScope",
    ], (data) => {
        if (toggleExtension) toggleExtension.checked = data.enabledExt ?? true;
        if (toggleShareForum) toggleShareForum.checked = data.shareForum ?? true;
        if (toggleEmoticons) toggleEmoticons.checked = data.emoticonsEnabled ?? true;
        if (toggleUnicodeDecoding) toggleUnicodeDecoding.checked = data.unicodeDecodingEnabled ?? true;
        if (toggleCensure) toggleCensure.checked = data.censureEnabled ?? true;
        setRadioValue(censureModeInputs, data.censureMode ?? "mask");
        setRadioValue(censureScopeInputs, data.censureScope ?? "insult");
        syncCensureUiState();
        const disabledEmoticons = data.disabledEmoticons ?? {};
        loadEmoticons(disabledEmoticons);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        const isTarotSite = tarotUrlPattern.test(tab.url ?? "");

        if (isTarotSite) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    func: () => {
                        const root = document.getElementById("webBody");
                        return root && root.classList.contains("themeSombre");
                    }
                },
                (results) => {
                    if (chrome.runtime.lastError || !results || !results[0]) return;
                    const isDark = results[0].result;
                    document.body.classList.toggle("dark-mode", isDark);
                    chrome.storage.local.set({ tarotTheme: isDark ? "dark" : "light" });
                }
            );
        } else {
            chrome.storage.local.get("tarotTheme", ({ tarotTheme }) => {
                document.body.classList.toggle("dark-mode", tarotTheme === "dark");
            });
        }

        if (openSiteContainer) {
            if (isTarotSite) {
                openSiteContainer.style.display = "none";
                console.log("Masquage du bouton d'ouverture de site.");
            } else {
                openSiteContainer.style.display = "";
            }
        }
    });

    if (toggleExtension) {
        toggleExtension.addEventListener("change", () => {
            ensureAndSet("enabledExt", toggleExtension.checked);
        });
    }

    if (toggleShareForum) {
        toggleShareForum.addEventListener("change", () => {
            ensureAndSet("shareForum", toggleShareForum.checked, false);
        });
    }

    if (toggleEmoticons) {
        toggleEmoticons.addEventListener("change", () => {
            ensureAndSet("emoticonsEnabled", toggleEmoticons.checked, false);
        });
    }

    if (toggleUnicodeDecoding) {
        toggleUnicodeDecoding.addEventListener("change", () => {
            ensureAndSet("unicodeDecodingEnabled", toggleUnicodeDecoding.checked, false);
        });
    }

    if (toggleCensure) {
        toggleCensure.addEventListener("change", () => {
            ensureAndSet("censureEnabled", toggleCensure.checked, false);
            syncCensureUiState();
        });
    }

    censureModeInputs.forEach((input) => {
        input.addEventListener("change", () => {
            if (!input.checked) return;
            ensureAndSet("censureMode", input.value, false);
            syncCensureUiState();
        });
    });

    censureScopeInputs.forEach((input) => {
        input.addEventListener("change", () => {
            if (!input.checked) return;
            ensureAndSet("censureScope", input.value, false);
        });
    });

    const manifestData = chrome.runtime.getManifest();
    const versionElement = document.getElementById("version");
    if (versionElement) {
        versionElement.textContent = manifestData.version;
    }

    const openButton = document.getElementById("openSiteButton");
    if (openButton) {
        openButton.addEventListener("click", () => {
            chrome.tabs.create({ url: "https://jeu-tarot-en-ligne.com/" });
        });
    }

    initReloadButtons();

    function syncCensureUiState() {
        const selectedMode = getSelectedRadioValue(censureModeInputs) ?? "mask";
        const disableScope = selectedMode === "delete";

        censureScopeInputs.forEach((input) => {
            input.disabled = disableScope;
        });

        const panel = document.getElementById("censureOptions");
        if (panel) {
            panel.classList.toggle("opacity-50", !toggleCensure?.checked);
        }
    }
});

function setRadioValue(inputs, value) {
    inputs.forEach((input) => {
        input.checked = input.value === value;
    });
}

function getSelectedRadioValue(inputs) {
    const selected = inputs.find((input) => input.checked);
    return selected ? selected.value : null;
}

// Charger les émoticônes et les afficher
function loadEmoticons(disabledEmoticons) {
    const carouselInner = document.getElementById("emoticonsCarouselInner");
    if (!carouselInner) return;

    carouselInner.innerHTML = "";

    const total = 65;
    const perSlide = 16;

    for (let i = 0; i < total; i += perSlide) {
        const isActive = i === 0 ? "active" : "";
        const slide = document.createElement("div");
        slide.className = `carousel-item ${isActive}`;

        const wrapper = document.createElement("div");
        wrapper.className = "d-flex flex-wrap justify-content-center gap-2 p-2";

        for (let j = i; j < Math.min(i + perSlide, total); j++) {
            const id = `Emoticon${j}`;
            const src = `https://raw.githubusercontent.com/MythUp/tarot-plus/refs/heads/main/emots/Emoticon${j}.png`;
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

function showReloadPrompt() {
    const reloadPrompt = document.getElementById("reloadHint");
    if (reloadPrompt) {
        reloadPrompt.classList.remove("d-none");
    }
}

function hideReloadPrompt() {
    const reloadPrompt = document.getElementById("reloadHint");
    if (reloadPrompt) {
        reloadPrompt.classList.add("d-none");
    }
}

function initReloadButtons() {
    const reloadButton = document.getElementById("reloadPageButton");
    const dismissButton = document.getElementById("dismissReloadButton");

    if (reloadButton) {
        reloadButton.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                if (!activeTab || typeof activeTab.id === "undefined") return;

                const tabId = activeTab.id;
                const isTarotSite = tarotUrlPattern.test(activeTab.url ?? "");

                const executeStartGame = () => {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            chrome.storage.local.get("shouldStartGame", (data) => {
                                if (data.shouldStartGame && typeof window.startGame === "function") {
                                    window.startGame();
                                }
                            });
                        }
                    });
                };

                const finalizeReload = () => {
                    chrome.tabs.reload(tabId, () => {
                        if (isTarotSite) {
                            executeStartGame();
                        }
                        chrome.storage.local.set({ needsReload: false });
                    });
                };

                if (isTarotSite) {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            const inputElement = document.getElementById("modeleJeuCartes");
                            const shouldStartGame = inputElement && inputElement.value === "0";
                            chrome.storage.local.set({ shouldStartGame });
                        }
                    }, finalizeReload);
                } else {
                    finalizeReload();
                }
            });

            hideReloadPrompt();
        });
    }

    if (dismissButton) {
        dismissButton.addEventListener("click", () => {
            hideReloadPrompt();
        });
    }
}

function promptReloadIfNeeded() {
    showReloadPrompt();
    chrome.storage.local.set({ needsReload: true });
}

function ensureAndSet(key, value, promptReload = true) {
    chrome.storage.local.set({ [key]: value }, () => {
        console.log(`${key} maintenant ${value}`);
        if (promptReload) {
            promptReloadIfNeeded();
        }
    });
}
