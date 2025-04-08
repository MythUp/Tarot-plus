chrome.storage.local.get(["enabled", "shareForum", "disabledEmoticons"], (data) => {
    if (data.enabled && data.shareForum) {
        console.log("Extension activée et bouton de partage activé");

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

        // Bouton "Envoyer au salon"
        if (location.hostname.endsWith("jeu-tarot-en-ligne.com") && location.pathname.startsWith("/forum-sujet/")) {
            const insertShareButton = () => {
                const h2List = document.querySelectorAll("h2.noMarginTop");

                h2List.forEach(h2 => {
                    const a = h2.querySelector("a");
                    if (a && !h2.querySelector(".followSujBtn")) {
                        const btn = document.createElement("button");
                        btn.className = "btn btn-lg btn-warning pbtn button followSujBtn";
                        btn.textContent = "Envoyer au salon";
                        btn.setAttribute("onclick", "showDialog();");

                        const separator = document.createTextNode(" | ");

                        h2.appendChild(separator);
                        h2.appendChild(btn);

                        console.log("Bouton 'Envoyer au salon' ajouté.");
                    }
                });
            };

            insertShareButton();

            const forumObserver = new MutationObserver(insertShareButton);
            forumObserver.observe(document.body, { childList: true, subtree: true });
        }

    } else {
        console.log("Extension ou bouton de partage désactivé.");
    }
});
