(function () {
    console.log("[EXT] Injection du bouton forum");

    function isForumPage() {
        return location.hostname.endsWith("jeu-tarot-en-ligne.com") &&
               /^\/forum-sujet(\/\d+(\/[^/]+)?)?$/.test(location.pathname);
    }

    function tryInjectButton() {
        if (!isForumPage()) {
            console.log("[EXT] Pas une page forum-sujet, on ignore.");
            return;
        }

        const h2List = document.querySelectorAll("h2.noMarginTop");

        if (h2List.length === 0) {
            setTimeout(tryInjectButton, 500); // Attente du DOM si non prêt
            return;
        }

        h2List.forEach(h2 => {
            if (h2.querySelector(".followSujBtn")) return; // Évite doublon

            const btn = document.createElement("button");
            btn.className = "btn ptobt btn-success pbtn";
            btn.textContent = "Envoyer au salon";

            btn.onclick = () => {
                const baseURL = location.origin + location.pathname.split("/").slice(0, 3).join("/") + "/";

                const resHTML = `
                    <form onsubmit="return false;">
                        <label>Message &#224; envoyer dans le salon :</label><br />
                        <textarea id="forumChatMsg" class="form-control shorty" style="height: 100px;">${baseURL}</textarea>
                        <div class="clear" style="margin-top:10px;"></div>
                        <input class="btn ptobt btn-success pbtn" type="button" value="Envoyer" />
                    </form>
                `;

                const dialogId = showDialog("Partager ce sujet dans le salon", resHTML);

                if (typeof window.envoyerLienForumAuSalon !== "function") {
                    window.envoyerLienForumAuSalon = function (event) {
                        event.stopPropagation();
                        const input = document.getElementById("forumChatMsg");
                        if (!input) return;

                        const msg = input.value.trim();
                        if (!msg) return;

                        if ($('#modeJeuSalon').length === 0) {
                            $('body').append('<input type="hidden" id="modeJeuSalon" value="fromForum">');
                        }

                        appelInviterregisterRefreshDynamicInfos(
                            'etape=dynamic&sendChatMsg=' + escape(msg).split('+').join('%2B')
                        );
                    };
                }

                document.querySelector(`#${dialogId} input[type=button]`).onclick = (e) => {
                    window.envoyerLienForumAuSalon(e);
                    window.closeDialog(dialogId);
                };
            };

            h2.appendChild(document.createTextNode(" | "));
            h2.appendChild(btn);
            console.log("[EXT] Bouton 'Envoyer au salon' injecté.");
        });
    }

    tryInjectButton();
})();