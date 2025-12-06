const isDark = document.querySelector("#webBody.themeSombre") !== null;
let isReplacingEmoticons = false;

chrome.storage.local.set({ tarotTheme: isDark ? "dark" : "light" }, () => {
  console.log("[EXT] Thème actuel enregistré :", isDark ? "dark" : "light");
});

chrome.storage.local.get(
  ["enabledExt", "shareForum", "emoticonsEnabled", "disabledEmoticons"],
  (data) => {
    if (!data.enabledExt) return console.log("[EXT] ❌ Extension désactivée.");

    console.log("[EXT] ✅ Extension activée.");

    // === 🔹 EMOTICONS PERSONNALISÉES ===
    if (data.emoticonsEnabled) {
      console.log("[EXT] 🎨 Mode émoticônes personnalisé activé.");

      // Génère le HTML des émoticônes autorisées
      const generateEmoticonsHTML = (disabled = {}) => {
        let html = "";
        for (let i = 0; i < 65; i++) {
          const id = `Emoticon${i}`;
          if (!disabled[id]) {
            html += `<img onclick="sendEmot(${i});" src="https://raw.githubusercontent.com/MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/dev/emots/Emoticon${i}.png" class="emotIcon" style="margin: 0 4px;">`;
          }
        }
        return html;
      };

      const isMine = (img) => img.src.includes("MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/");

      const updateEmoticons = () => {
        const td = document.querySelector("#chatBg td#chtput");
        if (!td || td.querySelector("input#chatInput")) return;

        chrome.storage.local.get(["disabledEmoticons"], (storage) => {
          const disabled = storage.disabledEmoticons ?? {};
          td.innerHTML = generateEmoticonsHTML(disabled);
          console.log("[EXT] 🔁 Émoticônes mises à jour dynamiquement.");
        });
      };

      const replaceTdContentIfNeeded = () => {
        const td = document.querySelector("#chatBg td#chtput");
        if (!td || td.querySelector("input#chatInput")) {
          console.log("[EXT] ⏸️ <td> indisponible ou contient un <input>. Annulation.");
          return;
        }

        const emotes = td.querySelectorAll("img");
        const hasMine = Array.from(emotes).every(isMine);
        if (hasMine) {
          console.log("[EXT] ✅ Émoticônes déjà injectées.");
          return;
        }

        console.log("[EXT] 🔄 Remplacement des émoticônes du site...");
        isReplacingEmoticons = true;
        updateEmoticons();
        isReplacingEmoticons = false;
      };

      // Surveiller le DOM
      const observer = new MutationObserver(() => {
        if (isReplacingEmoticons) return;
        replaceTdContentIfNeeded();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      console.log("[EXT] 👁️ Observation du DOM activée.");

      // Mise à jour automatique si on change la sélection des émoticônes dans les options
      chrome.storage.onChanged.addListener((changes, ns) => {
        if (ns === "local" && changes.disabledEmoticons) {
          console.log("[EXT] 🆕 Changement détecté dans la config des émoticônes.");
          updateEmoticons();
        }
      });

      // Injecte le script nécessaire
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("emot.js");
      script.type = "text/javascript";
      script.onload = () =>
        console.log("[EXT] 📦 Script emot.js injecté avec succès !");
      document.body.appendChild(script);
    }

    // === 🔹 BOUTON "ENVOYER AU SALON" SUR LE FORUM ===
    if (data.shareForum && location.pathname.startsWith("/forum")) {
      const injectScript = (file) => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(file);
        (document.head || document.documentElement).appendChild(script);
      };

      const isForumSujetURL = (url) => url.includes("/forum-sujet/");
      let lastURL = location.href;

      // Injection immédiate si déjà sur une page forum-sujet
      if (isForumSujetURL(lastURL)) {
        console.log("[EXT] 💬 Injection immédiate de buttonForum.js");
        injectScript("buttonForum.js");
      }

      // Surveiller les navigations AJAX dans le forum
      setInterval(() => {
        const currentURL = location.href;
        if (currentURL !== lastURL) {
          lastURL = currentURL;
          if (isForumSujetURL(currentURL)) {
            console.log("[EXT] 📡 Passage à une page forum-sujet détecté :", currentURL);
            injectScript("buttonForum.js");
          }
        }
      }, 1000);
    }
  }
);
