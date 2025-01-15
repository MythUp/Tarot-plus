document.addEventListener("DOMContentLoaded", () => {
  const toggleCheckbox = document.getElementById("toggleExtension");

  // Synchroniser la case à cocher avec l'état stocké ou utiliser true par défaut
  chrome.storage.local.get("enabled", (data) => {
      toggleCheckbox.checked = data.enabled ?? true; // Activer par défaut
  });

  // Écouter les changements de la case à cocher
  toggleCheckbox.addEventListener("change", () => {
      chrome.storage.local.set({ enabled: toggleCheckbox.checked }, () => {
          console.log("État de l'extension mis à jour :", toggleCheckbox.checked);
      });
  });
});
