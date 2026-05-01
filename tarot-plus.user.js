// ==UserScript==
// @name         Tarot+
// @namespace    https://github.com/MythUp/Tarot-plus
// @version      4.0.0
// @description  Ajoute des fonctionnalités à jeu-tarot-en-ligne.com pour améliorer votre expérience de jeu et corriger des bugs.
// @author       Alban Muller
// @match        https://*.jeu-tarot-en-ligne.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @require      https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // =====================================================================
  // CONSTANTES
  // =====================================================================

  const TAROT_PLUS_VERSION = "4.0.0";
  const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/MythUp/Tarot-plus/refs/heads/main/";

  // =====================================================================
  // COUCHE DE STOCKAGE (remplace chrome.storage.local)
  // =====================================================================

  function gmGet(key, defaultValue) {
    const raw = GM_getValue(key, undefined);
    if (raw === undefined) return defaultValue;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  function gmSet(key, value) {
    GM_setValue(key, JSON.stringify(value));
  }

  function gmDelete(key) {
    GM_deleteValue(key);
  }

  const storageOnChangedListeners = [];

  const storageLocal = {
    get(keys, callback) {
      const result = {};
      const keyList = Array.isArray(keys) ? keys : (typeof keys === "object" ? Object.keys(keys) : [keys]);
      for (const key of keyList) {
        const val = gmGet(key, undefined);
        result[key] = val !== undefined ? val : (typeof keys === "object" ? keys[key] : undefined);
      }
      callback(result);
    },
    set(items, callback) {
      const changes = {};
      for (const [key, newValue] of Object.entries(items)) {
        const oldValue = gmGet(key, undefined);
        gmSet(key, newValue);
        changes[key] = { oldValue, newValue };
      }
      if (callback) callback();
      storageOnChangedListeners.forEach(fn => fn(changes, "local"));
    },
    remove(keys, callback) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const key of keyList) { gmDelete(key); }
      if (callback) callback();
    },
  };

  const storageOnChanged = {
    addListener(fn) { storageOnChangedListeners.push(fn); }
  };

  // Initialisation des valeurs par défaut (équivalent background.js)
  (function initDefaults() {
    const defaults = {
      enabledExt: true,
      shareForum: true,
      emoticonsEnabled: true,
      unicodeDecodingEnabled: true,
      censureEnabled: true,
      censureMode: "mask",
      censureScope: "insult",
    };
    for (const [key, defaultVal] of Object.entries(defaults)) {
      if (gmGet(key, undefined) === undefined) {
        gmSet(key, defaultVal);
      }
    }
  })();

  // =====================================================================
  // URL RESSOURCES (remplace chrome.runtime.getURL)
  // =====================================================================

  function getExtensionURL(path) {
    return GITHUB_RAW_BASE + path;
  }

  // =====================================================================
  // INJECTION DE SCRIPTS EN CONTEXTE PAGE
  // =====================================================================

  function injectInlineScript(code) {
    const script = document.createElement("script");
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }


  // =====================================================================
  // UNICODE BRIDGE (code de unicodeBridge.js, injecté en contexte page)
  // =====================================================================

  const UNICODE_BRIDGE_CODE = `(function () {
  if (window.__tarotUnicodeBridgeInstalled) return;
  window.__tarotUnicodeBridgeInstalled = true;

  const nativeTextAreaValueDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const nativeEscape = window.escape;
  const NativeFormData = window.FormData;
  const nativeFormDataAppend = NativeFormData.prototype.append;
  const nativeFormDataSet = NativeFormData.prototype.set;
  const nativeURLSearchParamsAppend = window.URLSearchParams.prototype.append;
  const nativeURLSearchParamsSet = window.URLSearchParams.prototype.set;
  const unicodeExcludedInputTypes = new Set(["button", "file", "image", "reset", "submit"]);
  let unicodeBridgeEnabled = false;

  function decodeUnicodeSequences(value) {
    if (typeof value !== "string" || !value.includes("%u")) return value;
    return value.replace(/%u([0-9a-fA-F]{4,6})/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
  }
  function decodeHexadecimalSequences(value) {
    if (typeof value !== "string" || !value.match(/(?:[Uu]+|0[xX]|\\\\[xX])/)) return value;
    return value.replace(/(^|[^0-9A-Fa-f])((?:[Uu]+|0[xX]|\\\\[xX])([0-9a-fA-F]{2,6}))/g, (match, prefix, _sequence, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return match;
      return prefix + String.fromCodePoint(codePoint);
    });
  }
  function decodeUnicodeEntitySequences(value) {
    if (typeof value !== "string" || !value.includes("&")) return value;
    return value.replace(/&(?:#([xX]?[0-9a-fA-F]+)|([xX][0-9a-fA-F]+));?/g, (match, decimalOrHexEntity, hexEntity) => {
      const entityValue = decimalOrHexEntity !== undefined ? decimalOrHexEntity : hexEntity;
      if (!entityValue) return match;
      const isHex = entityValue.startsWith("x") || entityValue.startsWith("X");
      const codePoint = Number.parseInt(isHex ? entityValue.slice(1) : entityValue, isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return match;
      return String.fromCodePoint(codePoint);
    });
  }
  function decodeUnicodeTransportValue(value) {
    return decodeUnicodeSequences(decodeHexadecimalSequences(decodeUnicodeEntitySequences(value)));
  }
  function encodeUnicodeSequences(value) {
    if (typeof value !== "string" || !/[^\\u0000-\\u007f]/.test(value)) return value;
    let encodedValue = "";
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      encodedValue += codePoint > 127 ? "&#x" + codePoint.toString(16).toUpperCase() + ";" : character;
    }
    return encodedValue;
  }
  function encodeUnicodeTransportValue(value) {
    return encodeUnicodeSequences(decodeUnicodeTransportValue(value));
  }
  function escapeUnicodeTransportValue(value) {
    return nativeEscape(encodeUnicodeTransportValue(value));
  }
  function isUnicodeTextInput(element) {
    return element instanceof HTMLInputElement && !unicodeExcludedInputTypes.has((element.type || "").toLowerCase());
  }
  function shouldWrapFormData(formDataInit) {
    return formDataInit instanceof HTMLFormElement || formDataInit instanceof NativeFormData;
  }
  function bridgeFormDataConstructor(...args) {
    const nativeInstance = new NativeFormData(...args);
    if (!args.length || !shouldWrapFormData(args[0])) return nativeInstance;
    const encodedInstance = new NativeFormData();
    for (const [name, value] of nativeInstance.entries()) {
      encodedInstance.append(name, typeof value === "string" ? encodeUnicodeTransportValue(value) : value);
    }
    return encodedInstance;
  }
  bridgeFormDataConstructor.prototype = NativeFormData.prototype;
  Object.setPrototypeOf(bridgeFormDataConstructor, NativeFormData);
  window.FormData = bridgeFormDataConstructor;

  Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
    configurable: true,
    enumerable: nativeTextAreaValueDescriptor.enumerable || false,
    get() { const v = nativeTextAreaValueDescriptor.get.call(this); return unicodeBridgeEnabled ? encodeUnicodeSequences(v) : v; },
    set(value) { nativeTextAreaValueDescriptor.set.call(this, unicodeBridgeEnabled ? decodeUnicodeTransportValue(value) : value); },
  });
  Object.defineProperty(HTMLInputElement.prototype, "value", {
    configurable: true,
    enumerable: nativeInputValueDescriptor.enumerable || false,
    get() { const v = nativeInputValueDescriptor.get.call(this); return unicodeBridgeEnabled && isUnicodeTextInput(this) ? encodeUnicodeSequences(v) : v; },
    set(value) { nativeInputValueDescriptor.set.call(this, unicodeBridgeEnabled && isUnicodeTextInput(this) ? decodeUnicodeTransportValue(value) : value); },
  });
  NativeFormData.prototype.append = function(name, value, filename) {
    const nextValue = typeof value === "string" ? encodeUnicodeTransportValue(value) : value;
    return arguments.length > 2 ? nativeFormDataAppend.call(this, name, nextValue, filename) : nativeFormDataAppend.call(this, name, nextValue);
  };
  NativeFormData.prototype.set = function(name, value, filename) {
    const nextValue = typeof value === "string" ? encodeUnicodeTransportValue(value) : value;
    return arguments.length > 2 ? nativeFormDataSet.call(this, name, nextValue, filename) : nativeFormDataSet.call(this, name, nextValue);
  };
  window.escape = function(value) { return escapeUnicodeTransportValue(value); };
  window.URLSearchParams.prototype.append = function(name, value) { return nativeURLSearchParamsAppend.call(this, name, encodeUnicodeTransportValue(String(value))); };
  window.URLSearchParams.prototype.set = function(name, value) { return nativeURLSearchParamsSet.call(this, name, encodeUnicodeTransportValue(String(value))); };

  function setEnabled(enabled) { unicodeBridgeEnabled = Boolean(enabled); }
  window.addEventListener("tarot-unicode-toggle", (event) => {
    if (!event || !event.detail || typeof event.detail.enabled === "undefined") return;
    setEnabled(event.detail.enabled);
  });
  setEnabled(false);
})();`;


  // =====================================================================
  // BOUTON FORUM (code de buttonForum.js, injecté en contexte page)
  // =====================================================================

  const BUTTON_FORUM_CODE = `(function () {
    const BUTTON_WRAPPER_SELECTOR = 'span[data-forum-share-button="true"]';
    const BUTTON_TEXT = "Envoyer au salon";
    let enabled = document.documentElement && document.documentElement.dataset.forumShareButtonEnabled !== "false";
    let retryTimer = null;

    function isForumPage() {
      return location.hostname.endsWith("jeu-tarot-en-ligne.com") &&
             /^\\/forum-sujet\\/\\d+(?:\\/[^\\/]+)?\\/?$/.test(location.pathname);
    }
    function clearRetryTimer() { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } }
    function removeButtons() { clearRetryTimer(); document.querySelectorAll(BUTTON_WRAPPER_SELECTOR).forEach((node) => node.remove()); }
    function ensureDialogHandler() {
      if (typeof window.envoyerLienForumAuSalon === "function") return;
      window.envoyerLienForumAuSalon = function (event) {
        event.stopPropagation();
        const input = document.getElementById("forumChatMsg");
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        if (typeof $ !== 'undefined' && $('#modeJeuSalon').length === 0) {
          $('body').append('<input type="hidden" id="modeJeuSalon" value="fromForum">');
        }
        if (typeof appelInviterregisterRefreshDynamicInfos === "function") {
          appelInviterregisterRefreshDynamicInfos('etape=dynamic&sendChatMsg=' + escape(msg).split('+').join('%2B'));
        }
      };
    }
    function buildButton() {
      const btn = document.createElement("button");
      btn.className = "btn ptobt btn-success pbtn";
      btn.textContent = BUTTON_TEXT;
      btn.onclick = () => {
        const baseURL = location.origin + location.pathname.split("/").slice(0, 3).join("/") + "/";
        const resHTML = '<form onsubmit="return false;"><label>Message &#224; envoyer dans le salon :</label><br /><textarea id="forumChatMsg" class="form-control shorty" style="height: 100px;">' + baseURL + '</textarea><div class="clear" style="margin-top:10px;"></div><input class="btn ptobt btn-success pbtn" type="button" value="Envoyer" /></form>';
        if (typeof showDialog !== "function") return;
        const dialogId = showDialog("Partager ce sujet dans le salon", resHTML);
        ensureDialogHandler();
        const confirmBtn = document.querySelector('#' + dialogId + ' input[type=button]');
        if (confirmBtn) {
          confirmBtn.onclick = (e) => {
            window.envoyerLienForumAuSalon(e);
            if (typeof window.closeDialog === "function") window.closeDialog(dialogId);
          };
        }
      };
      return btn;
    }
    function syncButtons() {
      removeButtons();
      if (!enabled || !isForumPage()) return;
      const h2List = document.querySelectorAll("h2.noMarginTop");
      if (h2List.length === 0) { clearRetryTimer(); retryTimer = setTimeout(syncButtons, 500); return; }
      ensureDialogHandler();
      h2List.forEach((h2) => {
        const wrapper = document.createElement("span");
        wrapper.setAttribute("data-forum-share-button", "true");
        wrapper.appendChild(document.createTextNode(" | "));
        wrapper.appendChild(buildButton());
        h2.appendChild(wrapper);
      });
    }
    function setEnabled(nextEnabled) { enabled = Boolean(nextEnabled); syncButtons(); }
    document.addEventListener("forum-share-button-state", (event) => {
      if (!event || !event.detail || typeof event.detail.enabled === "undefined") return;
      setEnabled(event.detail.enabled);
    });
    if (window.__forumShareButtonController && window.__forumShareButtonController.__initialized) {
      window.__forumShareButtonController.refresh(); return;
    }
    window.__forumShareButtonController = { __initialized: true, setEnabled, refresh: syncButtons, destroy: () => { enabled = false; removeButtons(); } };
    syncButtons();
  })();`;


  // =====================================================================
  // EMOT.JS (code modifié pour utiliser les URLs GitHub, contexte page)
  // =====================================================================

  const EMOT_SCRIPT_CODE = `(function () {
    const emoticonBaseUrl = "https://raw.githubusercontent.com/MythUp/Tarot-plus/refs/heads/main/emots/";
    function getEmoticonImageUrl(index) { return emoticonBaseUrl + "Emoticon" + index + ".png"; }

    if (typeof emoticons === "undefined" || typeof moteurHTML === "undefined") return;

    emoticons['Bravo !'] = '62';
    emoticons['D\\u00E9sol\\u00E9...'] = '63';
    emoticons['Cadeau !'] = '64';

    function findEmot(i) { for (var ii in emoticons) { if (i == emoticons[ii]) return ii; } return false; }

    moteurHTML.showMessageJoueur = function (idJoueur, message) {
      if (window.disableEmoticons) return;
      var rand = Math.random();
      if (message == "J'applaudis !") playSoundEffect('Clap_Hands' + Math.floor(rand * 5) + '.mp3', true, 0.9);
      else if (message == "C'est long...") playSoundEffect('Yawn' + (2 + Math.floor(rand * 2)) + '.mp3', true, 0.9);
      else if (message == "Je vous embrasse !") playSoundEffect('Kiss ' + Math.ceil(rand * 3) + '.mp3', true, 0.9);
      else if (message == "Je pleure !") playSoundEffect('Cry_1Cut.mp3', true, 0.9);
      if (emoticons[message]) {
        var newIcon = $('<img class="emotHTML" style="opacity:0;" src="' + getEmoticonImageUrl(emoticons[message]) + '" />');
        $('#divJoueur' + idJoueur).append(newIcon);
        $(newIcon).on('load', function () {
          newIcon.css('margin-left', $('#divJoueur' + idJoueur).width() / 2 - newIcon.width() / 2);
          newIcon.css('opacity', 1);
          newIcon.animate({ 'margin-top': 100, opacity: 0 }, 2500, function () { newIcon.remove(); });
        });
        return;
      }
      if (typeof $('#divJoueur' + idJoueur).tooltip == 'undefined') return;
      if ($('#divJoueur' + idJoueur).attr('title') || $('#divJoueur' + idJoueur).attr('data-original-title')) {
        var pop = $('#divJoueur' + idJoueur).data('fifoMsgs');
        if (!pop) pop = [];
        if (pop.length < 10) pop.push(message);
        $('#divJoueur' + idJoueur).data('fifoMsgs', pop);
        return;
      }
      $('#divJoueur' + idJoueur).attr('title', message).attr('data-placement', "bottom")
        .attr('data-original-title', message).tooltip().tooltip('fixTitle').mouseover();
      playSoundEffect('Female Voice - Psst ' + Math.ceil(Math.random() * 2) + '.mp3', true, 0.5);
      clearTimeout($('#divJoueur' + idJoueur).data('TO'));
      var to = setTimeout(function () {
        $('#divJoueur' + idJoueur).mouseout().attr('title', '').attr('data-original-title', '');
        var pop = $('#divJoueur' + idJoueur).data('fifoMsgs');
        if (pop && pop.length > 0) { var m2 = pop.shift(); $('#divJoueur' + idJoueur).data('fifoMsgs', pop); setTimeout(function () { selMoteur.showMessageJoueur(idJoueur, m2); }, 200); }
      }, 5000);
      $('#divJoueur' + idJoueur).data('TO', to);
    };

    if (typeof moteurHTML2 !== "undefined") {
      moteurHTML2.showMessageJoueur = function (idJoueur, message) {
        if (window.disableEmoticons) return;
        var rand = Math.random();
        if (message == "J'applaudis !") playSoundEffect('Clap_Hands' + Math.floor(rand * 5) + '.mp3', true, 0.9);
        else if (message == "C'est long...") playSoundEffect('Yawn' + (2 + Math.floor(rand * 2)) + '.mp3', true, 0.9);
        else if (message == "Je vous embrasse !") playSoundEffect('Kiss ' + Math.ceil(rand * 3) + '.mp3', true, 0.9);
        else if (message == "Je pleure !") playSoundEffect('Cry_1Cut.mp3', true, 0.9);
        if (emoticons[message]) {
          var newIcon = $('<img class="emotHTML" style="opacity:0;" src="' + getEmoticonImageUrl(emoticons[message]) + '" />');
          $('#divJoueur' + idJoueur).append(newIcon);
          $(newIcon).on('load', function () {
            newIcon.css('margin-left', $('#divJoueur' + idJoueur).width() / 2 - newIcon.width() / 2);
            newIcon.css('opacity', 1);
            newIcon.animate({ 'margin-top': 100, opacity: 0 }, 2500, function () { newIcon.remove(); });
          });
          return;
        }
        if (typeof $('#divJoueur' + idJoueur).tooltip == 'undefined') return;
        if ($('#divJoueur' + idJoueur).attr('title') || $('#divJoueur' + idJoueur).attr('data-original-title')) {
          var pop = $('#divJoueur' + idJoueur).data('fifoMsgs');
          if (!pop) pop = [];
          if (pop.length < 10) pop.push(message);
          $('#divJoueur' + idJoueur).data('fifoMsgs', pop);
          return;
        }
        $('#divJoueur' + idJoueur).attr('title', message).attr('data-placement', "bottom")
          .attr('data-original-title', message).tooltip().tooltip('fixTitle').mouseover();
        playSoundEffect('Female Voice - Psst ' + Math.ceil(Math.random() * 2) + '.mp3', true, 0.5);
        clearTimeout($('#divJoueur' + idJoueur).data('TO'));
        var to = setTimeout(function () {
          $('#divJoueur' + idJoueur).mouseout().attr('title', '').attr('data-original-title', '');
          var pop = $('#divJoueur' + idJoueur).data('fifoMsgs');
          if (pop && pop.length > 0) { var m2 = pop.shift(); $('#divJoueur' + idJoueur).data('fifoMsgs', pop); setTimeout(function () { selMoteur.showMessageJoueur(idJoueur, m2); }, 200); }
        }, 5000);
        $('#divJoueur' + idJoueur).data('TO', to);
      };
    }
  })();`;


  // =====================================================================
  // LOGIQUE DU CONTENT SCRIPT (adapté de content.js)
  // =====================================================================

  const isDark = document.querySelector("#webBody.themeSombre") !== null;
  let isReplacingEmoticons = false;
  let emoticonsEnabled = false;
  let emoticonsObserver = null;
  let emoticonsScriptInjected = false;
  let emoticonToolbarSnapshot = null;
  let unicodeDecodingEnabled = false;
  let unicodeDecodingObserver = null;
  let updateEmoticons = null;
  let unicodeBridgeInjected = false;

  const unicodeBridgeEventName = "tarot-unicode-toggle";
  const unicodeExcludedInputTypes = new Set(["button", "file", "image", "reset", "submit"]);
  const nativeTextAreaValueDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const nativeEscape = window.escape;
  const nativeFormDataAppend = window.FormData && window.FormData.prototype && window.FormData.prototype.append;
  const nativeFormDataSet = window.FormData && window.FormData.prototype && window.FormData.prototype.set;
  const nativeURLSearchParamsAppend = window.URLSearchParams && window.URLSearchParams.prototype && window.URLSearchParams.prototype.append;
  const nativeURLSearchParamsSet = window.URLSearchParams && window.URLSearchParams.prototype && window.URLSearchParams.prototype.set;

  let unicodeValueBridgesInstalled = false;
  let unicodeTransportBridgesInstalled = false;
  const unicodeOriginalTextNodes = new Map();
  const unicodeOriginalAttributes = new Map();
  const unicodeOriginalControls = new Map();

  const unicodeDecodingAttributes = ["alt","aria-description","aria-label","data-bs-original-title","data-original-title","label","placeholder","title"];
  const unicodeDecodingPattern = /%u([0-9a-fA-F]{4,6})/g;
  const hexadecimalDecodingPattern = /(^|[^0-9A-Fa-f])((?:[Uu]\+|0[xX]|\\[xX])([0-9a-fA-F]{2,6}))/g;

  function decodeUnicodeSequences(value) {
    if (typeof value !== "string" || !value.includes("%u")) return value;
    return value.replace(unicodeDecodingPattern, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
  }
  function decodeHexadecimalSequences(value) {
    if (typeof value !== "string" || !value.match(/(?:[Uu]\+|0[xX]|\\[xX])/)) return value;
    return value.replace(hexadecimalDecodingPattern, (match, prefix, _sequence, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return match;
      return `${prefix}${String.fromCodePoint(codePoint)}`;
    });
  }
  function encodeUnicodeSequences(value) {
    if (typeof value !== "string" || !/[^\u0000-\u007f]/.test(value)) return value;
    let encodedValue = "";
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      encodedValue += codePoint > 127 ? `&#x${codePoint.toString(16).toUpperCase()};` : character;
    }
    return encodedValue;
  }
  function decodeUnicodeEntitySequences(value) {
    if (typeof value !== "string" || !value.includes("&")) return value;
    return value.replace(/&(?:#([xX]?[0-9a-fA-F]+)|([xX][0-9a-fA-F]+));?/g, (match, decimalOrHexEntity, hexEntity) => {
      const entityValue = decimalOrHexEntity !== undefined ? decimalOrHexEntity : hexEntity;
      if (!entityValue) return match;
      const isHex = entityValue.startsWith("x") || entityValue.startsWith("X");
      const codePoint = Number.parseInt(isHex ? entityValue.slice(1) : entityValue, isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return match;
      return String.fromCodePoint(codePoint);
    });
  }
  function decodeUnicodeDisplaySequences(value) {
    return decodeUnicodeSequences(decodeHexadecimalSequences(decodeUnicodeEntitySequences(value)));
  }
  function encodeUnicodeTransportValue(value) {
    return encodeUnicodeSequences(decodeUnicodeDisplaySequences(value));
  }
  function escapeUnicodeTransportValue(value) {
    return nativeEscape(encodeUnicodeTransportValue(value));
  }
  function isUnicodeTextInput(element) {
    return element instanceof HTMLInputElement && !unicodeExcludedInputTypes.has((element.type || "").toLowerCase());
  }
  function isUnicodeTextControl(element) {
    return element instanceof HTMLTextAreaElement || isUnicodeTextInput(element);
  }


  // --- Profanity filter ---
  const profanityPlaceholderText = "** Censure **";
  const profanityChatSelector = "#chat, [role='tooltip'], #mechacnt, p.chatRecap";
  const profanityPrivateMessageSelector = ".ui-dialog form.feedback_form";
  const profanityRecapSelector = "#chatCnt, #mechacnt, .chatRecap";
  const profanityRevealSelector = "[data-tarot-profanity-revealed='true']";
  const profanityMarkerSelector = "[data-tarot-profanity-original-html]";
  const profanitySkipSelector = `${profanityRevealSelector}, ${profanityMarkerSelector}`;

  // Termes de profanité embarqués directement (remplace profanity-terms.json)
  const BUILTIN_PROFANITY_CONFIG = {
    terms: ["idiot","imbécile","crétin","connard","connasse","con","abruti","merde","stupide","débile","minable","bouffon","enfoiré","salaud","ordure","raclure","fdp","salope","fils de pute","pute","fuck","shit","enculé","sexe","nique","nique ta mère","ta gueule","va te faire foutre","va chier"],
    whitelist: ["on","son","mon","ton","non","bon","don","pue","put","pues","sont","font","pour","vexé","soit","mère"]
  };

  let profanityEnabled = true;
  let profanityMode = "mask";
  let profanityScope = "insult";
  let profanityObserver = null;
  let profanityRefreshQueued = false;
  let profanityRefreshPending = false;
  let profanityFilterBusy = false;
  let profanityNeedsFullReset = true;
  let profanityEntries = [];
  let profanityWhitelist = new Set();
  let profanityEntriesByCandidateLength = new Map();
  let profanityCandidateLengths = [];
  let profanityMinCandidateLength = 0;
  let profanityMaxCandidateLength = 0;
  let profanityRecapObserver = null;
  const forumSubjectThreadSnapshots = new WeakMap();
  const profanityObserverOptions = { childList: true, characterData: true, subtree: true };
  const profanityRecapObserverOptions = { attributes: true, attributeFilter: ["class","id"], childList: true, characterData: true, subtree: true };
  const profanityWordCharacterPattern = /[\p{L}\p{N}]/u;

  function normalizeProfanityText(value) {
    return typeof value === "string" ? value.toLocaleLowerCase("fr-FR") : "";
  }
  function normalizeProfanityKey(value) {
    if (typeof value !== "string" || !value) return "";
    return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr-FR").replace(/[^\p{L}\p{N}]+/gu, "");
  }
  function splitProfanitySearchTokens(value) {
    if (typeof value !== "string" || !value) return [];
    const tokens = [];
    for (const match of value.matchAll(/\S+/gu)) {
      const rawToken = match[0];
      const normalizedToken = normalizeProfanityKey(rawToken);
      if (!normalizedToken) continue;
      tokens.push({ end: match.index + rawToken.length, normalized: normalizedToken, raw: rawToken, start: match.index });
    }
    return tokens;
  }
  function getProfanityChatSelector() {
    const selectors = [profanityChatSelector];
    if (location.pathname.startsWith("/forum-sujet/")) selectors.push("div.sujetForum");
    return selectors.join(", ");
  }
  function isForumSubjectPage() { return location.pathname.startsWith("/forum-sujet/"); }
  function snapshotForumSubjectThreads(root = document) {
    Array.from(root.querySelectorAll("div[id^='REP']")).forEach((tg) => {
      if (!forumSubjectThreadSnapshots.has(tg)) forumSubjectThreadSnapshots.set(tg, tg.innerHTML);
    });
  }
  function restoreForumSubjectThreads(root = document) {
    Array.from(root.querySelectorAll("div[id^='REP']")).forEach((tg) => {
      const snap = forumSubjectThreadSnapshots.get(tg);
      if (typeof snap === "string" && tg.innerHTML !== snap) tg.innerHTML = snap;
      delete tg.dataset.tarotProfanityForumRenderedMode;
    });
  }
  function renderForumSubjectDeleteThreads(root = document) {
    Array.from(root.querySelectorAll("div[id^='REP']")).forEach((tg) => {
      if (tg.dataset.tarotProfanityForumRenderedMode === "delete") return;
      const replies = Array.from(tg.children).filter((c) => c instanceof Element && c.matches(".sujetForum"));
      let mainPostRemoved = false, promotedReplyFound = false;
      replies.forEach((reply) => {
        if (!reply.classList.contains("sujetSub")) {
          if (containsProfanity(reply.textContent || "")) { reply.remove(); mainPostRemoved = true; }
          return;
        }
        const bodyHtml = extractForumSubjectReplyBodyHtml(reply);
        const bodyText = getTextContentFromHtml(bodyHtml);
        if (!bodyHtml || containsProfanity(bodyText)) { reply.remove(); return; }
        if (promotedReplyFound || !mainPostRemoved) return;
        reply.classList.remove("sujetSub");
        reply.innerHTML = `<p>${bodyHtml}</p>`;
        promotedReplyFound = true;
      });
      tg.dataset.tarotProfanityForumRenderedMode = "delete";
    });
  }
  function getPrivateMessageBodyNodes(form) {
    if (!(form instanceof Element)) return [];
    const nodes = Array.from(form.childNodes);
    const firstBreakIndex = nodes.findIndex((n) => n.nodeType === Node.ELEMENT_NODE && n.tagName === "BR");
    if (firstBreakIndex === -1) return [];
    const bodyNodes = [];
    for (let i = firstBreakIndex + 1; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.nodeType === Node.ELEMENT_NODE && ["TEXTAREA","INPUT","BUTTON","SELECT"].includes(n.tagName)) break;
      bodyNodes.push(n);
    }
    return bodyNodes;
  }
  function getPrivateMessageBodyText(form) { return getNodeListText(getPrivateMessageBodyNodes(form)); }
  function isPrivateMessageForm(c) { return c instanceof Element && c.matches(profanityPrivateMessageSelector); }
  function closePrivateMessageDialog(form) {
    const dialog = form instanceof Element ? form.closest(".ui-dialog") : null;
    const closeButton = dialog && dialog.querySelector(".ui-dialog-titlebar-close");
    if (closeButton instanceof HTMLElement) { closeButton.click(); return true; }
    return false;
  }
  function extractProfanityConfig(payload) {
    if (Array.isArray(payload)) return { terms: payload, whitelist: [] };
    if (payload && typeof payload === "object") return { terms: Array.isArray(payload.terms) ? payload.terms : [], whitelist: Array.isArray(payload.whitelist) ? payload.whitelist : [] };
    return { terms: [], whitelist: [] };
  }
  function normalizeProfanityTermList(terms) {
    const normalized = [], seen = new Set();
    for (const term of (Array.isArray(terms) ? terms : [])) {
      const cleaned = typeof term === "string" ? term.trim() : "";
      if (!cleaned) continue;
      const key = normalizeProfanityKey(cleaned);
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(cleaned);
    }
    return normalized;
  }
  function buildProfanityEntries(terms) {
    const entries = [], entriesByCandidateLength = new Map(), candidateLengths = new Set();
    let minCandidateLength = Number.POSITIVE_INFINITY, maxCandidateLength = 0;
    for (const term of normalizeProfanityTermList(terms)) {
      const normalizedTokens = term.split(/\s+/u).map(normalizeProfanityKey).filter(Boolean);
      const tokenCount = normalizedTokens.length;
      if (!tokenCount) continue;
      const entry = { tokenCount, tokens: normalizedTokens };
      entries.push(entry);
      minCandidateLength = Math.min(minCandidateLength, tokenCount);
      maxCandidateLength = Math.max(maxCandidateLength, tokenCount);
      const cur = entriesByCandidateLength.get(tokenCount);
      if (cur) cur.push(entry); else entriesByCandidateLength.set(tokenCount, [entry]);
      candidateLengths.add(tokenCount);
    }
    return { entries, entriesByCandidateLength, candidateLengths: Array.from(candidateLengths).sort((a,b) => a-b), maxCandidateLength, minCandidateLength: Number.isFinite(minCandidateLength) ? minCandidateLength : 0 };
  }

  async function readProfanityTermsFromJson() {
    // Utilise les termes embarqués directement (pas de requête réseau)
    return extractProfanityConfig(BUILTIN_PROFANITY_CONFIG);
  }

  async function loadProfanityTerms() {
    try {
      const [defaultConfig, storage] = await Promise.all([
        readProfanityTermsFromJson(),
        new Promise((resolve) => storageLocal.get(["profanityTermsCustom"], resolve)),
      ]);
      const customTerms = Array.isArray(storage.profanityTermsCustom) ? storage.profanityTermsCustom : [];
      const effectiveTerms = normalizeProfanityTermList([...defaultConfig.terms, ...customTerms]);
      const builtEntries = buildProfanityEntries(effectiveTerms);
      profanityEntries = builtEntries.entries;
      profanityEntriesByCandidateLength = builtEntries.entriesByCandidateLength;
      profanityCandidateLengths = builtEntries.candidateLengths;
      profanityMinCandidateLength = builtEntries.minCandidateLength;
      profanityMaxCandidateLength = builtEntries.maxCandidateLength;
      profanityWhitelist = new Set(normalizeProfanityTermList(defaultConfig.whitelist).map(normalizeProfanityKey));
      return profanityEntries;
    } catch (error) {
      console.error("[EXT] Impossible de charger la liste d'insultes.", error);
      profanityEntries = []; profanityWhitelist = new Set(); profanityEntriesByCandidateLength = new Map(); profanityCandidateLengths = []; profanityMinCandidateLength = 0; profanityMaxCandidateLength = 0;
      return profanityEntries;
    }
  }


  function isProfanityWordCharacter(c) { return typeof c === "string" && c.length > 0 && profanityWordCharacterPattern.test(c); }
  function matchesProfanityToken(candidateToken, termToken) {
    if (!candidateToken || typeof candidateToken.raw !== "string" || typeof termToken !== "string") return false;
    const cc = Array.from(candidateToken.raw), tc = Array.from(termToken);
    if (cc.length !== tc.length) return false;
    for (let i = 0; i < cc.length; i++) {
      const nc = normalizeProfanityKey(cc[i]);
      if (!nc) continue;
      if (nc !== tc[i]) return false;
    }
    return true;
  }
  function mergeProfanityMatchSpans(spans) {
    if (!spans.length) return [];
    const sorted = [...spans].sort((a,b) => a.start - b.start || a.end - b.end);
    const merged = []; let cur = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (next.start <= cur.end) { cur.end = Math.max(cur.end, next.end); continue; }
      merged.push(cur); cur = { ...next };
    }
    merged.push(cur); return merged;
  }
  function getProfanityMatchSpans(value) {
    if (typeof value !== "string" || !value.trim() || !profanityEntries.length) return [];
    const tokens = splitProfanitySearchTokens(value);
    const spans = [];
    for (let si = 0; si < tokens.length; si++) {
      if (profanityMinCandidateLength && si + profanityMinCandidateLength > tokens.length) break;
      for (const length of profanityCandidateLengths) {
        if (si + length > tokens.length) break;
        const candidateEntries = profanityEntriesByCandidateLength.get(length);
        if (!candidateEntries || !candidateEntries.length) continue;
        const candidateTokens = tokens.slice(si, si + length);
        const candidate = candidateTokens.map((t) => t.normalized).join("");
        if (!candidate || profanityWhitelist.has(candidate)) continue;
        for (const term of candidateEntries) {
          if (term.tokenCount !== length) continue;
          if (candidateTokens.every((ct, ti) => matchesProfanityToken(ct, term.tokens[ti]))) {
            spans.push({ end: candidateTokens[candidateTokens.length - 1].end, start: candidateTokens[0].start }); break;
          }
        }
      }
    }
    return mergeProfanityMatchSpans(spans);
  }
  function containsProfanity(value) { return getProfanityMatchSpans(value).length > 0; }

  function appendChatNodeSpec(fragment, spec) {
    if (spec.kind === "text") { fragment.appendChild(document.createTextNode(spec.value)); return; }
    fragment.appendChild(spec.node.cloneNode(true));
  }
  function serializeChatNodeSpecs(specs) {
    const w = document.createElement("div");
    specs.forEach((s) => appendChatNodeSpec(w, s));
    return w.innerHTML;
  }
  function getNodeListText(nodes) { return nodes.map((n) => n.textContent || "").join(""); }
  function serializeText(value) { const w = document.createElement("div"); w.textContent = value; return w.innerHTML; }
  function isProfanityRevealElement(el) { return el instanceof Element && el.matches(profanityRevealSelector); }
  function isProfanityMarkerElement(el) { return el instanceof Element && el.matches(profanityMarkerSelector); }

  function createProfanityMarker(originalHtml, { clickable, block, hidden, displaySuffixText = "", preserveContents = false, blockWrapperTagName = null }) {
    const marker = document.createElement("span");
    marker.dataset.tarotProfanityOriginalHtml = originalHtml;
    marker.dataset.tarotProfanityBlock = block ? "true" : "false";
    if (preserveContents) marker.dataset.tarotProfanityPreserveContents = "true";
    if (hidden) { marker.textContent = ""; marker.style.display = "none"; }
    else if (block && blockWrapperTagName) {
      const ph = document.createElement(blockWrapperTagName);
      ph.textContent = `${profanityPlaceholderText}${displaySuffixText}`;
      marker.replaceChildren(ph); marker.style.display = "block";
    } else if (block) { marker.textContent = `${profanityPlaceholderText}${displaySuffixText}`; marker.style.display = "block"; }
    else { marker.textContent = `${profanityPlaceholderText}${displaySuffixText}`; marker.style.display = "inline"; }
    if (clickable && !hidden) {
      marker.className = "tarot-profanity-censor tarot-profanity-censor-clickable";
      marker.setAttribute("role","button"); marker.setAttribute("tabindex","0");
      marker.title = "Cliquer pour afficher le message d'origine"; marker.style.cursor = "pointer";
      const reveal = (event) => { if (event) { event.preventDefault(); event.stopPropagation(); } revealProfanityMarker(marker); };
      marker.addEventListener("click", reveal);
      marker.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") reveal(e); });
    } else { marker.className = hidden ? "tarot-profanity-delete" : "tarot-profanity-censor"; }
    return marker;
  }
  function createProfanityRevealWrapper(originalHtml) {
    const w = document.createElement("span");
    w.dataset.tarotProfanityRevealed = "true"; w.className = "tarot-profanity-revealed"; w.style.display = "contents"; w.innerHTML = originalHtml;
    return w;
  }
  function replaceElementContentsWithMarker(element, marker) {
    if (!(element instanceof Element)) return false;
    element.replaceChildren(marker); return true;
  }
  function findSingleMeaningfulChildElement(element) {
    if (!(element instanceof Element)) return null;
    for (const child of element.children) { if (containsProfanity(child.textContent || "")) return child; }
    return element;
  }
  function revealProfanityMarker(marker) {
    if (!marker || !marker.isConnected) return;
    const originalHtml = marker.dataset.tarotProfanityOriginalHtml || "";
    const preserveContents = marker.dataset.tarotProfanityPreserveContents === "true";
    if (preserveContents) { marker.insertAdjacentHTML("beforebegin", originalHtml); marker.remove(); return; }
    const block = marker.dataset.tarotProfanityBlock === "true";
    marker.replaceWith(createProfanityRevealWrapper(originalHtml, block));
  }
  function restoreProfanityMarker(marker) {
    if (!marker || !marker.isConnected) return;
    const originalHtml = marker.dataset.tarotProfanityOriginalHtml || "";
    marker.insertAdjacentHTML("beforebegin", originalHtml); marker.remove();
  }
  function restoreProfanityMarkers(root = document) { Array.from(root.querySelectorAll(profanityMarkerSelector)).forEach(restoreProfanityMarker); }
  function restoreProfanityRevealWrappers(root = document) {
    Array.from(root.querySelectorAll(profanityRevealSelector)).forEach((w) => { w.insertAdjacentHTML("beforebegin", w.innerHTML); w.remove(); });
  }
  function restoreProfanityHiddenTooltips(root = document) {
    Array.from(root.querySelectorAll("[data-tarot-profanity-hidden='true']")).forEach(restoreHiddenProfanityContainer);
  }
  function isProfanitySkipNode(node) { return Boolean(node.parentElement && node.parentElement.closest(profanitySkipSelector)); }
  function isTooltipContainer(c) { return c.closest("[role='tooltip']") !== null; }
  function isChatTimestampNode(node) { return node.nodeType === Node.ELEMENT_NODE && node.tagName === "FONT"; }
  function findLastChatTimestampIndex(nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) { if (isChatTimestampNode(nodes[i])) return i; }
    return -1;
  }
  function findFirstMessageTextIndex(nodes, limitIndex) {
    for (let i = 0; i < limitIndex; i++) {
      const n = nodes[i];
      if (n.nodeType !== Node.TEXT_NODE) continue;
      if ((n.nodeValue || "").includes(":")) return i;
    }
    return -1;
  }
  function splitChatPrefixText(text) {
    const ci = text.indexOf(":");
    if (ci === -1) return null;
    let si = ci + 1;
    while (si < text.length && /\s/u.test(text[si])) si++;
    return { bodyText: text.slice(si), prefixText: text.slice(0, si) };
  }
  function buildPreservedChatMessageParts(nodesToReplace) {
    const timestampIndex = findLastChatTimestampIndex(nodesToReplace);
    const contentEndIndex = timestampIndex === -1 ? nodesToReplace.length : timestampIndex;
    const messageTextIndex = findFirstMessageTextIndex(nodesToReplace, contentEndIndex);
    if (messageTextIndex === -1) return null;
    const messageTextNode = nodesToReplace[messageTextIndex];
    const splitText = splitChatPrefixText(messageTextNode.nodeValue || "");
    if (!splitText) return null;
    const prefixSpecs = [];
    for (let i = 0; i < messageTextIndex; i++) prefixSpecs.push({ kind: "node", node: nodesToReplace[i] });
    prefixSpecs.push({ kind: "text", value: splitText.prefixText });
    const bodySpecs = [];
    if (splitText.bodyText) bodySpecs.push({ kind: "text", value: splitText.bodyText });
    for (let i = messageTextIndex + 1; i < contentEndIndex; i++) bodySpecs.push({ kind: "node", node: nodesToReplace[i] });
    if (!bodySpecs.length) return null;
    const suffixSpecs = [];
    for (let i = contentEndIndex; i < nodesToReplace.length; i++) suffixSpecs.push({ kind: "node", node: nodesToReplace[i] });
    return { bodySpecs, prefixSpecs, suffixSpecs };
  }
  function replaceChatSegmentWithSpecs(container, nodesToReplace, prefixSpecs, marker, suffixSpecs) {
    if (!nodesToReplace.length) return false;
    const frag = document.createDocumentFragment();
    prefixSpecs.forEach((s) => appendChatNodeSpec(frag, s));
    frag.appendChild(marker);
    suffixSpecs.forEach((s) => appendChatNodeSpec(frag, s));
    container.insertBefore(frag, nodesToReplace[0]);
    nodesToReplace.forEach((n) => n.remove());
    return true;
  }
  function serializeNodeList(nodes) { return serializeChatNodeSpecs(nodes.map((n) => ({ kind: "node", node: n }))); }
  function replaceProfanityInTextNode(textNode, clickable = true) {
    const text = textNode.nodeValue || "";
    const matches = getProfanityMatchSpans(text);
    if (!matches.length) return false;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(({ start, end }) => {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      frag.appendChild(createProfanityMarker(serializeText(text.slice(start, end)), { clickable, block: false, hidden: false }));
      cursor = end;
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.replaceWith(frag); return true;
  }
  function segmentContainsReveal(nodes) { return nodes.some((n) => isProfanityRevealElement(n) || (n.nodeType === Node.ELEMENT_NODE && n.querySelector(profanityRevealSelector) !== null)); }
  function segmentContainsMarkers(nodes) { return nodes.some((n) => isProfanityMarkerElement(n) || (n.nodeType === Node.ELEMENT_NODE && n.querySelector(profanityMarkerSelector) !== null)); }
  function replaceSegmentWithMarker(container, nodesToReplace, marker) {
    if (!nodesToReplace.length) return;
    container.insertBefore(marker, nodesToReplace[0]);
    nodesToReplace.forEach((n) => n.remove());
  }
  function processChatSegment(container, nodesToReplace) {
    if (!nodesToReplace.length || segmentContainsReveal(nodesToReplace)) return false;
    const segmentText = getNodeListText(nodesToReplace);
    if (!containsProfanity(segmentText)) return false;
    if (profanityMode === "delete") {
      if (isForumSubjectPage() && container instanceof Element && container.matches("div.sujetForum")) { container.remove(); return true; }
      replaceSegmentWithMarker(container, nodesToReplace, createProfanityMarker(serializeNodeList(nodesToReplace), { clickable: false, block: true, hidden: true }));
      return true;
    }
    if (profanityScope === "message") {
      const preservedParts = buildPreservedChatMessageParts(nodesToReplace);
      if (preservedParts) {
        const bodyText = preservedParts.bodySpecs.map((s) => s.kind === "text" ? s.value : s.node.textContent || "").join("");
        if (containsProfanity(bodyText)) {
          return replaceChatSegmentWithSpecs(container, nodesToReplace, preservedParts.prefixSpecs,
            createProfanityMarker(serializeChatNodeSpecs(preservedParts.bodySpecs), { clickable: profanityMode === "mask", block: false, displaySuffixText: preservedParts.suffixSpecs.length ? " " : "", hidden: false }),
            preservedParts.suffixSpecs);
        }
      }
      if (nodesToReplace.length === 1 && nodesToReplace[0] instanceof Element) {
        const mwe = findSingleMeaningfulChildElement(nodesToReplace[0]);
        if (!mwe) return false;
        return replaceElementContentsWithMarker(mwe, createProfanityMarker(mwe.innerHTML, { clickable: profanityMode === "mask", block: false, hidden: false, preserveContents: true }));
      }
    }
    replaceSegmentWithMarker(container, nodesToReplace,
      createProfanityMarker(serializeNodeList(nodesToReplace), { clickable: profanityMode === "mask", block: true, blockWrapperTagName: nodesToReplace.some((n) => n.nodeType === Node.ELEMENT_NODE && n.tagName === "P") ? "p" : null, hidden: false }));
    return true;
  }
  function processChatContainerMessageScope(container) {
    const snapshot = Array.from(container.childNodes);
    let segmentStart = 0, mutated = false;
    for (let i = 0; i <= snapshot.length; i++) {
      const node = snapshot[i];
      const isBoundary = i === snapshot.length || (node && node.nodeName === "BR");
      if (!isBoundary) continue;
      const segmentEnd = i;
      const hasLeadingBreak = segmentStart > 0 && snapshot[segmentStart - 1] && snapshot[segmentStart - 1].nodeName === "BR";
      const startIndex = hasLeadingBreak ? segmentStart - 1 : segmentStart;
      const nodesToReplace = snapshot.slice(startIndex, segmentEnd);
      if (nodesToReplace.length && !segmentContainsMarkers(nodesToReplace)) mutated = processChatSegment(container, nodesToReplace) || mutated;
      segmentStart = i + 1;
    }
    return mutated;
  }
  function processChatContainerWordScope(container, clickable = true) {
    const textNodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const tn = walker.currentNode;
      if (isProfanitySkipNode(tn)) continue;
      if (containsProfanity(tn.nodeValue || "")) textNodes.push(tn);
    }
    let mutated = false;
    textNodes.forEach((tn) => { mutated = replaceProfanityInTextNode(tn, clickable) || mutated; });
    return mutated;
  }
  function restoreHiddenProfanityContainer(container) {
    const od = container.dataset.tarotProfanityOriginalDisplay || "";
    if (od && od !== "none") container.style.display = od; else container.style.removeProperty("display");
    delete container.dataset.tarotProfanityHidden; delete container.dataset.tarotProfanityOriginalDisplay;
  }
  function hideProfanityContainer(container) {
    if (container.dataset.tarotProfanityHidden === "true") { container.style.display = "none"; return; }
    if (!container.hasAttribute("data-tarot-profanity-original-display")) container.dataset.tarotProfanityOriginalDisplay = container.style.display || "";
    container.dataset.tarotProfanityHidden = "true"; container.style.display = "none";
  }
  function processTooltipContainer(container) {
    const content = container.textContent || "";
    const isProfane = containsProfanity(content);
    if (!isProfane) { if (container.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(container); return false; }
    if (container.dataset.tarotProfanityHidden === "true") { container.style.display = "none"; return true; }
    hideProfanityContainer(container); return true;
  }
  function isCompteConversationTooltip(container) {
    return location.pathname.startsWith("/Compte.php") && container instanceof Element && container.matches("[role='tooltip']") && container.closest(".messageBox") !== null && container.querySelector(".ui-tooltip-content") !== null;
  }
  function getCompteConversationCard(container) {
    const cb = container instanceof Element ? container.closest(".iconbox_wrapper.messageBox") : null;
    return (cb && cb.parentElement) || null;
  }
  function isForumSubjectReplyControlNode(node) {
    return node.nodeType === Node.ELEMENT_NODE && node.matches("img[onclick], a[onclick], button[onclick], input[onclick]");
  }
  function extractForumSubjectReplyBodyHtml(reply) {
    const nodes = Array.from(reply.childNodes);
    const firstBreakIndex = nodes.findIndex((n) => n.nodeType === Node.ELEMENT_NODE && n.tagName === "BR");
    if (firstBreakIndex === -1) return "";
    const bodyNodes = [];
    for (let i = firstBreakIndex + 1; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.nodeType === Node.TEXT_NODE) { if ((n.nodeValue || "").trim()) bodyNodes.push(n); continue; }
      if (isForumSubjectReplyControlNode(n)) continue;
      if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) bodyNodes.push(n);
    }
    if (!bodyNodes.length) return "";
    return serializeNodeList(bodyNodes).trim();
  }
  function getTextContentFromHtml(html) { const w = document.createElement("div"); w.innerHTML = html; return w.textContent || ""; }
  function processCompteConversationTooltip(container) {
    const mc = container.querySelector(".ui-tooltip-content");
    if (!(mc instanceof Element)) return false;
    const messageText = mc.textContent || "";
    if (!containsProfanity(messageText)) {
      if (container.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(container);
      const cc = getCompteConversationCard(container);
      if (cc instanceof Element && cc.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(cc);
      return false;
    }
    if (profanityMode === "delete") {
      hideProfanityContainer(container);
      const cc = getCompteConversationCard(container);
      if (cc instanceof Element) {
        const tooltips = Array.from(cc.querySelectorAll("[role='tooltip']"));
        if (tooltips.length > 0 && tooltips.every((t) => t.dataset.tarotProfanityHidden === "true")) hideProfanityContainer(cc);
        else if (cc.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(cc);
      }
      return true;
    }
    if (container.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(container);
    const cc = getCompteConversationCard(container);
    if (cc instanceof Element && cc.dataset.tarotProfanityHidden === "true") restoreHiddenProfanityContainer(cc);
    if (profanityScope === "message") return processChatContainerMessageScope(mc);
    return processChatContainerWordScope(mc, profanityMode === "mask");
  }


  function applyProfanityFilter() {
    profanityFilterBusy = true;
    try {
      if (isForumSubjectPage()) snapshotForumSubjectThreads();
      if (profanityNeedsFullReset) {
        restoreProfanityMarkers(); restoreProfanityRevealWrappers(); restoreProfanityHiddenTooltips(); restoreForumSubjectThreads();
        profanityNeedsFullReset = false;
      }
      if (!profanityEnabled) return;
      const containers = Array.from(document.querySelectorAll(getProfanityChatSelector()));
      const privateMessageForms = Array.from(document.querySelectorAll(profanityPrivateMessageSelector));
      const targets = [...containers, ...privateMessageForms];
      if (!targets.length) return;
      targets.forEach((container) => {
        if (isForumSubjectPage() && profanityMode === "delete" && container instanceof Element && container.closest("div[id^='REP']") !== null) return;
        if (isCompteConversationTooltip(container)) { processCompteConversationTooltip(container); return; }
        if (isPrivateMessageForm(container)) {
          const bodyText = getPrivateMessageBodyText(container);
          if (profanityMode === "delete" || profanityScope === "message") processChatContainerMessageScope(container);
          else processChatContainerWordScope(container, profanityMode === "mask");
          if (profanityMode === "delete" && containsProfanity(bodyText)) closePrivateMessageDialog(container);
          return;
        }
        if (isTooltipContainer(container)) { processTooltipContainer(container); return; }
        if (profanityMode === "delete" || profanityScope === "message") processChatContainerMessageScope(container);
        else processChatContainerWordScope(container, profanityMode === "mask");
      });
      if (isForumSubjectPage() && profanityMode === "delete") renderForumSubjectDeleteThreads();
    } finally {
      profanityFilterBusy = false;
      if (profanityEnabled && profanityRefreshPending) { profanityRefreshPending = false; scheduleProfanityFilter(); }
    }
  }
  function scheduleProfanityFilter() {
    if (profanityRefreshQueued || profanityFilterBusy) return;
    profanityRefreshQueued = true;
    requestAnimationFrame(() => { profanityRefreshQueued = false; applyProfanityFilter(); });
  }
  function isProfanityRecapElement(el) { return el instanceof Element && (el.id === "chatCnt" || el.id === "mechacnt" || el.classList.contains("chatRecap")); }
  function mutationTouchesProfanityRecap(mutations) {
    return Array.from(mutations || []).some((m) => {
      const related = [m.target, ...Array.from(m.addedNodes || []), ...Array.from(m.removedNodes || [])];
      return related.some((n) => {
        if (!(n instanceof Node)) return false;
        if (n.nodeType === Node.ELEMENT_NODE) return isProfanityRecapElement(n) || n.querySelector(profanityRecapSelector) !== null;
        return n.parentElement !== null && (isProfanityRecapElement(n.parentElement) || n.parentElement.closest(profanityRecapSelector) !== null);
      });
    });
  }
  function ensureProfanityRecapObserver() {
    const target = document.documentElement || document.body;
    if (profanityRecapObserver || !target) return;
    profanityRecapObserver = new MutationObserver((mutations) => {
      if (!profanityEnabled) return;
      if (profanityFilterBusy) { profanityRefreshPending = true; return; }
      if (mutationTouchesProfanityRecap(mutations)) scheduleProfanityFilter();
    });
    profanityRecapObserver.observe(target, profanityRecapObserverOptions);
  }
  function ensureProfanityObserver() {
    const target = document.documentElement || document.body;
    if (profanityObserver || !target) return;
    profanityObserver = new MutationObserver((mutations) => {
      if (!profanityEnabled) return;
      if (profanityFilterBusy) { profanityRefreshPending = true; return; }
      const mutationsIncludeTooltip = Array.from(mutations || []).some((m) => {
        const related = [m.target, ...Array.from(m.addedNodes || [])];
        return related.some((n) => {
          if (!(n instanceof Node)) return false;
          if (n.nodeType === Node.ELEMENT_NODE) return n.matches("[role='tooltip']") || n.closest("[role='tooltip']") !== null;
          return n.parentElement !== null && n.parentElement.closest("[role='tooltip']") !== null;
        });
      });
      if (mutationsIncludeTooltip) { applyProfanityFilter(); return; }
      scheduleProfanityFilter();
    });
    profanityObserver.observe(target, profanityObserverOptions);
  }
  function reapplyProfanityFilter() {
    const shouldObserve = profanityEnabled;
    profanityRefreshQueued = false; profanityRefreshPending = false;
    if (profanityObserver) { profanityObserver.disconnect(); profanityObserver = null; }
    if (profanityRecapObserver) { profanityRecapObserver.disconnect(); profanityRecapObserver = null; }
    applyProfanityFilter();
    if (shouldObserve) { ensureProfanityObserver(); ensureProfanityRecapObserver(); }
  }
  function setProfanityFilterState(enabled, mode, scope) {
    const nextEnabled = Boolean(enabled);
    const nextMode = ["mask","hide","delete"].includes(mode) ? mode : "mask";
    const nextScope = ["insult","message"].includes(scope) ? scope : "insult";
    if (profanityEnabled !== nextEnabled || profanityMode !== nextMode || profanityScope !== nextScope) profanityNeedsFullReset = true;
    profanityEnabled = nextEnabled; profanityMode = nextMode; profanityScope = nextScope;
    if (!profanityEnabled) profanityRefreshPending = false;
    reapplyProfanityFilter();
    if (!profanityEnabled && profanityObserver) { profanityObserver.disconnect(); profanityObserver = null; }
    if (!profanityEnabled && profanityRecapObserver) { profanityRecapObserver.disconnect(); profanityRecapObserver = null; }
  }


  // --- Emoticons ---
  const emoticonToolbarSelector = "#chatBg td#chtput";
  const emoticonImageSourceMarker = "MythUp/Tarot-plus/refs/heads/";

  function getEmoticonToolbar() { return document.querySelector(emoticonToolbarSelector); }
  function generateEmoticonsHTML(disabled = {}) {
    let html = "";
    const emoticonBaseUrl = getExtensionURL("emots/");
    for (let i = 0; i < 65; i++) {
      const id = `Emoticon${i}`;
      if (!disabled[id]) html += `<img onclick="sendEmot(${i});" alt="Émoticône n°${i}" src="${emoticonBaseUrl}Emoticon${i}.png" class="emotIcon" style="margin: 0 4px;">`;
    }
    return html;
  }
  function isCustomEmoticonImage(img) { return img.src.includes(emoticonImageSourceMarker); }
  function injectEmoticonsScript() {
    if (emoticonsScriptInjected) return;
    injectInlineScript(EMOT_SCRIPT_CODE);
    emoticonsScriptInjected = true;
    console.log("[EXT] 📦 Script emot.js injecté avec succès !");
  }
  function ensureEmoticonsObserver() {
    if (emoticonsObserver || !document.body) return;
    emoticonsObserver = new MutationObserver(() => { if (isReplacingEmoticons) return; syncEmoticonToolbar(); });
    emoticonsObserver.observe(document.body, { childList: true, subtree: true });
    console.log("[EXT] 👁️ Observation du DOM activée.");
  }
  function restoreEmoticonToolbar(td = getEmoticonToolbar()) {
    if (!td || emoticonToolbarSnapshot === null || td.querySelector("input#chatInput")) return false;
    const snapshot = emoticonToolbarSnapshot; emoticonToolbarSnapshot = null;
    if (td.innerHTML !== snapshot) { isReplacingEmoticons = true; td.innerHTML = snapshot; isReplacingEmoticons = false; console.log("[EXT] 🔁 Émoticônes du site restaurées."); }
    return true;
  }
  function syncEmoticonToolbar() {
    const td = getEmoticonToolbar();
    if (!td) return;
    if (!emoticonsEnabled) { restoreEmoticonToolbar(td); return; }
    if (td.querySelector("input#chatInput")) return;
    const emotes = td.querySelectorAll("img");
    const hasMine = emotes.length > 0 && Array.from(emotes).every(isCustomEmoticonImage);
    if (hasMine) return;
    if (emoticonToolbarSnapshot === null) emoticonToolbarSnapshot = td.innerHTML;
    console.log("[EXT] 🔄 Remplacement des émoticônes du site...");
    isReplacingEmoticons = true;
    if (typeof updateEmoticons === "function") updateEmoticons();
    isReplacingEmoticons = false;
  }
  function setEmoticonsEnabled(enabled) {
    emoticonsEnabled = Boolean(enabled);
    window.disableEmoticons = !emoticonsEnabled;
    if (emoticonsEnabled) {
      updateEmoticons = () => {
        if (!emoticonsEnabled) return;
        const td = getEmoticonToolbar();
        if (!td || td.querySelector("input#chatInput")) return;
        storageLocal.get(["disabledEmoticons"], (storage) => {
          if (!emoticonsEnabled) return;
          const disabled = storage.disabledEmoticons || {};
          const nextHtml = generateEmoticonsHTML(disabled);
          if (emoticonToolbarSnapshot === null && td.innerHTML !== nextHtml) emoticonToolbarSnapshot = td.innerHTML;
          td.innerHTML = nextHtml;
          console.log("[EXT] 🔁 Émoticônes mises à jour dynamiquement.");
        });
      };
      injectEmoticonsScript();
      ensureEmoticonsObserver();
      syncEmoticonToolbar();
      return;
    }
    updateEmoticons = null;
    syncEmoticonToolbar();
  }

  // --- Unicode decoding ---
  function rememberUnicodeTextNode(node) { if (!unicodeOriginalTextNodes.has(node)) unicodeOriginalTextNodes.set(node, node.nodeValue); }
  function rememberUnicodeAttribute(element, attributeName) {
    let av = unicodeOriginalAttributes.get(element);
    if (!av) { av = new Map(); unicodeOriginalAttributes.set(element, av); }
    if (!av.has(attributeName)) av.set(attributeName, element.getAttribute(attributeName));
  }
  function rememberUnicodeControl(element) {
    if (unicodeOriginalControls.has(element)) return;
    const isTextArea = element instanceof HTMLTextAreaElement;
    unicodeOriginalControls.set(element, {
      defaultValue: element.defaultValue,
      value: isTextArea ? nativeTextAreaValueDescriptor.get.call(element) : nativeInputValueDescriptor.get.call(element),
    });
  }
  function restoreUnicodeTextNodes() { for (const [n, v] of unicodeOriginalTextNodes.entries()) { if (n.nodeValue !== v) n.nodeValue = v; } unicodeOriginalTextNodes.clear(); }
  function restoreUnicodeAttributes() {
    for (const [el, av] of unicodeOriginalAttributes.entries()) {
      for (const [attr, v] of av.entries()) {
        if (v === null) el.removeAttribute(attr); else if (el.getAttribute(attr) !== v) el.setAttribute(attr, v);
      }
    }
    unicodeOriginalAttributes.clear();
  }
  function restoreUnicodeControls() {
    for (const [el, orig] of unicodeOriginalControls.entries()) {
      el.defaultValue = orig.defaultValue;
      if (el instanceof HTMLTextAreaElement) { nativeTextAreaValueDescriptor.set.call(el, orig.value); continue; }
      nativeInputValueDescriptor.set.call(el, orig.value);
    }
    unicodeOriginalControls.clear();
  }
  function restoreUnicodeOriginalState() { restoreUnicodeControls(); restoreUnicodeAttributes(); restoreUnicodeTextNodes(); }
  function dispatchUnicodeBridgeState(enabled) {
    window.dispatchEvent(new CustomEvent(unicodeBridgeEventName, { detail: { enabled: Boolean(enabled) } }));
  }
  function injectUnicodeBridge() {
    if (unicodeBridgeInjected) { dispatchUnicodeBridgeState(unicodeDecodingEnabled); return; }
    injectInlineScript(UNICODE_BRIDGE_CODE);
    unicodeBridgeInjected = true;
    dispatchUnicodeBridgeState(unicodeDecodingEnabled);
  }
  function installUnicodeValueBridges() {
    if (unicodeValueBridgesInstalled || !nativeTextAreaValueDescriptor || !nativeInputValueDescriptor) return;
    Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
      configurable: true, enumerable: nativeTextAreaValueDescriptor.enumerable || false,
      get() { const v = nativeTextAreaValueDescriptor.get.call(this); return unicodeDecodingEnabled ? encodeUnicodeSequences(v) : v; },
      set(value) { nativeTextAreaValueDescriptor.set.call(this, unicodeDecodingEnabled ? decodeUnicodeDisplaySequences(value) : value); },
    });
    Object.defineProperty(HTMLInputElement.prototype, "value", {
      configurable: true, enumerable: nativeInputValueDescriptor.enumerable || false,
      get() { const v = nativeInputValueDescriptor.get.call(this); return unicodeDecodingEnabled && isUnicodeTextInput(this) ? encodeUnicodeSequences(v) : v; },
      set(value) { nativeInputValueDescriptor.set.call(this, unicodeDecodingEnabled && isUnicodeTextInput(this) ? decodeUnicodeDisplaySequences(value) : value); },
    });
    unicodeValueBridgesInstalled = true;
  }
  function installUnicodeTransportBridges() {
    if (unicodeTransportBridgesInstalled) return;
    if (typeof nativeEscape === "function") window.escape = function(value) { return escapeUnicodeTransportValue(value); };
    if (nativeFormDataAppend && nativeFormDataSet) {
      FormData.prototype.append = function(name, value, filename) {
        const nv = typeof value === "string" ? encodeUnicodeTransportValue(value) : value;
        return arguments.length > 2 ? nativeFormDataAppend.call(this, name, nv, filename) : nativeFormDataAppend.call(this, name, nv);
      };
      FormData.prototype.set = function(name, value, filename) {
        const nv = typeof value === "string" ? encodeUnicodeTransportValue(value) : value;
        return arguments.length > 2 ? nativeFormDataSet.call(this, name, nv, filename) : nativeFormDataSet.call(this, name, nv);
      };
    }
    if (nativeURLSearchParamsAppend && nativeURLSearchParamsSet) {
      URLSearchParams.prototype.append = function(name, value) { return nativeURLSearchParamsAppend.call(this, name, encodeUnicodeTransportValue(String(value))); };
      URLSearchParams.prototype.set = function(name, value) { return nativeURLSearchParamsSet.call(this, name, encodeUnicodeTransportValue(String(value))); };
    }
    unicodeTransportBridgesInstalled = true;
  }
  function syncUnicodeFormData(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const controls = Array.from(form.elements).filter((el) => isUnicodeTextControl(el) && !el.disabled && Boolean(el.name));
    if (!controls.length) return;
    controls.forEach((control) => { event.formData.set(control.name, encodeUnicodeSequences(control.value)); });
  }
  installUnicodeValueBridges();
  installUnicodeTransportBridges();
  document.addEventListener("formdata", syncUnicodeFormData);

  function shouldSkipUnicodeDecoding(element) {
    return element.closest("script, style, noscript") !== null || element.isContentEditable;
  }
  function decodeUnicodeAttribute(element, attributeName) {
    if (!element.hasAttribute(attributeName)) return;
    const currentValue = element.getAttribute(attributeName);
    const decodedValue = decodeUnicodeDisplaySequences(currentValue);
    if (decodedValue !== currentValue) { rememberUnicodeAttribute(element, attributeName); element.setAttribute(attributeName, decodedValue); }
  }
  function decodeUnicodeControlValue(element) {
    if (element.tagName === "TEXTAREA") {
      const cv = element.value, dv = decodeUnicodeDisplaySequences(cv);
      if (dv !== cv) { rememberUnicodeControl(element); element.value = dv; element.defaultValue = dv; }
      return;
    }
    if (element.tagName !== "INPUT") return;
    const inputType = (element.type || "").toLowerCase();
    if (["button","reset","submit"].includes(inputType)) {
      const cv = element.value, dv = decodeUnicodeDisplaySequences(cv);
      if (dv !== cv) { rememberUnicodeControl(element); element.value = dv; element.defaultValue = dv; }
      return;
    }
    if (!isUnicodeTextInput(element)) return;
    const cv = element.value, dv = decodeUnicodeDisplaySequences(cv);
    if (dv !== cv) { rememberUnicodeControl(element); element.value = dv; element.defaultValue = dv; }
  }
  function decodeUnicodeNode(node) {
    if (!unicodeDecodingEnabled || !node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const pe = node.parentElement;
      if (!pe || shouldSkipUnicodeDecoding(pe)) return;
      if (pe.tagName === "TEXTAREA") { decodeUnicodeControlValue(pe); return; }
      const cv = node.nodeValue, dv = decodeUnicodeDisplaySequences(cv);
      if (dv !== cv) { rememberUnicodeTextNode(node); node.nodeValue = dv; }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) node.childNodes.forEach((c) => decodeUnicodeNode(c));
      return;
    }
    const element = node;
    if (shouldSkipUnicodeDecoding(element)) return;
    unicodeDecodingAttributes.forEach((attr) => decodeUnicodeAttribute(element, attr));
    decodeUnicodeControlValue(element);
    element.childNodes.forEach((c) => decodeUnicodeNode(c));
  }
  function startUnicodeDecoding() {
    const root = document.documentElement;
    if (!root) { unicodeDecodingEnabled = false; return; }
    unicodeDecodingEnabled = true; dispatchUnicodeBridgeState(true); decodeUnicodeNode(root);
    if (unicodeDecodingObserver) return;
    unicodeDecodingObserver = new MutationObserver((mutations) => {
      if (!unicodeDecodingEnabled) return;
      mutations.forEach((m) => {
        if (m.type === "childList") { m.addedNodes.forEach((n) => decodeUnicodeNode(n)); return; }
        if (m.type === "characterData") { decodeUnicodeNode(m.target); return; }
        if (m.type === "attributes") decodeUnicodeNode(m.target);
      });
    });
    unicodeDecodingObserver.observe(root, { attributes: true, attributeFilter: unicodeDecodingAttributes, childList: true, characterData: true, subtree: true });
    console.log("[EXT] 🈯 Décodage Unicode dynamique activé.");
  }
  function stopUnicodeDecoding() {
    unicodeDecodingEnabled = false; dispatchUnicodeBridgeState(false);
    if (!unicodeDecodingObserver) { restoreUnicodeOriginalState(); console.log("[EXT] ⛔ Décodage Unicode dynamique désactivé."); return; }
    unicodeDecodingObserver.disconnect(); unicodeDecodingObserver = null; restoreUnicodeOriginalState();
    console.log("[EXT] ⛔ Décodage Unicode dynamique désactivé.");
  }


  // --- Forum share button ---
  storageLocal.set({ tarotTheme: isDark ? "dark" : "light" });
  let shareForumEnabled = true;
  let forumShareButtonScriptLoaded = false;
  let forumShareButtonLastURL = location.href;

  const setForumShareButtonInitialState = (enabled) => {
    const root = document.documentElement || document.body;
    if (root) root.dataset.forumShareButtonEnabled = enabled ? "true" : "false";
  };
  const dispatchForumShareButtonState = (enabled) => {
    document.dispatchEvent(new CustomEvent("forum-share-button-state", { detail: { enabled }, bubbles: true }));
  };
  const injectForumShareButtonScript = () => {
    if (forumShareButtonScriptLoaded) return;
    forumShareButtonScriptLoaded = true;
    injectInlineScript(BUTTON_FORUM_CODE);
  };
  const setForumShareButtonEnabled = (enabled) => {
    setForumShareButtonInitialState(enabled);
    if (!forumShareButtonScriptLoaded) {
      if (enabled && location.pathname.startsWith("/forum") && location.href.includes("/forum-sujet/")) injectForumShareButtonScript();
      return;
    }
    dispatchForumShareButtonState(enabled);
  };
  const syncForumShareButton = () => {
    const isForumSection = location.pathname.startsWith("/forum");
    const isForumSujetURL = location.href.includes("/forum-sujet/");
    setForumShareButtonEnabled(Boolean(shareForumEnabled && isForumSection && isForumSujetURL));
  };

  // --- Initialisation principale (équivalent de la fin de content.js) ---
  storageLocal.get(["enabledExt","shareForum","emoticonsEnabled","unicodeDecodingEnabled","disabledEmoticons","censureEnabled","censureMode","censureScope"], (data) => {
    if (!data.enabledExt) { console.log("[EXT] ❌ Extension désactivée."); return; }
    console.log("[EXT] ✅ Extension activée.");
    injectUnicodeBridge();
    ensureProfanityRecapObserver();
    shareForumEnabled = data.shareForum !== undefined ? data.shareForum : true;

    // Gestion du shouldStartGame après rechargement
    storageLocal.get(["shouldStartGame"], (d) => {
      if (d.shouldStartGame && typeof window.startGame === "function") window.startGame();
      storageLocal.set({ shouldStartGame: false });
    });

    void loadProfanityTerms().then(() => {
      setProfanityFilterState(data.censureEnabled !== undefined ? data.censureEnabled : true, data.censureMode || "mask", data.censureScope || "insult");
      if (data.unicodeDecodingEnabled !== undefined ? data.unicodeDecodingEnabled : true) startUnicodeDecoding();

      storageOnChanged.addListener((changes, ns) => {
        if (ns !== "local") return;
        if (changes.disabledEmoticons && emoticonsEnabled && typeof updateEmoticons === "function") { console.log("[EXT] 🆕 Changement détecté dans la config des émoticônes."); updateEmoticons(); }
        if (changes.emoticonsEnabled) { console.log("[EXT] 🧩 Changement détecté pour le mode émoticônes personnalisé."); setEmoticonsEnabled(changes.emoticonsEnabled.newValue !== undefined ? changes.emoticonsEnabled.newValue : true); }
        if (changes.unicodeDecodingEnabled) { if (changes.unicodeDecodingEnabled.newValue) startUnicodeDecoding(); else stopUnicodeDecoding(); }
        if (changes.shareForum) { shareForumEnabled = changes.shareForum.newValue !== undefined ? changes.shareForum.newValue : true; syncForumShareButton(); }
        if (changes.profanityTermsCustom) {
          void loadProfanityTerms().then(() => {
            profanityNeedsFullReset = true;
            if (profanityEnabled) reapplyProfanityFilter();
          });
        }
        if (changes.censureEnabled || changes.censureMode || changes.censureScope) {
          setProfanityFilterState(
            changes.censureEnabled ? (changes.censureEnabled.newValue !== undefined ? changes.censureEnabled.newValue : true) : profanityEnabled,
            changes.censureMode ? (changes.censureMode.newValue || profanityMode) : profanityMode,
            changes.censureScope ? (changes.censureScope.newValue || profanityScope) : profanityScope
          );
        }
      });

      syncForumShareButton();
      setEmoticonsEnabled(data.emoticonsEnabled !== undefined ? data.emoticonsEnabled : true);
      setInterval(() => { const u = location.href; if (u !== forumShareButtonLastURL) { forumShareButtonLastURL = u; syncForumShareButton(); } }, 1000);
      console.log("[EXT] 🎨 Gestion dynamique des émoticônes initialisée.");
    });
  });


  // =====================================================================
  // INJECTION CSS (Bootstrap 5 + popup.css via Shadow DOM)
  // =====================================================================

  function injectBootstrapCSS(shadow) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    shadow.appendChild(link);
  }

  function injectPopupStyles(shadow) {
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; display: block; font-family: system-ui, sans-serif; }
      #tarot-plus-popup-inner {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483640;
        display: flex; align-items: center; justify-content: center; pointer-events: none;
      }
      #tarot-plus-popup-inner.visible { pointer-events: all; }
      .tp-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2147483641; display: none;
      }
      .tp-backdrop.visible { display: block; }
      .tp-panel {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 320px; max-height: 90vh; overflow-y: auto;
        background-color: #f8f9fa; border-radius: 0.75rem;
        padding: 1rem; z-index: 2147483642; display: none;
        box-shadow: 0 0.5rem 2rem rgba(0,0,0,0.3);
        font-family: system-ui, sans-serif; font-size: 14px; color: #212529;
        scrollbar-width: thin; scrollbar-color: rgba(91,72,54,0.45) transparent;
      }
      .tp-panel::-webkit-scrollbar { width: 8px; }
      .tp-panel::-webkit-scrollbar-track { background: transparent; }
      .tp-panel::-webkit-scrollbar-thumb { background-color: rgba(91,72,54,0.45); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
      .tp-panel.visible { display: block; }
      .tp-panel.dark-mode { background-color: #1d160f; color: #f8f9fa; }
      .tp-panel.dark-mode #toggleExtensionContainer { background-color: #2a2015; box-shadow: 0 0 0.25rem rgba(255,255,255,0.05); }
      .tp-panel.dark-mode .censure-options-panel { background-color: #20180f; border-color: #5f4b34; }
      .tp-panel.dark-mode .censure-toggle-button { color: #efe7da; border-color: #4c3a2b; }
      .tp-panel.dark-mode .censure-toggle-button:hover { background-color: rgba(255,255,255,0.08); color: #fff; }
      .tp-panel.dark-mode .popup-modal .modal-content { background-color: #20180f; color: #f8f9fa; border-color: #5f4b34; }
      .tp-panel.dark-mode .popup-modal .modal-header, .tp-panel.dark-mode .popup-modal .modal-footer { border-color: #5f4b34; }
      .tp-panel.dark-mode .popup-modal .form-control { background-color: #2a2015; color: #f8f9fa; border-color: #5f4b34; }
      .tp-panel.dark-mode .popup-modal .text-muted { color: #d4c5b1 !important; }
      .tp-panel.dark-mode .popup-modal .btn-outline-secondary { color: #efe7da; border-color: #4c3a2b; }
      .tp-panel.dark-mode .popup-modal .btn-outline-warning { color: #ffe08a; border-color: #8a6f22; }
      .tp-panel.dark-mode .popup-modal .btn-primary { background-color: #5b4836; border-color: #4c3a2b; }
      .tp-panel.dark-mode .form-check-label, .tp-panel.dark-mode label, .tp-panel.dark-mode a { color: #f1f1f1 !important; }
      .tp-panel.dark-mode .text-muted { color: #ccc !important; }
      .tp-panel.dark-mode .text-reset { color: #ccc !important; }
      .tp-panel.dark-mode .reload-prompt { background: #2a2015; border-color: #5f4b34; color: #f8f9fa; }
      .tp-panel.dark-mode .reload-prompt p { color: #f4ede2; }
      .tp-panel.dark-mode .reload-prompt .btn-primary { background-color: #5b4836; border-color: #4c3a2b; }
      .tp-panel.dark-mode .reload-prompt .btn-outline-secondary { color: #efe7da; border-color: #4c3a2b; }
      .tp-panel.dark-mode .reload-prompt .btn-outline-secondary:hover { background-color: rgba(255,255,255,0.08); }
      .tp-panel.dark-mode .btn-close { filter: invert(1) grayscale(100%) brightness(200%); opacity: 1; }
      .tp-panel.dark-mode .carousel-control-prev, .tp-panel.dark-mode .carousel-control-next { filter: none; }
      #toggleExtensionContainer { background-color: #f8f9fa; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; box-shadow: 0 0 0.25rem rgba(0,0,0,0.05); }
      #toggleExtensionContainer .form-check-input { transform: scale(1.3); margin-right: 0.5rem; }
      #toggleExtensionContainer .form-check-label { font-weight: bold; }
      .reload-prompt { background: #fff3cd; border: 1px solid #ffeeba; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; text-align: center; font-size: 0.9rem; }
      .reload-prompt.d-none { display: none !important; }
      .censure-toggle-row { gap: 0.35rem; }
      .censure-toggle-button { display: inline-flex; align-items: center; justify-content: center; width: 1.85rem; min-width: 1.85rem; height: 1.85rem; padding: 0; margin-left: 0.1rem; font-weight: 700; line-height: 1; border-width: 1px; }
      .censure-toggle-icon { display: inline-block; font-size: 0.95rem; line-height: 1; transform: rotate(0deg); transform-origin: 50% 50%; transition: transform 180ms ease; }
      .censure-toggle-button[aria-expanded="true"] .censure-toggle-icon { transform: rotate(90deg); }
      .censure-options-panel { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; }
      .profanity-list-textarea { min-height: 220px; resize: vertical; font-family: Consolas, "Courier New", monospace; font-size: 0.85rem; }
      .carousel-control-prev, .carousel-control-next { filter: invert(100%); }
      label { -webkit-user-select: none; user-select: none; }
      .popup-close-btn { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: inherit; }
      .popup-close-btn:hover { background: rgba(0,0,0,0.1); }
    `;
    shadow.appendChild(style);
  }


  // =====================================================================
  // HTML DE LA POPUP (adapté de popup.html, injecté dans le Shadow DOM)
  // =====================================================================

  const POPUP_HTML = `
<div id="tarot-plus-popup-inner">
  <div class="tp-backdrop" id="tp-backdrop"></div>
  <div class="tp-panel" id="tp-panel" role="dialog" aria-modal="true" aria-label="Configuration Tarot+">
    <button class="popup-close-btn" id="tp-close-btn" aria-label="Fermer">&times;</button>
    <div class="container">
      <h3 class="mb-3 text-center">Configuration</h3>

      <div id="toggleExtensionContainer" class="d-flex justify-content-center align-items-center mb-4">
        <input class="form-check-input me-2" type="checkbox" id="toggleExtension">
        <label class="form-check-label" for="toggleExtension">Activer l'extension</label>
      </div>

      <div class="d-flex mb-3">
        <div class="form-check form-switch d-flex align-items-center">
          <input class="form-check-input me-2" type="checkbox" id="toggleEmoticons">
          <label class="form-check-label mb-0" for="toggleEmoticons">Plus d'émoticônes</label>
        </div>
      </div>

      <div class="d-flex mb-3">
        <div class="form-check form-switch d-flex align-items-center">
          <input class="form-check-input me-2" type="checkbox" id="toggleShareForum">
          <label class="form-check-label mb-0" for="toggleShareForum">Bouton de partage</label>
        </div>
      </div>

      <div class="d-flex mb-3">
        <div class="form-check form-switch d-flex align-items-center">
          <input class="form-check-input me-2" type="checkbox" id="toggleUnicodeDecoding">
          <label class="form-check-label mb-0" for="toggleUnicodeDecoding">Émojis et caractères spéciaux</label>
        </div>
      </div>

      <div class="d-flex align-items-center censure-toggle-row mb-3">
        <div class="form-check form-switch d-flex align-items-center">
          <input class="form-check-input me-2" type="checkbox" id="toggleCensure">
          <label class="form-check-label mb-0" for="toggleCensure">Censure</label>
        </div>
        <button class="btn btn-sm censure-toggle-button flex-shrink-0" type="button" id="censureToggleBtn" aria-expanded="false" aria-controls="censureOptions" aria-label="Afficher ou masquer les options de censure">
          <span class="censure-toggle-icon" aria-hidden="true">&#9658;</span>
          <span class="visually-hidden">Afficher ou masquer les options de censure</span>
        </button>
      </div>

      <div class="collapse mb-3" id="censureOptions">
        <div class="censure-options-panel p-2">
          <div class="small fw-semibold mb-2">Mode</div>
          <div class="form-check mb-1">
            <input class="form-check-input" type="radio" name="censureMode" id="censureModeMask" value="mask">
            <label class="form-check-label" for="censureModeMask">Masqué, révélé au clic</label>
          </div>
          <div class="form-check mb-1">
            <input class="form-check-input" type="radio" name="censureMode" id="censureModeHide" value="hide">
            <label class="form-check-label" for="censureModeHide">Masqué sans clic</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="censureMode" id="censureModeDelete" value="delete">
            <label class="form-check-label" for="censureModeDelete">Supprimé</label>
          </div>
          <div class="small fw-semibold mb-2">Portée</div>
          <div class="form-check mb-1">
            <input class="form-check-input" type="radio" name="censureScope" id="censureScopeInsult" value="insult">
            <label class="form-check-label" for="censureScopeInsult">Insulte seulement</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="censureScope" id="censureScopeMessage" value="message">
            <label class="form-check-label" for="censureScopeMessage">Message complet</label>
          </div>
          <div class="d-flex justify-content-center align-items-center gap-2 mt-3">
            <button id="manageProfanityListButton" class="btn btn-sm btn-outline-warning" type="button">Gérer la liste d'insultes</button>
            <button id="addProfanityButton" class="btn btn-sm btn-outline-primary fw-bold px-3" type="button" aria-label="Ajouter une insulte">+</button>
          </div>
        </div>
      </div>

      <div id="reloadHint" class="reload-prompt d-none">
        <p class="mb-2">Les modifications demandent un rechargement du site pour s'appliquer.</p>
        <div class="d-flex gap-2 justify-content-center">
          <button id="reloadPageButton" class="btn btn-sm btn-primary">Recharger maintenant</button>
          <button id="dismissReloadButton" class="btn btn-sm btn-outline-secondary">Plus tard</button>
        </div>
      </div>

      <hr />

      <h5 class="mb-3 text-center">Liste des émoticônes</h5>
      <div id="emoticonsCarousel" class="carousel slide mb-3">
        <div class="carousel-inner" id="emoticonsCarouselInner"></div>
        <button class="carousel-control-prev" type="button" id="carouselPrev">&#9668;</button>
        <button class="carousel-control-next" type="button" id="carouselNext">&#9658;</button>
      </div>

      <div class="text-center text-muted small mt-2">
        Version <span id="tp-version"></span> | Développé avec &#10084;&#65039; par
        <a href="https://github.com/MythUp" class="text-reset text-decoration-none" target="_blank" rel="noopener noreferrer">MythUp_</a>
      </div>
    </div>

    <!-- Modal: Avertissement profanité -->
    <div class="modal fade popup-modal" id="profanityWarningModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Avertissement</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
          </div>
          <div class="modal-body"><p class="mb-0">Cette liste contient du contenu offensant. Voulez-vous continuer ?</p></div>
          <div class="modal-footer">
            <button id="confirmProfanityWarningButton" type="button" class="btn btn-warning d-block mx-auto">Afficher la liste</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Gestion de la liste -->
    <div class="modal fade popup-modal" id="profanityListModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Gestion de la liste</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">Une entrée par ligne.</p>
            <textarea id="profanityListTextarea" class="form-control profanity-list-textarea" rows="12" spellcheck="false"></textarea>
            <div id="profanityListStatus" class="small mt-2"></div>
          </div>
          <div class="modal-footer">
            <button id="resetProfanityListButton" type="button" class="btn btn-outline-secondary">Réinitialiser</button>
            <button id="saveProfanityListButton" type="button" class="btn btn-primary">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Ajout d'insultes -->
    <div class="modal fade popup-modal" id="profanityAddModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ajouter des insultes</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">Une entrée par ligne.</p>
            <textarea id="profanityAddTextarea" class="form-control profanity-list-textarea" rows="8" spellcheck="false" placeholder="Nouvelle insulte"></textarea>
            <div id="profanityAddStatus" class="small mt-2"></div>
          </div>
          <div class="modal-footer">
            <button id="cancelAddedProfanityButton" type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
            <button id="saveAddedProfanityButton" type="button" class="btn btn-primary">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;


  // =====================================================================
  // LOGIQUE DE LA POPUP (adapté de popup.js)
  // =====================================================================

  let popupShadowRoot = null;
  let popupProfanityDefaultTerms = null;
  let popupProfanityWarningModalInstance = null;
  let popupProfanityListModalInstance = null;
  let popupProfanityAddModalInstance = null;

  function getPopupEl(id) { return popupShadowRoot && popupShadowRoot.getElementById(id); }

  function normalizeProfanityListPopup(terms) {
    const cleaned = [], seen = new Set();
    for (const term of (Array.isArray(terms) ? terms : [])) {
      const t = typeof term === "string" ? term.trim() : "";
      if (!t) continue;
      const k = t.toLocaleLowerCase("fr-FR");
      if (seen.has(k)) continue;
      seen.add(k); cleaned.push(t);
    }
    return cleaned;
  }
  function extractProfanityTermsPopup(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.terms)) return payload.terms;
    return [];
  }
  async function loadDefaultProfanityTermsPopup() {
    if (Array.isArray(popupProfanityDefaultTerms)) return popupProfanityDefaultTerms;
    popupProfanityDefaultTerms = normalizeProfanityListPopup(extractProfanityTermsPopup(BUILTIN_PROFANITY_CONFIG));
    return popupProfanityDefaultTerms;
  }
  async function loadEffectiveProfanityTermsPopup() {
    const [defaultTerms, storage] = await Promise.all([loadDefaultProfanityTermsPopup(), new Promise((r) => storageLocal.get(["profanityTermsCustom"], r))]);
    const customTerms = Array.isArray(storage.profanityTermsCustom) ? storage.profanityTermsCustom : [];
    return normalizeProfanityListPopup([...defaultTerms, ...customTerms]);
  }
  async function loadCustomProfanityTermsPopup() {
    const storage = await new Promise((r) => storageLocal.get(["profanityTermsCustom"], r));
    return Array.isArray(storage.profanityTermsCustom) ? storage.profanityTermsCustom : [];
  }
  function formatProfanityListPopup(terms) { return normalizeProfanityListPopup(terms).join("\n"); }
  function parseProfanityListInputPopup(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const candidate = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.terms) ? parsed.terms : null);
      if (candidate) return normalizeProfanityListPopup(candidate);
    } catch { /* fallback */ }
    return normalizeProfanityListPopup(raw.split(/\r?\n/));
  }
  function setProfanityListStatus(message, tone = "muted") {
    const el = getPopupEl("profanityListStatus");
    if (!el) return;
    el.textContent = message; el.className = `small mt-2 text-${tone}`;
  }
  function setProfanityAddStatus(message, tone = "muted") {
    const el = getPopupEl("profanityAddStatus");
    if (!el) return;
    el.textContent = message; el.className = `small mt-2 text-${tone}`;
  }
  function showProfanityWarning() {
    if (!popupProfanityWarningModalInstance) { void openProfanityListManager(); return; }
    popupProfanityWarningModalInstance.show();
  }
  async function openProfanityListManager() {
    if (!popupProfanityListModalInstance) return;
    const ta = getPopupEl("profanityListTextarea");
    try {
      const terms = await loadEffectiveProfanityTermsPopup();
      if (ta) ta.value = formatProfanityListPopup(terms);
      setProfanityListStatus(`Liste chargée (${terms.length} entrées).`);
      popupProfanityListModalInstance.show();
    } catch (err) {
      console.error("Impossible de charger la liste d'insultes.", err);
      setProfanityListStatus("Impossible de charger la liste.", "danger");
      popupProfanityListModalInstance.show();
    }
  }
  async function openProfanityAddModal() {
    if (!popupProfanityAddModalInstance) return;
    const ta = getPopupEl("profanityAddTextarea");
    if (ta) ta.value = "";
    setProfanityAddStatus("Ajoute une ou plusieurs insultes, une par ligne.");
    popupProfanityAddModalInstance.show();
    if (ta) setTimeout(() => ta.focus(), 0);
  }
  async function saveAddedProfanityTerms() {
    const ta = getPopupEl("profanityAddTextarea");
    if (!ta) return;
    try {
      const termsToAdd = parseProfanityListInputPopup(ta.value);
      if (!termsToAdd.length) { setProfanityAddStatus("Ajoute au moins une entrée.", "warning"); return; }
      const current = await loadCustomProfanityTermsPopup();
      const merged = normalizeProfanityListPopup([...current, ...termsToAdd]);
      const addedCount = Math.max(merged.length - normalizeProfanityListPopup(current).length, 0);
      await new Promise((r) => storageLocal.set({ profanityTermsCustom: merged }, r));
      setProfanityAddStatus(addedCount > 0 ? `Ajout enregistré (${addedCount} nouvelle${addedCount > 1 ? "s" : ""} entrée${addedCount > 1 ? "s" : ""}).` : "Aucune nouvelle entrée à ajouter.", addedCount > 0 ? "success" : "warning");
      if (popupProfanityAddModalInstance) popupProfanityAddModalInstance.hide();
    } catch (err) { console.error("Impossible d'ajouter les insultes.", err); setProfanityAddStatus("Ajout impossible.", "danger"); }
  }
  async function saveProfanityList() {
    const ta = getPopupEl("profanityListTextarea");
    if (!ta) return;
    try {
      const terms = parseProfanityListInputPopup(ta.value);
      await new Promise((r) => storageLocal.set({ profanityTermsCustom: terms }, r));
      setProfanityListStatus(`Liste enregistrée (${terms.length} entrées).`, "success");
    } catch (err) { console.error("Impossible d'enregistrer la liste.", err); setProfanityListStatus("Enregistrement impossible.", "danger"); }
  }
  async function resetProfanityList() {
    try {
      await new Promise((r) => storageLocal.remove(["profanityTermsCustom"], r));
      const defaults = await loadDefaultProfanityTermsPopup();
      const ta = getPopupEl("profanityListTextarea");
      if (ta) ta.value = formatProfanityListPopup(defaults);
      setProfanityListStatus(`Liste réinitialisée (${defaults.length} entrées).`, "success");
    } catch (err) { console.error("Impossible de réinitialiser.", err); setProfanityListStatus("Réinitialisation impossible.", "danger"); }
  }

  function setRadioValue(inputs, value) { inputs.forEach((i) => { i.checked = i.value === value; }); }
  function getSelectedRadioValue(inputs) { const s = inputs.find((i) => i.checked); return s ? s.value : null; }

  function loadPopupEmoticons(disabledEmoticons) {
    const carouselInner = getPopupEl("emoticonsCarouselInner");
    if (!carouselInner) return;
    carouselInner.innerHTML = "";
    const total = 65, perSlide = 15;
    for (let i = 0; i < total; i += perSlide) {
      const slide = document.createElement("div");
      slide.className = `carousel-item${i === 0 ? " active" : ""}`;
      const wrapper = document.createElement("div");
      wrapper.className = "d-flex flex-wrap justify-content-center gap-2 p-2";
      for (let j = i; j < Math.min(i + perSlide, total); j++) {
        const id = `Emoticon${j}`;
        const src = getExtensionURL(`emots/Emoticon${j}.png`);
        const img = document.createElement("img");
        img.src = src; img.width = 32; img.height = 32; img.draggable = false;
        img.classList.add("img-thumbnail", "p-1"); img.dataset.id = id; img.style.cursor = "pointer";
        if (disabledEmoticons[id]) img.classList.add("opacity-25");
        img.addEventListener("click", () => {
          storageLocal.get("disabledEmoticons", (data) => {
            const disabled = data.disabledEmoticons || {};
            if (img.classList.contains("opacity-25")) { delete disabled[id]; img.classList.remove("opacity-25"); }
            else { disabled[id] = true; img.classList.add("opacity-25"); }
            storageLocal.set({ disabledEmoticons: disabled });
          });
        });
        wrapper.appendChild(img);
      }
      slide.appendChild(wrapper);
      carouselInner.appendChild(slide);
    }
  }

  function showPopupReloadPrompt() { const el = getPopupEl("reloadHint"); if (el) el.classList.remove("d-none"); }
  function hidePopupReloadPrompt() { const el = getPopupEl("reloadHint"); if (el) el.classList.add("d-none"); }

  function ensureAndSetPopup(key, value, promptReload = true) {
    storageLocal.set({ [key]: value }, () => {
      console.log(`${key} maintenant ${value}`);
      if (promptReload) showPopupReloadPrompt();
    });
  }

  // Carousel simple (sans Bootstrap carousel JS pour éviter conflits)
  let carouselCurrentSlide = 0;
  function updateCarousel() {
    if (!popupShadowRoot) return;
    const slides = Array.from(popupShadowRoot.querySelectorAll("#emoticonsCarouselInner .carousel-item"));
    slides.forEach((s, i) => s.classList.toggle("active", i === carouselCurrentSlide));
  }

  function syncCensureUiState() {
    const censureModeInputs = Array.from(popupShadowRoot ? popupShadowRoot.querySelectorAll("input[name='censureMode']") : []);
    const toggleCensure = getPopupEl("toggleCensure");
    const censureScopeInputs = Array.from(popupShadowRoot ? popupShadowRoot.querySelectorAll("input[name='censureScope']") : []);
    const selectedMode = getSelectedRadioValue(censureModeInputs) || "mask";
    const disableScope = selectedMode === "delete";
    censureScopeInputs.forEach((i) => { i.disabled = disableScope; });
    const panel = getPopupEl("censureOptions");
    if (panel) panel.classList.toggle("opacity-50", !toggleCensure || !toggleCensure.checked);
  }


  function openPopup() {
    if (!popupShadowRoot) return;
    const panel = getPopupEl("tp-panel");
    const backdrop = getPopupEl("tp-backdrop");
    if (panel) panel.classList.add("visible");
    if (backdrop) backdrop.classList.add("visible");
  }

  function closePopup() {
    if (!popupShadowRoot) return;
    const panel = getPopupEl("tp-panel");
    const backdrop = getPopupEl("tp-backdrop");
    if (panel) panel.classList.remove("visible");
    if (backdrop) backdrop.classList.remove("visible");
  }

  function initPopup() {
    // Créer le host pour le Shadow DOM
    const shadowHost = document.createElement("div");
    shadowHost.id = "tarot-plus-shadow-host";
    shadowHost.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483640;";
    document.body.appendChild(shadowHost);

    const shadow = shadowHost.attachShadow({ mode: "open" });
    popupShadowRoot = shadow;

    injectBootstrapCSS(shadow);
    injectPopupStyles(shadow);

    const container = document.createElement("div");
    container.innerHTML = POPUP_HTML;
    shadow.appendChild(container);

    // Thème sombre
    const panel = shadow.getElementById("tp-panel");
    if (panel && isDark) panel.classList.add("dark-mode");

    // Bouton fermer
    const closeBtn = shadow.getElementById("tp-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closePopup);

    // Fermer au clic sur backdrop
    const backdrop = shadow.getElementById("tp-backdrop");
    if (backdrop) backdrop.addEventListener("click", closePopup);

    // Version
    const versionEl = shadow.getElementById("tp-version");
    if (versionEl) versionEl.textContent = TAROT_PLUS_VERSION;

    // Initialiser Bootstrap modals (en passant les éléments du shadow DOM)
    const profanityWarningModalEl = shadow.getElementById("profanityWarningModal");
    const profanityListModalEl = shadow.getElementById("profanityListModal");
    const profanityAddModalEl = shadow.getElementById("profanityAddModal");

    // Attendre que Bootstrap soit disponible
    const tryInitModals = () => {
      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        if (profanityWarningModalEl) popupProfanityWarningModalInstance = new bootstrap.Modal(profanityWarningModalEl);
        if (profanityListModalEl) popupProfanityListModalInstance = new bootstrap.Modal(profanityListModalEl);
        if (profanityAddModalEl) popupProfanityAddModalInstance = new bootstrap.Modal(profanityAddModalEl);
      } else {
        setTimeout(tryInitModals, 100);
      }
    };
    tryInitModals();

    // Collapse censure options (implémentation manuelle sans Bootstrap collapse)
    const censureToggleBtn = shadow.getElementById("censureToggleBtn");
    const censureOptionsEl = shadow.getElementById("censureOptions");
    if (censureToggleBtn && censureOptionsEl) {
      censureToggleBtn.addEventListener("click", () => {
        const isExpanded = censureToggleBtn.getAttribute("aria-expanded") === "true";
        censureToggleBtn.setAttribute("aria-expanded", String(!isExpanded));
        if (isExpanded) {
          censureOptionsEl.style.display = "none";
          censureToggleBtn.setAttribute("aria-expanded", "false");
        } else {
          censureOptionsEl.style.display = "block";
          censureToggleBtn.setAttribute("aria-expanded", "true");
        }
      });
      censureOptionsEl.style.display = "none";
    }

    // Carousel manuel
    const prevBtn = shadow.getElementById("carouselPrev");
    const nextBtn = shadow.getElementById("carouselNext");
    if (prevBtn) prevBtn.addEventListener("click", () => {
      const slides = Array.from(shadow.querySelectorAll("#emoticonsCarouselInner .carousel-item"));
      if (!slides.length) return;
      carouselCurrentSlide = (carouselCurrentSlide - 1 + slides.length) % slides.length;
      updateCarousel();
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      const slides = Array.from(shadow.querySelectorAll("#emoticonsCarouselInner .carousel-item"));
      if (!slides.length) return;
      carouselCurrentSlide = (carouselCurrentSlide + 1) % slides.length;
      updateCarousel();
    });

    // Charger les paramètres et initialiser l'UI
    storageLocal.get(["enabledExt","shareForum","emoticonsEnabled","unicodeDecodingEnabled","disabledEmoticons","censureEnabled","censureMode","censureScope"], (data) => {
      const toggleExtension = shadow.getElementById("toggleExtension");
      const toggleShareForum = shadow.getElementById("toggleShareForum");
      const toggleEmoticons = shadow.getElementById("toggleEmoticons");
      const toggleUnicodeDecoding = shadow.getElementById("toggleUnicodeDecoding");
      const toggleCensure = shadow.getElementById("toggleCensure");
      const censureModeInputs = Array.from(shadow.querySelectorAll("input[name='censureMode']"));
      const censureScopeInputs = Array.from(shadow.querySelectorAll("input[name='censureScope']"));

      if (toggleExtension) toggleExtension.checked = data.enabledExt !== undefined ? data.enabledExt : true;
      if (toggleShareForum) toggleShareForum.checked = data.shareForum !== undefined ? data.shareForum : true;
      if (toggleEmoticons) toggleEmoticons.checked = data.emoticonsEnabled !== undefined ? data.emoticonsEnabled : true;
      if (toggleUnicodeDecoding) toggleUnicodeDecoding.checked = data.unicodeDecodingEnabled !== undefined ? data.unicodeDecodingEnabled : true;
      if (toggleCensure) toggleCensure.checked = data.censureEnabled !== undefined ? data.censureEnabled : true;
      setRadioValue(censureModeInputs, data.censureMode || "mask");
      setRadioValue(censureScopeInputs, data.censureScope || "insult");
      syncCensureUiState();

      const disabled = data.disabledEmoticons || {};
      loadPopupEmoticons(disabled);

      // Événements des toggles
      if (toggleExtension) toggleExtension.addEventListener("change", () => ensureAndSetPopup("enabledExt", toggleExtension.checked));
      if (toggleShareForum) toggleShareForum.addEventListener("change", () => ensureAndSetPopup("shareForum", toggleShareForum.checked, false));
      if (toggleEmoticons) toggleEmoticons.addEventListener("change", () => ensureAndSetPopup("emoticonsEnabled", toggleEmoticons.checked, false));
      if (toggleUnicodeDecoding) toggleUnicodeDecoding.addEventListener("change", () => ensureAndSetPopup("unicodeDecodingEnabled", toggleUnicodeDecoding.checked, false));
      if (toggleCensure) toggleCensure.addEventListener("change", () => { ensureAndSetPopup("censureEnabled", toggleCensure.checked, false); syncCensureUiState(); });
      censureModeInputs.forEach((input) => input.addEventListener("change", () => { if (!input.checked) return; ensureAndSetPopup("censureMode", input.value, false); syncCensureUiState(); }));
      censureScopeInputs.forEach((input) => input.addEventListener("change", () => { if (!input.checked) return; ensureAndSetPopup("censureScope", input.value, false); syncCensureUiState(); }));
    });

    // Boutons de rechargement
    const reloadBtn = shadow.getElementById("reloadPageButton");
    const dismissBtn = shadow.getElementById("dismissReloadButton");
    if (reloadBtn) reloadBtn.addEventListener("click", () => {
      const inputElement = document.getElementById("modeleJeuCartes");
      const shouldStartGame = inputElement && inputElement.value === "0";
      storageLocal.set({ shouldStartGame, needsReload: false }, () => { location.reload(); });
      hidePopupReloadPrompt();
    });
    if (dismissBtn) dismissBtn.addEventListener("click", () => hidePopupReloadPrompt());

    // Gestion de la liste de profanité
    const manageProfBtn = shadow.getElementById("manageProfanityListButton");
    const addProfBtn = shadow.getElementById("addProfanityButton");
    const confirmWarnBtn = shadow.getElementById("confirmProfanityWarningButton");
    const saveListBtn = shadow.getElementById("saveProfanityListButton");
    const resetListBtn = shadow.getElementById("resetProfanityListButton");
    const saveAddBtn = shadow.getElementById("saveAddedProfanityButton");
    const cancelAddBtn = shadow.getElementById("cancelAddedProfanityButton");

    if (manageProfBtn) manageProfBtn.addEventListener("click", () => showProfanityWarning());
    if (addProfBtn) addProfBtn.addEventListener("click", () => void openProfanityAddModal());
    if (confirmWarnBtn) confirmWarnBtn.addEventListener("click", () => {
      if (!popupProfanityWarningModalInstance) { void openProfanityListManager(); return; }
      popupProfanityWarningModalEl && popupProfanityWarningModalEl.addEventListener("hidden.bs.modal", () => void openProfanityListManager(), { once: true });
      popupProfanityWarningModalInstance.hide();
    });
    if (saveListBtn) saveListBtn.addEventListener("click", () => void saveProfanityList());
    if (resetListBtn) resetListBtn.addEventListener("click", () => void resetProfanityList());
    if (saveAddBtn) saveAddBtn.addEventListener("click", () => void saveAddedProfanityTerms());
    if (cancelAddBtn) cancelAddBtn.addEventListener("click", () => { if (popupProfanityAddModalInstance) popupProfanityAddModalInstance.hide(); });

    void loadDefaultProfanityTermsPopup().catch((err) => console.warn("Impossible de précharger la liste d'insultes.", err));
  }

