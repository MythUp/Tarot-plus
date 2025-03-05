chrome.storage.local.get(["enabled", "disabledEmoticons"], (data) => {
    if (data.enabled) {
        console.log("Extension activée");

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

                            // Récupérer les émoticônes activées/désactivées
                            const disabledEmoticons = data.disabledEmoticons ?? {};

                            // Ajouter les émoticônes
                            for (let i = 0; i < 84; i++) {
                                const emoticonId = `Emoticon${i}`;
                                if (!disabledEmoticons[emoticonId]) {
                                    emoticonHtml += `<img onclick="sendEmot(${i});" src="https://amu11er.github.io/Emoticon${i}.png" class="emotIcon">`;
                                }
                            }

                            // Remplacer le contenu du <td> avec les émoticônes activées
                            tdElement.innerHTML = emoticonHtml;
                        }
                    }, 500); // Attente de 0.5 seconde
                } else {
                    console.log("<td> contient <input>, aucun remplacement effectué.");
                }
            }
        };

        // Configurer un MutationObserver pour surveiller tout le DOM
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

        // Observer le corps du document pour surveiller tous les changements
        observer.observe(document.body, { childList: true, subtree: true });

        console.log("Observation continue activée sur le DOM.");

        
        // Créer une balise <script>
        const scriptElement = document.createElement("script");
        scriptElement.src = chrome.runtime.getURL("emot.js"); // Charger le script local
        scriptElement.type = "text/javascript";
        scriptElement.onload = () => {
          console.log("Script de remplacement injecté avec succès !");
        };
        
        // Injecter le script juste avant la balise </body>
        document.body.appendChild(scriptElement);
        
        // Confirmer l'injection
        console.log("Le script est ajouté juste avant la fermeture de </body>");

    } else {
        console.log("Extension désactivée.");
    }
});