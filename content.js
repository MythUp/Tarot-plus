chrome.storage.local.get(["enabledExt", "shareForum", "emoticonsEnabled", "disabledEmoticons"], (data) => {
    if (data.enabledExt) {
        console.log("Extension activée");

        if (data.emoticonsEnabled) {
            // Fonction pour remplacer le contenu du <td>, sauf s'il contient un <input> spécifique
            const replaceTdContent = () => {
                const tdElement = document.querySelector("#chatBg td#chtput");
                if (tdElement) {
                    const inputElement = tdElement.querySelector("input#chatInput");

                    if (!inputElement) {
                        console.log("Élément <td> trouvé et ne contient pas <input>. Remplacement dans 0.5 seconde...");
                        setTimeout(() => {
                            if (tdElement && !tdElement.querySelector("input#chatInput")) {
                                console.log("Remplacement en cours...");
                                let emoticonHtml = "";

                                const disabledEmoticons = data.disabledEmoticons ?? {};

                                for (let i = 0; i < 84; i++) {
                                    const emoticonId = `Emoticon${i}`;
                                    if (!disabledEmoticons[emoticonId]) {
                                        emoticonHtml += `<img onclick="sendEmot(${i});" src="https://amu11er.github.io/Emoticon${i}.png" class="emotIcon">`;
                                    }
                                }

                                tdElement.innerHTML = emoticonHtml;
                            }
                        }, 500);
                    } else {
                        console.log("<td> contient <input>, aucun remplacement effectué.");
                    }
                }
            };

            const observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (
                        mutation.type === "childList" || 
                        mutation.type === "subtree" ||
                        mutation.target.matches("#chatBg")
                    ) {
                        replaceTdContent();
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
            console.log("Observation continue activée sur le DOM.");

            const scriptElement = document.createElement("script");
            scriptElement.src = chrome.runtime.getURL("emot.js");
            scriptElement.type = "text/javascript";
            scriptElement.onload = () => {
                console.log("Script de remplacement injecté avec succès !");
            };
            document.body.appendChild(scriptElement);
        }

        //Bouton de partage de sujet de forum
        if (data.shareForum) {
            const injectScript = (file) => {
              const script = document.createElement('script');
              script.src = chrome.runtime.getURL(file);
              script.onload = () => script.remove();
              (document.head || document.documentElement).appendChild(script);
            };          
            // Injecte le script dans la page
            injectScript('buttonForum.js');
            // Ensuite on observe et appelle la fonction exposée par inject.js
            const waitForForum = () => {
              const isForumPage = location.pathname.startsWith("/forum-sujet/");
              if (!isForumPage) return;         
              const observer = new MutationObserver(() => {
                if (typeof window.injectForumButton === "function") {
                  window.injectForumButton();
                }
              });           
              observer.observe(document.body, { childList: true, subtree: true });          
              // Appel immédiat si déjà prêt
              setTimeout(() => {
                if (typeof window.injectForumButton === "function") {
                  window.injectForumButton();
                } else {
                  console.log("🔁 [EXT] injectForumButton pas encore dispo");
                }
              }, 300);
            };          
            waitForForum();
        }

    } else {
        console.log("Extension désactivé.");
    }
});
