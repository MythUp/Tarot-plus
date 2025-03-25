// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Initialiser "enabled" sur true si la clé n'existe pas encore
  chrome.storage.local.set({ enabled: true }, () => {
      console.log("Extension activée par défaut.");
  });
});
