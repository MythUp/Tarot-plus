const isDark = document.querySelector("#webBody.themeSombre") !== null;
let isReplacingEmoticons = false;
let unicodeDecodingEnabled = false;
let unicodeDecodingObserver = null;
let updateEmoticons = null;

const unicodeExcludedInputTypes = new Set(["button", "file", "image", "reset", "submit"]);

const nativeTextAreaValueDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
const nativeEscape = window.escape;
const nativeFormDataAppend = window.FormData?.prototype?.append;
const nativeFormDataSet = window.FormData?.prototype?.set;
const nativeURLSearchParamsAppend = window.URLSearchParams?.prototype?.append;
const nativeURLSearchParamsSet = window.URLSearchParams?.prototype?.set;

let unicodeValueBridgesInstalled = false;
let unicodeTransportBridgesInstalled = false;

const unicodeOriginalTextNodes = new Map();
const unicodeOriginalAttributes = new Map();
const unicodeOriginalControls = new Map();

const unicodeDecodingAttributes = [
  "alt",
  "aria-description",
  "aria-label",
  "data-bs-original-title",
  "data-original-title",
  "label",
  "placeholder",
  "title",
];

const unicodeDecodingPattern = /%u([0-9a-fA-F]{4})/g;

function decodeUnicodeSequences(value) {
  if (typeof value !== "string" || !value.includes("%u")) {
    return value;
  }

  return value.replace(unicodeDecodingPattern, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
}

function encodeUnicodeSequences(value) {
  if (typeof value !== "string" || !/[^\u0000-\u007f]/.test(value)) {
    return value;
  }

  let encodedValue = "";

  for (const character of value) {
    const codePoint = character.codePointAt(0);
    encodedValue += codePoint > 127 ? `&#x${codePoint.toString(16).toUpperCase()};` : character;
  }

  return encodedValue;
}

function decodeUnicodeEntitySequences(value) {
  if (typeof value !== "string" || !value.includes("&#")) {
    return value;
  }

  return value.replace(/&#(x?[0-9a-fA-F]+);?/g, (match, entityValue) => {
    const isHex = entityValue.startsWith("x") || entityValue.startsWith("X");
    const codePoint = Number.parseInt(isHex ? entityValue.slice(1) : entityValue, isHex ? 16 : 10);

    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
      return match;
    }

    return String.fromCodePoint(codePoint);
  });
}

function decodeUnicodeDisplaySequences(value) {
  return decodeUnicodeSequences(decodeUnicodeEntitySequences(value));
}

function encodeUnicodeTransportValue(value) {
  return encodeUnicodeSequences(decodeUnicodeDisplaySequences(value));
}

function isUnicodeTextInput(element) {
  return element instanceof HTMLInputElement && !unicodeExcludedInputTypes.has((element.type || "").toLowerCase());
}

function isUnicodeTextControl(element) {
  return element instanceof HTMLTextAreaElement || isUnicodeTextInput(element);
}

function rememberUnicodeTextNode(node) {
  if (!unicodeOriginalTextNodes.has(node)) {
    unicodeOriginalTextNodes.set(node, node.nodeValue);
  }
}

function rememberUnicodeAttribute(element, attributeName) {
  let attributeValues = unicodeOriginalAttributes.get(element);
  if (!attributeValues) {
    attributeValues = new Map();
    unicodeOriginalAttributes.set(element, attributeValues);
  }

  if (!attributeValues.has(attributeName)) {
    attributeValues.set(attributeName, element.getAttribute(attributeName));
  }
}

function rememberUnicodeControl(element) {
  if (unicodeOriginalControls.has(element)) {
    return;
  }

  const isTextArea = element instanceof HTMLTextAreaElement;
  unicodeOriginalControls.set(element, {
    defaultValue: element.defaultValue,
    value: isTextArea
      ? nativeTextAreaValueDescriptor.get.call(element)
      : nativeInputValueDescriptor.get.call(element),
  });
}

function restoreUnicodeTextNodes() {
  for (const [node, originalValue] of unicodeOriginalTextNodes.entries()) {
    if (node.nodeValue !== originalValue) {
      node.nodeValue = originalValue;
    }
  }

  unicodeOriginalTextNodes.clear();
}

function restoreUnicodeAttributes() {
  for (const [element, attributeValues] of unicodeOriginalAttributes.entries()) {
    for (const [attributeName, originalValue] of attributeValues.entries()) {
      if (originalValue === null) {
        element.removeAttribute(attributeName);
      } else if (element.getAttribute(attributeName) !== originalValue) {
        element.setAttribute(attributeName, originalValue);
      }
    }
  }

  unicodeOriginalAttributes.clear();
}

function restoreUnicodeControls() {
  for (const [element, original] of unicodeOriginalControls.entries()) {
    element.defaultValue = original.defaultValue;

    if (element instanceof HTMLTextAreaElement) {
      nativeTextAreaValueDescriptor.set.call(element, original.value);
      continue;
    }

    nativeInputValueDescriptor.set.call(element, original.value);
  }

  unicodeOriginalControls.clear();
}

function restoreUnicodeOriginalState() {
  restoreUnicodeControls();
  restoreUnicodeAttributes();
  restoreUnicodeTextNodes();
}

function installUnicodeValueBridges() {
  if (unicodeValueBridgesInstalled) {
    return;
  }

  if (!nativeTextAreaValueDescriptor || !nativeInputValueDescriptor) {
    return;
  }

  Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
    configurable: true,
    enumerable: nativeTextAreaValueDescriptor.enumerable ?? false,
    get() {
      const currentValue = nativeTextAreaValueDescriptor.get.call(this);
      return unicodeDecodingEnabled ? encodeUnicodeSequences(currentValue) : currentValue;
    },
    set(value) {
      const nextValue = unicodeDecodingEnabled ? decodeUnicodeDisplaySequences(value) : value;
      nativeTextAreaValueDescriptor.set.call(this, nextValue);
    },
  });

  Object.defineProperty(HTMLInputElement.prototype, "value", {
    configurable: true,
    enumerable: nativeInputValueDescriptor.enumerable ?? false,
    get() {
      const currentValue = nativeInputValueDescriptor.get.call(this);
      return unicodeDecodingEnabled && isUnicodeTextInput(this) ? encodeUnicodeSequences(currentValue) : currentValue;
    },
    set(value) {
      const nextValue = unicodeDecodingEnabled && isUnicodeTextInput(this) ? decodeUnicodeDisplaySequences(value) : value;
      nativeInputValueDescriptor.set.call(this, nextValue);
    },
  });

  unicodeValueBridgesInstalled = true;
}

function installUnicodeTransportBridges() {
  if (unicodeTransportBridgesInstalled) {
    return;
  }

  if (typeof nativeEscape === "function") {
    window.escape = function(value) {
      if (!unicodeDecodingEnabled) {
        return nativeEscape(value);
      }

      return nativeEscape(encodeUnicodeTransportValue(typeof value === "string" ? value : String(value)));
    };
  }

  if (nativeFormDataAppend && nativeFormDataSet) {
    FormData.prototype.append = function(name, value, filename) {
      const nextValue = unicodeDecodingEnabled && typeof value === "string"
        ? encodeUnicodeTransportValue(value)
        : value;

      return arguments.length > 2
        ? nativeFormDataAppend.call(this, name, nextValue, filename)
        : nativeFormDataAppend.call(this, name, nextValue);
    };

    FormData.prototype.set = function(name, value, filename) {
      const nextValue = unicodeDecodingEnabled && typeof value === "string"
        ? encodeUnicodeTransportValue(value)
        : value;

      return arguments.length > 2
        ? nativeFormDataSet.call(this, name, nextValue, filename)
        : nativeFormDataSet.call(this, name, nextValue);
    };
  }

  if (nativeURLSearchParamsAppend && nativeURLSearchParamsSet) {
    URLSearchParams.prototype.append = function(name, value) {
      const nextValue = unicodeDecodingEnabled
        ? encodeUnicodeTransportValue(String(value))
        : String(value);

      return nativeURLSearchParamsAppend.call(this, name, nextValue);
    };

    URLSearchParams.prototype.set = function(name, value) {
      const nextValue = unicodeDecodingEnabled
        ? encodeUnicodeTransportValue(String(value))
        : String(value);

      return nativeURLSearchParamsSet.call(this, name, nextValue);
    };
  }

  unicodeTransportBridgesInstalled = true;
}

function syncUnicodeFormData(event) {
  if (!unicodeDecodingEnabled) {
    return;
  }

  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const controls = Array.from(form.elements).filter(
    (element) => isUnicodeTextControl(element) && !element.disabled && Boolean(element.name)
  );

  if (!controls.length) {
    return;
  }

  controls.forEach((control) => {
    event.formData.set(control.name, encodeUnicodeSequences(control.value));
  });
}

installUnicodeValueBridges();
installUnicodeTransportBridges();
document.addEventListener("formdata", syncUnicodeFormData);

function shouldSkipUnicodeDecoding(element) {
  return (
    element.closest("script, style, noscript") !== null ||
    element.isContentEditable
  );
}

function decodeUnicodeAttribute(element, attributeName) {
  if (!element.hasAttribute(attributeName)) {
    return;
  }

  const currentValue = element.getAttribute(attributeName);
  const decodedValue = decodeUnicodeDisplaySequences(currentValue);

  if (decodedValue !== currentValue) {
    rememberUnicodeAttribute(element, attributeName);
    element.setAttribute(attributeName, decodedValue);
  }
}

function decodeUnicodeControlValue(element) {
  if (element.tagName === "TEXTAREA") {
    const currentValue = element.value;
    const decodedValue = decodeUnicodeDisplaySequences(currentValue);

    if (decodedValue !== currentValue) {
      rememberUnicodeControl(element);
      element.value = decodedValue;
      element.defaultValue = decodedValue;
    }

    return;
  }

  if (element.tagName !== "INPUT") {
    return;
  }

  const inputType = (element.type || "").toLowerCase();

  if (["button", "reset", "submit"].includes(inputType)) {
    const currentValue = element.value;
    const decodedValue = decodeUnicodeDisplaySequences(currentValue);

    if (decodedValue !== currentValue) {
      rememberUnicodeControl(element);
      element.value = decodedValue;
      element.defaultValue = decodedValue;
    }

    return;
  }

  if (!isUnicodeTextInput(element)) {
    return;
  }

  const currentValue = element.value;
  const decodedValue = decodeUnicodeDisplaySequences(currentValue);

  if (decodedValue !== currentValue) {
    rememberUnicodeControl(element);
    element.value = decodedValue;
    element.defaultValue = decodedValue;
  }
}

function decodeUnicodeNode(node) {
  if (!unicodeDecodingEnabled || !node) {
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const parentElement = node.parentElement;

    if (!parentElement || shouldSkipUnicodeDecoding(parentElement)) {
      return;
    }

    if (parentElement.tagName === "TEXTAREA") {
      decodeUnicodeControlValue(parentElement);
      return;
    }

    const currentValue = node.nodeValue;
    const decodedValue = decodeUnicodeDisplaySequences(currentValue);

    if (decodedValue !== currentValue) {
      rememberUnicodeTextNode(node);
      node.nodeValue = decodedValue;
    }

    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      node.childNodes.forEach((childNode) => decodeUnicodeNode(childNode));
    }

    return;
  }

  const element = node;

  if (shouldSkipUnicodeDecoding(element)) {
    return;
  }

  unicodeDecodingAttributes.forEach((attributeName) => {
    decodeUnicodeAttribute(element, attributeName);
  });

  decodeUnicodeControlValue(element);

  element.childNodes.forEach((childNode) => decodeUnicodeNode(childNode));
}

function startUnicodeDecoding() {
  const root = document.documentElement;

  if (!root) {
    unicodeDecodingEnabled = false;
    return;
  }

  unicodeDecodingEnabled = true;

  decodeUnicodeNode(root);

  if (unicodeDecodingObserver) {
    return;
  }

  unicodeDecodingObserver = new MutationObserver((mutations) => {
    if (!unicodeDecodingEnabled) {
      return;
    }

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((addedNode) => decodeUnicodeNode(addedNode));
        return;
      }

      if (mutation.type === "characterData") {
        decodeUnicodeNode(mutation.target);
        return;
      }

      if (mutation.type === "attributes") {
        decodeUnicodeNode(mutation.target);
      }
    });
  });

  unicodeDecodingObserver.observe(root, {
    attributes: true,
    attributeFilter: unicodeDecodingAttributes,
    childList: true,
    characterData: true,
    subtree: true,
  });

  console.log("[EXT] 🈯 Décodage Unicode dynamique activé.");
}

function stopUnicodeDecoding() {
  unicodeDecodingEnabled = false;

  if (!unicodeDecodingObserver) {
    restoreUnicodeOriginalState();
    console.log("[EXT] ⛔ Décodage Unicode dynamique désactivé.");
    return;
  }

  unicodeDecodingObserver.disconnect();
  unicodeDecodingObserver = null;
  restoreUnicodeOriginalState();
  console.log("[EXT] ⛔ Décodage Unicode dynamique désactivé.");
}

chrome.storage.local.set({ tarotTheme: isDark ? "dark" : "light" }, () => {
  console.log("[EXT] Thème actuel enregistré :", isDark ? "dark" : "light");
});

chrome.storage.local.get(
  ["enabledExt", "shareForum", "emoticonsEnabled", "unicodeDecodingEnabled", "disabledEmoticons"],
  (data) => {
    if (!data.enabledExt) return console.log("[EXT] ❌ Extension désactivée.");

    console.log("[EXT] ✅ Extension activée.");

    if (data.unicodeDecodingEnabled ?? true) {
      startUnicodeDecoding();
    }

    chrome.storage.onChanged.addListener((changes, ns) => {
      if (ns !== "local") {
        return;
      }

      if (changes.disabledEmoticons && data.emoticonsEnabled && typeof updateEmoticons === "function") {
        console.log("[EXT] 🆕 Changement détecté dans la config des émoticônes.");
        updateEmoticons();
      }

      if (changes.unicodeDecodingEnabled) {
        if (changes.unicodeDecodingEnabled.newValue) {
          startUnicodeDecoding();
        } else {
          stopUnicodeDecoding();
        }
      }
    });

    // === 🔹 EMOTICONS PERSONNALISÉES ===
    if (data.emoticonsEnabled) {
      console.log("[EXT] 🎨 Mode émoticônes personnalisé activé.");

      // Génère le HTML des émoticônes autorisées
      const generateEmoticonsHTML = (disabled = {}) => {
        let html = "";
        for (let i = 0; i < 65; i++) {
          const id = `Emoticon${i}`;
          if (!disabled[id]) {
            html += `<img onclick="sendEmot(${i});" alt="Émoticône n°${i}" src="https://raw.githubusercontent.com/MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/main/emots/Emoticon${i}.png" class="emotIcon" style="margin: 0 4px;">`;
          }
        }
        return html;
      };

      const isMine = (img) => img.src.includes("MythUp/Extension-de-Tarot-en-ligne---GitHub/refs/heads/");

      updateEmoticons = () => {
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
