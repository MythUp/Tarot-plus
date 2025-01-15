// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Initialiser "enabled" sur true si la clé n'existe pas encore
  chrome.storage.local.set({ enabled: true }, () => {
      console.log("Extension activée par défaut.");
  });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  });
  