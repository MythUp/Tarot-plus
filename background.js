// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Initialiser "enabled" sur true si la clé n'existe pas encore
  chrome.storage.local.set({ enabled: true }, () => {
      console.log("Extension activée par défaut.");
  });
});

chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    files: ["injector.js"]
  });
}, {
  url: [{ urlMatches: "https://*.jeu-tarot-en-ligne.com/*" }]
});
