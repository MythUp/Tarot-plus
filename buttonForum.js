(function () {
    console.log("[EXT] Injection du bouton forum");

    const BUTTON_WRAPPER_SELECTOR = 'span[data-forum-share-button="true"]';
    const BUTTON_TEXT = "Envoyer au salon";
    let enabled = document.documentElement?.dataset.forumShareButtonEnabled !== "false";
    let retryTimer = null;

    function isForumPage() {
        return location.hostname.endsWith("jeu-tarot-en-ligne.com") &&
               /^\/forum-sujet(\/\d+(\/[^/]+)?)?$/.test(location.pathname);
    }

    function clearRetryTimer() {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    }

    function removeButtons() {
        clearRetryTimer();
        document.querySelectorAll(BUTTON_WRAPPER_SELECTOR).forEach((node) => node.remove());
    }

    function ensureDialogHandler() {
        if (typeof window.envoyerLienForumAuSalon === "function") {
            return;
        }

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

    function buildButton() {
        const btn = document.createElement("button");
        btn.className = "btn ptobt btn-success pbtn";
        btn.textContent = BUTTON_TEXT;

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
            ensureDialogHandler();

            document.querySelector(`#${dialogId} input[type=button]`).onclick = (e) => {
                window.envoyerLienForumAuSalon(e);
                window.closeDialog(dialogId);
            };
        };

        return btn;
    }

    function syncButtons() {
        removeButtons();

        if (!enabled || !isForumPage()) {
            return;
        }

        const h2List = document.querySelectorAll("h2.noMarginTop");

        if (h2List.length === 0) {
            clearRetryTimer();
            retryTimer = setTimeout(syncButtons, 500);
            return;
        }

        ensureDialogHandler();

        h2List.forEach((h2) => {
            const wrapper = document.createElement("span");
            wrapper.setAttribute("data-forum-share-button", "true");
            wrapper.appendChild(document.createTextNode(" | "));
            wrapper.appendChild(buildButton());
            h2.appendChild(wrapper);
            console.log("[EXT] Bouton 'Envoyer au salon' injecté.");
        });
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        syncButtons();
    }

    document.addEventListener("forum-share-button-state", (event) => {
        if (!event || !event.detail || typeof event.detail.enabled === "undefined") {
            return;
        }

        setEnabled(event.detail.enabled);
    });

    if (window.__forumShareButtonController && window.__forumShareButtonController.__initialized) {
        window.__forumShareButtonController.refresh();
        return;
    }

    window.__forumShareButtonController = {
        __initialized: true,
        setEnabled,
        refresh: syncButtons,
        destroy: () => {
            enabled = false;
            removeButtons();
        }
    };

    syncButtons();
})();