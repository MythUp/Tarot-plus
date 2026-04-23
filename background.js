// background.js

chrome.runtime.onInstalled.addListener(() => {
  const keysToEnsure = [
    "enabledExt",
    "shareForum",
    "emoticonsEnabled",
    "unicodeDecodingEnabled",
    "censureEnabled",
    "censureMode",
    "censureScope",
  ];
  chrome.storage.local.get(keysToEnsure, (data) => {
    const defaults = {};
    keysToEnsure.forEach((key) => {
      if (typeof data[key] === "undefined") {
        if (key === "censureMode") {
          defaults[key] = "mask";
        } else if (key === "censureScope") {
          defaults[key] = "insult";
        } else {
          defaults[key] = true;
        }
      }
    });
    if (Object.keys(defaults).length) {
      chrome.storage.local.set(defaults, () => {
        console.log("Clés d'options initialisées par défaut :", Object.keys(defaults));
      });
    }
  });
});
