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

const unicodeDecodingPattern = /%u([0-9a-fA-F]{4,6})/g;
const hexadecimalDecodingPattern = /(^|[^0-9A-Fa-f])((?:[Uu]\+|0[xX]|\\[xX])([0-9a-fA-F]{2,6}))/g;

function decodeUnicodeSequences(value) {
  if (typeof value !== "string" || !value.includes("%u")) {
    return value;
  }

  return value.replace(unicodeDecodingPattern, (_, hex) =>
    String.fromCodePoint(Number.parseInt(hex, 16))
  );
}

function decodeHexadecimalSequences(value) {
  if (typeof value !== "string" || !value.match(/(?:[Uu]\+|0[xX]|\\[xX])/)) {
    return value;
  }

  return value.replace(hexadecimalDecodingPattern, (match, prefix, _sequence, hex) => {
    const codePoint = Number.parseInt(hex, 16);

    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
      return match;
    }

    return `${prefix}${String.fromCodePoint(codePoint)}`;
  });
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
  if (typeof value !== "string" || !value.includes("&")) {
    return value;
  }

  return value.replace(/&(?:#([xX]?[0-9a-fA-F]+)|([xX][0-9a-fA-F]+));?/g, (match, decimalOrHexEntity, hexEntity) => {
    const entityValue = decimalOrHexEntity ?? hexEntity;

    if (!entityValue) {
      return match;
    }

    const isHex = entityValue.startsWith("x") || entityValue.startsWith("X");
    const codePoint = Number.parseInt(isHex ? entityValue.slice(1) : entityValue, isHex ? 16 : 10);

    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
      return match;
    }

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

const profanityPlaceholderText = "** Censure **";
const profanityChatSelector = "#chat, [role='tooltip'], #mechacnt, p.chatRecap";
const profanityRecapSelector = "#chatCnt, #mechacnt, .chatRecap";
const profanityRevealSelector = "[data-tarot-profanity-revealed='true']";
const profanityMarkerSelector = "[data-tarot-profanity-original-html]";
const profanityTooltipHiddenSelector = "[role='tooltip'][data-tarot-profanity-hidden='true']";
const profanitySkipSelector = `${profanityRevealSelector}, ${profanityMarkerSelector}`;
const profanityTermsResourceUrl = chrome.runtime.getURL("profanity-terms.json");

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
let profanityTermsLoadToken = 0;
let profanityRecapObserver = null;
const profanityObserverOptions = {
  childList: true,
  characterData: true,
  subtree: true,
};
const profanityRecapObserverOptions = {
  attributes: true,
  attributeFilter: ["class", "id"],
  childList: true,
  characterData: true,
  subtree: true,
};
const profanityWordCharacterPattern = /[\p{L}\p{N}]/u;

function normalizeProfanityText(value) {
  return typeof value === "string" ? value.toLocaleLowerCase("fr-FR") : "";
}

function normalizeProfanityKey(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function splitProfanitySearchTokens(value) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  const tokens = [];

  for (const match of value.matchAll(/\S+/gu)) {
    const rawToken = match[0];
    const normalizedToken = normalizeProfanityKey(rawToken);

    if (!normalizedToken) {
      continue;
    }

    tokens.push({
      end: match.index + rawToken.length,
      hasSymbols: /[^\p{L}\p{N}]/u.test(rawToken),
      normalized: normalizedToken,
      start: match.index,
    });
  }

  return tokens;
}

function getProfanityChatSelector() {
  const selectors = [profanityChatSelector];

  if (location.pathname.startsWith("/forum-sujet/")) {
    selectors.push("div.sujetForum");
  }

  return selectors.join(", ");
}

function extractProfanityConfig(payload) {
  if (Array.isArray(payload)) {
    return { terms: payload, whitelist: [] };
  }

  if (payload && typeof payload === "object") {
    return {
      terms: Array.isArray(payload.terms) ? payload.terms : [],
      whitelist: Array.isArray(payload.whitelist) ? payload.whitelist : [],
    };
  }

  return { terms: [], whitelist: [] };
}

function normalizeProfanityTermList(terms) {
  const normalizedTerms = [];
  const seenTerms = new Set();

  for (const term of Array.isArray(terms) ? terms : []) {
    const cleanedTerm = typeof term === "string" ? term.trim() : "";

    if (!cleanedTerm) {
      continue;
    }

    const normalizedKey = normalizeProfanityKey(cleanedTerm);

    if (seenTerms.has(normalizedKey)) {
      continue;
    }

    seenTerms.add(normalizedKey);
    normalizedTerms.push(cleanedTerm);
  }

  return normalizedTerms;
}

function buildProfanityEntries(terms) {
  const entries = [];
  const entriesByCandidateLength = new Map();
  const candidateLengths = new Set();
  let minCandidateLength = Number.POSITIVE_INFINITY;
  let maxCandidateLength = 0;

  for (const term of normalizeProfanityTermList(terms)) {
    const normalizedTokens = term
      .split(/\s+/u)
      .map((token) => normalizeProfanityKey(token))
      .filter(Boolean);

    const normalizedTerm = normalizedTokens.join("");
    const tokenCount = normalizedTokens.length;

    if (!tokenCount) {
      continue;
    }

    const tolerance = 1;
    const entry = {
      normalized: normalizedTerm,
      tokenCount,
      tolerance,
    };

    entries.push(entry);

    minCandidateLength = Math.min(minCandidateLength, tokenCount);
    maxCandidateLength = Math.max(maxCandidateLength, tokenCount);

    const currentEntries = entriesByCandidateLength.get(tokenCount);

    if (currentEntries) {
      currentEntries.push(entry);
    } else {
      entriesByCandidateLength.set(tokenCount, [entry]);
    }

    candidateLengths.add(tokenCount);
  }

  return {
    entries,
    entriesByCandidateLength,
    candidateLengths: Array.from(candidateLengths).sort((left, right) => left - right),
    maxCandidateLength,
    minCandidateLength: Number.isFinite(minCandidateLength) ? minCandidateLength : 0,
  };
}

async function readProfanityTermsFromJson() {
  const response = await fetch(profanityTermsResourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Impossible de charger ${profanityTermsResourceUrl} (${response.status})`);
  }

  const payload = await response.json();
  return extractProfanityConfig(payload);
}

async function loadProfanityTerms() {
  const loadToken = ++profanityTermsLoadToken;

  try {
    const [defaultConfig, storage] = await Promise.all([
      readProfanityTermsFromJson(),
      new Promise((resolve) => chrome.storage.local.get(["profanityTermsCustom"], resolve)),
    ]);

    if (loadToken !== profanityTermsLoadToken) {
      return profanityEntries;
    }

    const customTerms = Array.isArray(storage.profanityTermsCustom)
      ? storage.profanityTermsCustom
      : [];

    const effectiveTerms = normalizeProfanityTermList([
      ...defaultConfig.terms,
      ...customTerms,
    ]);

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
    if (loadToken === profanityTermsLoadToken) {
      profanityEntries = [];
      profanityWhitelist = new Set();
      profanityEntriesByCandidateLength = new Map();
      profanityCandidateLengths = [];
      profanityMinCandidateLength = 0;
      profanityMaxCandidateLength = 0;
    }

    return profanityEntries;
  }
}

function isProfanityWordCharacter(character) {
  return typeof character === "string" && character.length > 0 && profanityWordCharacterPattern.test(character);
}

function levenshteinWithinLimit(source, target, limit) {
  if (Math.abs(source.length - target.length) > limit) {
    return false;
  }

  let previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    const sourceCharacter = source[sourceIndex];
    const currentRow = [sourceIndex + 1];
    let rowMinimum = currentRow[0];

    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      const targetCharacter = target[targetIndex];
      const substitutionCost = sourceCharacter === targetCharacter ? 0 : 1;
      const deletionCost = previousRow[targetIndex + 1] + 1;
      const insertionCost = currentRow[targetIndex] + 1;
      const substitutionOrMatchCost = previousRow[targetIndex] + substitutionCost;
      const currentDistance = Math.min(deletionCost, insertionCost, substitutionOrMatchCost);

      currentRow.push(currentDistance);
      rowMinimum = Math.min(rowMinimum, currentDistance);
    }

    if (rowMinimum > limit) {
      return false;
    }

    previousRow = currentRow;
  }

  return previousRow[target.length] <= limit;
}

function mergeProfanityMatchSpans(spans) {
  if (!spans.length) {
    return [];
  }

  const sortedSpans = [...spans].sort((left, right) => left.start - right.start || left.end - right.end);
  const mergedSpans = [];
  let currentSpan = { ...sortedSpans[0] };

  for (let index = 1; index < sortedSpans.length; index += 1) {
    const nextSpan = sortedSpans[index];

    if (nextSpan.start <= currentSpan.end) {
      currentSpan.end = Math.max(currentSpan.end, nextSpan.end);
      continue;
    }

    mergedSpans.push(currentSpan);
    currentSpan = { ...nextSpan };
  }

  mergedSpans.push(currentSpan);
  return mergedSpans;
}

function getProfanityMatchSpans(value) {
  if (typeof value !== "string" || !value.trim() || !profanityEntries.length) {
    return [];
  }

  const tokens = splitProfanitySearchTokens(value);
  const spans = [];

  for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
    if (profanityMinCandidateLength && startIndex + profanityMinCandidateLength > tokens.length) {
      break;
    }

    for (const length of profanityCandidateLengths) {
      if (startIndex + length > tokens.length) {
        break;
      }

      const candidateEntries = profanityEntriesByCandidateLength.get(length);

      if (!candidateEntries || !candidateEntries.length) {
        continue;
      }

      const endIndex = startIndex + length;
      const candidateTokens = tokens.slice(startIndex, endIndex);
      const candidate = candidateTokens.map((token) => token.normalized).join("");
      const candidateHasSymbols = candidateTokens.some((token) => token.hasSymbols);

      if (!candidate || profanityWhitelist.has(candidate)) {
        continue;
      }

      for (const term of candidateEntries) {
        const allowedDistance = candidate === term.normalized ? 0 : candidateHasSymbols ? term.tolerance : 0;

        if (levenshteinWithinLimit(term.normalized, candidate, allowedDistance)) {
          spans.push({
            end: candidateTokens[candidateTokens.length - 1].end,
            start: candidateTokens[0].start,
          });
          break;
        }
      }
    }
  }

  return mergeProfanityMatchSpans(spans);
}

function containsProfanity(value) {
  return getProfanityMatchSpans(value).length > 0;
}

function appendChatNodeSpec(fragment, spec) {
  if (spec.kind === "text") {
    fragment.appendChild(document.createTextNode(spec.value));
    return;
  }

  fragment.appendChild(spec.node.cloneNode(true));
}

function serializeChatNodeSpecs(specs) {
  const wrapper = document.createElement("div");

  specs.forEach((spec) => {
    appendChatNodeSpec(wrapper, spec);
  });

  return wrapper.innerHTML;
}

function getNodeListText(nodes) {
  return nodes.map((node) => node.textContent ?? "").join("");
}

function serializeText(value) {
  const wrapper = document.createElement("div");
  wrapper.textContent = value;
  return wrapper.innerHTML;
}

function isProfanityRevealElement(element) {
  return element instanceof Element && element.matches(profanityRevealSelector);
}

function isProfanityMarkerElement(element) {
  return element instanceof Element && element.matches(profanityMarkerSelector);
}

function createProfanityMarker(originalHtml, { clickable, block, hidden, displaySuffixText = "", preserveContents = false, blockWrapperTagName = null }) {
  const marker = document.createElement("span");
  marker.dataset.tarotProfanityOriginalHtml = originalHtml;
  marker.dataset.tarotProfanityBlock = block ? "true" : "false";
  if (preserveContents) {
    marker.dataset.tarotProfanityPreserveContents = "true";
  }

  if (hidden) {
    marker.textContent = "";
    marker.style.display = "none";
  } else if (block && blockWrapperTagName) {
    const placeholder = document.createElement(blockWrapperTagName);
    placeholder.textContent = `${profanityPlaceholderText}${displaySuffixText}`;
    marker.replaceChildren(placeholder);
    marker.style.display = "block";
  } else if (block) {
    marker.textContent = `${profanityPlaceholderText}${displaySuffixText}`;
    marker.style.display = "block";
  } else {
    marker.textContent = `${profanityPlaceholderText}${displaySuffixText}`;
    marker.style.display = "inline";
  }

  if (clickable && !hidden) {
    marker.className = "tarot-profanity-censor tarot-profanity-censor-clickable";
    marker.setAttribute("role", "button");
    marker.setAttribute("tabindex", "0");
    marker.title = "Cliquer pour afficher le message d'origine";
    marker.style.cursor = "pointer";

    const reveal = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      revealProfanityMarker(marker);
    };

    marker.addEventListener("click", reveal);
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        reveal(event);
      }
    });
  } else {
    marker.className = hidden ? "tarot-profanity-delete" : "tarot-profanity-censor";
  }

  return marker;
}

function createProfanityRevealWrapper(originalHtml, block) {
  const wrapper = document.createElement("span");
  wrapper.dataset.tarotProfanityRevealed = "true";
  wrapper.className = "tarot-profanity-revealed";
  wrapper.style.display = "contents";
  wrapper.innerHTML = originalHtml;
  return wrapper;
}

function replaceElementContentsWithMarker(element, marker) {
  if (!(element instanceof Element)) {
    return false;
  }

  element.replaceChildren(marker);
  return true;
}

function findSingleMeaningfulChildElement(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  for (const child of element.children) {
    if (containsProfanity(child.textContent ?? "")) {
      return child;
    }
  }

  return element;
}

function revealProfanityMarker(marker) {
  if (!marker || !marker.isConnected) {
    return;
  }

  const originalHtml = marker.dataset.tarotProfanityOriginalHtml ?? "";
  const preserveContents = marker.dataset.tarotProfanityPreserveContents === "true";

  if (preserveContents) {
    marker.insertAdjacentHTML("beforebegin", originalHtml);
    marker.remove();
    return;
  }

  const block = marker.dataset.tarotProfanityBlock === "true";
  const revealWrapper = createProfanityRevealWrapper(originalHtml, block);
  marker.replaceWith(revealWrapper);
}

function restoreProfanityMarker(marker) {
  if (!marker || !marker.isConnected) {
    return;
  }

  const originalHtml = marker.dataset.tarotProfanityOriginalHtml ?? "";

  if (marker.dataset.tarotProfanityPreserveContents === "true") {
    marker.insertAdjacentHTML("beforebegin", originalHtml);
    marker.remove();
    return;
  }

  marker.insertAdjacentHTML("beforebegin", originalHtml);
  marker.remove();
}

function restoreProfanityMarkers(root = document) {
  const markers = Array.from(root.querySelectorAll(profanityMarkerSelector));

  markers.forEach((marker) => {
    restoreProfanityMarker(marker);
  });
}

function restoreProfanityRevealWrappers(root = document) {
  const wrappers = Array.from(root.querySelectorAll(profanityRevealSelector));

  wrappers.forEach((wrapper) => {
    const originalHtml = wrapper.innerHTML;
    wrapper.insertAdjacentHTML("beforebegin", originalHtml);
    wrapper.remove();
  });
}

function restoreProfanityHiddenTooltips(root = document) {
  const tooltips = Array.from(root.querySelectorAll(profanityTooltipHiddenSelector));

  tooltips.forEach((tooltip) => {
    const originalDisplay = tooltip.dataset.tarotProfanityOriginalDisplay ?? "";

    if (originalDisplay) {
      tooltip.style.display = originalDisplay;
    } else {
      tooltip.style.removeProperty("display");
    }

    delete tooltip.dataset.tarotProfanityHidden;
    delete tooltip.dataset.tarotProfanityOriginalDisplay;
  });
}

function isProfanitySkipNode(node) {
  return Boolean(node.parentElement && node.parentElement.closest(profanitySkipSelector));
}

function isTooltipContainer(container) {
  return container.closest("[role='tooltip']") !== null;
}

function isChatTimestampNode(node) {
  return node.nodeType === Node.ELEMENT_NODE && node.tagName === "FONT";
}

function findLastChatTimestampIndex(nodes) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    if (isChatTimestampNode(nodes[index])) {
      return index;
    }
  }

  return -1;
}

function findFirstMessageTextIndex(nodes, limitIndex) {
  for (let index = 0; index < limitIndex; index += 1) {
    const node = nodes[index];

    if (node.nodeType !== Node.TEXT_NODE) {
      continue;
    }

    if ((node.nodeValue ?? "").includes(":")) {
      return index;
    }
  }

  return -1;
}

function splitChatPrefixText(text) {
  const colonIndex = text.indexOf(":");

  if (colonIndex === -1) {
    return null;
  }

  let splitIndex = colonIndex + 1;

  while (splitIndex < text.length && /\s/u.test(text[splitIndex])) {
    splitIndex += 1;
  }

  return {
    bodyText: text.slice(splitIndex),
    prefixText: text.slice(0, splitIndex),
  };
}

function buildPreservedChatMessageParts(nodesToReplace) {
  const timestampIndex = findLastChatTimestampIndex(nodesToReplace);
  const contentEndIndex = timestampIndex === -1 ? nodesToReplace.length : timestampIndex;
  const messageTextIndex = findFirstMessageTextIndex(nodesToReplace, contentEndIndex);

  if (messageTextIndex === -1) {
    return null;
  }

  const messageTextNode = nodesToReplace[messageTextIndex];
  const splitText = splitChatPrefixText(messageTextNode.nodeValue ?? "");

  if (!splitText) {
    return null;
  }

  const prefixSpecs = [];

  for (let index = 0; index < messageTextIndex; index += 1) {
    prefixSpecs.push({ kind: "node", node: nodesToReplace[index] });
  }

  prefixSpecs.push({ kind: "text", value: splitText.prefixText });

  const bodySpecs = [];

  if (splitText.bodyText) {
    bodySpecs.push({ kind: "text", value: splitText.bodyText });
  }

  for (let index = messageTextIndex + 1; index < contentEndIndex; index += 1) {
    bodySpecs.push({ kind: "node", node: nodesToReplace[index] });
  }

  if (!bodySpecs.length) {
    return null;
  }

  const suffixSpecs = [];

  for (let index = contentEndIndex; index < nodesToReplace.length; index += 1) {
    suffixSpecs.push({ kind: "node", node: nodesToReplace[index] });
  }

  return {
    bodySpecs,
    prefixSpecs,
    suffixSpecs,
  };
}

function replaceChatSegmentWithSpecs(container, nodesToReplace, prefixSpecs, marker, suffixSpecs) {
  if (!nodesToReplace.length) {
    return false;
  }

  const fragment = document.createDocumentFragment();

  prefixSpecs.forEach((spec) => {
    appendChatNodeSpec(fragment, spec);
  });

  fragment.appendChild(marker);

  suffixSpecs.forEach((spec) => {
    appendChatNodeSpec(fragment, spec);
  });

  container.insertBefore(fragment, nodesToReplace[0]);
  nodesToReplace.forEach((node) => node.remove());
  return true;
}

function serializeNodeList(nodes) {
  return serializeChatNodeSpecs(nodes.map((node) => ({ kind: "node", node })));
}

function replaceProfanityInTextNode(textNode, clickable = true) {
  const text = textNode.nodeValue ?? "";
  const matches = getProfanityMatchSpans(text);

  if (!matches.length) {
    return false;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  matches.forEach((match) => {
    const start = match.start;
    const end = match.end;

    if (start > cursor) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
    }

    const originalHtml = serializeText(text.slice(start, end));
    const marker = createProfanityMarker(originalHtml, {
      clickable,
      block: false,
      hidden: false,
    });

    fragment.appendChild(marker);
    cursor = end;
  });

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  textNode.replaceWith(fragment);
  return true;
}

function segmentContainsReveal(nodes) {
  return nodes.some((node) => {
    if (isProfanityRevealElement(node)) {
      return true;
    }

    return node.nodeType === Node.ELEMENT_NODE && node.querySelector(profanityRevealSelector) !== null;
  });
}

function segmentContainsMarkers(nodes) {
  return nodes.some((node) => {
    if (isProfanityMarkerElement(node)) {
      return true;
    }

    return node.nodeType === Node.ELEMENT_NODE && node.querySelector(profanityMarkerSelector) !== null;
  });
}

function replaceSegmentWithMarker(container, nodesToReplace, marker) {
  if (!nodesToReplace.length) {
    return;
  }

  const firstNode = nodesToReplace[0];
  container.insertBefore(marker, firstNode);
  nodesToReplace.forEach((node) => node.remove());
}

function processChatSegment(container, nodesToReplace) {
  if (!nodesToReplace.length || segmentContainsReveal(nodesToReplace)) {
    return false;
  }

  const segmentText = getNodeListText(nodesToReplace);

  if (!containsProfanity(segmentText)) {
    return false;
  }

  if (profanityMode === "delete") {
    const marker = createProfanityMarker(serializeNodeList(nodesToReplace), {
      clickable: false,
      block: true,
      hidden: true,
    });

    replaceSegmentWithMarker(container, nodesToReplace, marker);
    return true;
  }

  if (profanityScope === "message") {
    const preservedParts = buildPreservedChatMessageParts(nodesToReplace);

    if (preservedParts) {
      const bodyText = preservedParts.bodySpecs.map((spec) => (spec.kind === "text" ? spec.value : spec.node.textContent ?? "")).join("");

      if (containsProfanity(bodyText)) {
        const marker = createProfanityMarker(serializeChatNodeSpecs(preservedParts.bodySpecs), {
          clickable: profanityMode === "mask",
          block: false,
          displaySuffixText: preservedParts.suffixSpecs.length ? " " : "",
          hidden: false,
        });

        return replaceChatSegmentWithSpecs(container, nodesToReplace, preservedParts.prefixSpecs, marker, preservedParts.suffixSpecs);
      }
    }

    if (nodesToReplace.length === 1 && nodesToReplace[0] instanceof Element) {
      const messageWrapperElement = findSingleMeaningfulChildElement(nodesToReplace[0]);

      if (!messageWrapperElement) {
        return false;
      }

      const marker = createProfanityMarker(messageWrapperElement.innerHTML, {
        clickable: profanityMode === "mask",
        block: false,
        hidden: false,
        preserveContents: true,
      });

      return replaceElementContentsWithMarker(messageWrapperElement, marker);
    }
  }

  const marker = createProfanityMarker(serializeNodeList(nodesToReplace), {
    clickable: profanityMode === "mask",
    block: true,
    blockWrapperTagName: nodesToReplace.some((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === "P") ? "p" : null,
    hidden: false,
  });

  replaceSegmentWithMarker(container, nodesToReplace, marker);
  return true;
}

function processChatContainerMessageScope(container) {
  const snapshot = Array.from(container.childNodes);
  let segmentStart = 0;
  let mutated = false;

  for (let index = 0; index <= snapshot.length; index += 1) {
    const node = snapshot[index];
    const isBoundary = index === snapshot.length || (node && node.nodeName === "BR");

    if (!isBoundary) {
      continue;
    }

    const segmentEnd = index;
    const hasLeadingBreak = segmentStart > 0 && snapshot[segmentStart - 1]?.nodeName === "BR";
    const startIndex = hasLeadingBreak ? segmentStart - 1 : segmentStart;
    const nodesToReplace = snapshot.slice(startIndex, segmentEnd);

    if (nodesToReplace.length && !segmentContainsMarkers(nodesToReplace)) {
      mutated = processChatSegment(container, nodesToReplace) || mutated;
    }

    segmentStart = index + 1;
  }

  return mutated;
}

function processChatContainerWordScope(container, clickable = true) {
  const textNodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (isProfanitySkipNode(textNode)) {
      continue;
    }

    if (containsProfanity(textNode.nodeValue ?? "")) {
      textNodes.push(textNode);
    }
  }

  let mutated = false;
  textNodes.forEach((textNode) => {
    mutated = replaceProfanityInTextNode(textNode, clickable) || mutated;
  });

  return mutated;
}

function processTooltipContainer(container) {
  const content = container.textContent ?? "";
  const isProfane = containsProfanity(content);

  if (!isProfane) {
    if (container.dataset.tarotProfanityHidden === "true") {
      const originalDisplay = container.dataset.tarotProfanityOriginalDisplay ?? "";

      if (originalDisplay) {
        container.style.display = originalDisplay;
      } else {
        container.style.removeProperty("display");
      }

      delete container.dataset.tarotProfanityHidden;
      delete container.dataset.tarotProfanityOriginalDisplay;
    }

    return false;
  }

  if (container.dataset.tarotProfanityHidden === "true") {
    container.style.display = "none";
    return true;
  }

  if (!container.dataset.tarotProfanityOriginalDisplay) {
    container.dataset.tarotProfanityOriginalDisplay = container.style.display ?? "";
  }

  container.dataset.tarotProfanityHidden = "true";
  container.style.display = "none";
  return true;
}

function applyProfanityFilter() {
  profanityFilterBusy = true;

  try {
    if (profanityNeedsFullReset) {
      restoreProfanityMarkers();
      restoreProfanityRevealWrappers();
      restoreProfanityHiddenTooltips();
      profanityNeedsFullReset = false;
    }

    if (!profanityEnabled) {
      return;
    }

    const containers = Array.from(document.querySelectorAll(getProfanityChatSelector()));

    if (!containers.length) {
      return;
    }

    containers.forEach((container) => {
      if (isTooltipContainer(container)) {
        processTooltipContainer(container);
        return;
      }

      if (profanityMode === "delete" || profanityScope === "message") {
        processChatContainerMessageScope(container);
      } else {
        processChatContainerWordScope(container, profanityMode === "mask");
      }
    });
  } finally {
    profanityFilterBusy = false;

    if (profanityEnabled && profanityRefreshPending) {
      profanityRefreshPending = false;
      scheduleProfanityFilter();
    }
  }
}

function scheduleProfanityFilter() {
  if (profanityRefreshQueued || profanityFilterBusy) {
    return;
  }

  profanityRefreshQueued = true;
  requestAnimationFrame(() => {
    profanityRefreshQueued = false;
    applyProfanityFilter();
  });
}

function isProfanityRecapElement(element) {
  return element instanceof Element
    && (element.id === "chatCnt" || element.id === "mechacnt" || element.classList.contains("chatRecap"));
}

function mutationTouchesProfanityRecap(mutations) {
  return Array.from(mutations ?? []).some((mutation) => {
    const relatedNodes = [mutation.target, ...Array.from(mutation.addedNodes ?? []), ...Array.from(mutation.removedNodes ?? [])];

    return relatedNodes.some((node) => {
      if (!(node instanceof Node)) {
        return false;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (isProfanityRecapElement(node)) {
          return true;
        }

        return node.querySelector(profanityRecapSelector) !== null;
      }

      return node.parentElement !== null
        && (isProfanityRecapElement(node.parentElement)
          || node.parentElement.closest(profanityRecapSelector) !== null);
    });
  });
}

function ensureProfanityRecapObserver() {
  const observerTarget = document.documentElement || document.body;

  if (profanityRecapObserver || !observerTarget) {
    return;
  }

  profanityRecapObserver = new MutationObserver((mutations) => {
    if (!profanityEnabled) {
      return;
    }

    if (profanityFilterBusy) {
      profanityRefreshPending = true;
      return;
    }

    if (mutationTouchesProfanityRecap(mutations)) {
      scheduleProfanityFilter();
    }
  });

  profanityRecapObserver.observe(observerTarget, profanityRecapObserverOptions);
}

function ensureProfanityObserver() {
  const observerTarget = document.documentElement || document.body;

  if (profanityObserver || !observerTarget) {
    return;
  }

  profanityObserver = new MutationObserver((mutations) => {
    if (!profanityEnabled) {
      return;
    }

    if (profanityFilterBusy) {
      profanityRefreshPending = true;
      return;
    }

    const mutationsIncludeTooltip = Array.from(mutations ?? []).some((mutation) => {
      const relatedNodes = [mutation.target, ...Array.from(mutation.addedNodes ?? [])];

      return relatedNodes.some((node) => {
        if (!(node instanceof Node)) {
          return false;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.matches("[role='tooltip']") || node.closest("[role='tooltip']") !== null;
        }

        return node.parentElement !== null && node.parentElement.closest("[role='tooltip']") !== null;
      });
    });

    if (mutationsIncludeTooltip) {
      applyProfanityFilter();
      return;
    }

    scheduleProfanityFilter();
  });

  profanityObserver.observe(observerTarget, profanityObserverOptions);
}

function setProfanityFilterState(enabled, mode, scope) {
  const nextEnabled = Boolean(enabled);
  const nextMode = ["mask", "hide", "delete"].includes(mode) ? mode : "mask";
  const nextScope = ["insult", "message"].includes(scope) ? scope : "insult";

  if (profanityEnabled !== nextEnabled || profanityMode !== nextMode || profanityScope !== nextScope) {
    profanityNeedsFullReset = true;
  }

  profanityEnabled = nextEnabled;
  profanityMode = nextMode;
  profanityScope = nextScope;

  if (!profanityEnabled) {
    profanityRefreshPending = false;
  }

  if (profanityEnabled) {
    ensureProfanityObserver();
    ensureProfanityRecapObserver();
  }

  applyProfanityFilter();

  if (!profanityEnabled && profanityObserver) {
    profanityObserver.disconnect();
    profanityObserver = null;
  }

  if (!profanityEnabled && profanityRecapObserver) {
    profanityRecapObserver.disconnect();
    profanityRecapObserver = null;
  }
}

const emoticonToolbarSelector = "#chatBg td#chtput";
const emoticonImageSourceMarker = "MythUp/tarot-plus/refs/heads/";

function getEmoticonToolbar() {
  return document.querySelector(emoticonToolbarSelector);
}

function generateEmoticonsHTML(disabled = {}) {
  let html = "";

  for (let i = 0; i < 65; i++) {
    const id = `Emoticon${i}`;
    if (!disabled[id]) {
      html += `<img onclick="sendEmot(${i});" alt="Émoticône n°${i}" src="https://raw.githubusercontent.com/MythUp/tarot-plus/refs/heads/main/emots/Emoticon${i}.png" class="emotIcon" style="margin: 0 4px;">`;
    }
  }

  return html;
}

function isCustomEmoticonImage(img) {
  return img.src.includes(emoticonImageSourceMarker);
}

function injectEmoticonsScript() {
  if (emoticonsScriptInjected) {
    return;
  }

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("emot.js");
  script.type = "text/javascript";
  script.onload = () => console.log("[EXT] 📦 Script emot.js injecté avec succès !");
  (document.body || document.documentElement).appendChild(script);
  emoticonsScriptInjected = true;
}

function ensureEmoticonsObserver() {
  if (emoticonsObserver || !document.body) {
    return;
  }

  emoticonsObserver = new MutationObserver(() => {
    if (isReplacingEmoticons) {
      return;
    }

    syncEmoticonToolbar();
  });

  emoticonsObserver.observe(document.body, { childList: true, subtree: true });
  console.log("[EXT] 👁️ Observation du DOM activée.");
}

function restoreEmoticonToolbar(td = getEmoticonToolbar()) {
  if (!td || emoticonToolbarSnapshot === null || td.querySelector("input#chatInput")) {
    return false;
  }

  const snapshot = emoticonToolbarSnapshot;
  emoticonToolbarSnapshot = null;

  if (td.innerHTML !== snapshot) {
    isReplacingEmoticons = true;
    td.innerHTML = snapshot;
    isReplacingEmoticons = false;
    console.log("[EXT] 🔁 Émoticônes du site restaurées.");
  }

  return true;
}

function syncEmoticonToolbar() {
  const td = getEmoticonToolbar();
  if (!td) {
    return;
  }

  if (!emoticonsEnabled) {
    restoreEmoticonToolbar(td);
    return;
  }

  if (td.querySelector("input#chatInput")) {
    return;
  }

  const emotes = td.querySelectorAll("img");
  const hasMine = emotes.length > 0 && Array.from(emotes).every(isCustomEmoticonImage);
  if (hasMine) {
    return;
  }

  if (emoticonToolbarSnapshot === null) {
    emoticonToolbarSnapshot = td.innerHTML;
  }

  console.log("[EXT] 🔄 Remplacement des émoticônes du site...");
  isReplacingEmoticons = true;
  if (typeof updateEmoticons === "function") {
    updateEmoticons();
  }
  isReplacingEmoticons = false;
}

function setEmoticonsEnabled(enabled) {
  emoticonsEnabled = Boolean(enabled);
  window.disableEmoticons = !emoticonsEnabled;

  if (emoticonsEnabled) {
    updateEmoticons = () => {
      if (!emoticonsEnabled) {
        return;
      }

      const td = getEmoticonToolbar();
      if (!td || td.querySelector("input#chatInput")) {
        return;
      }

      chrome.storage.local.get(["disabledEmoticons"], (storage) => {
        if (!emoticonsEnabled) {
          return;
        }

        const disabled = storage.disabledEmoticons ?? {};
        const nextHtml = generateEmoticonsHTML(disabled);

        if (emoticonToolbarSnapshot === null && td.innerHTML !== nextHtml) {
          emoticonToolbarSnapshot = td.innerHTML;
        }

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

function dispatchUnicodeBridgeState(enabled) {
  window.dispatchEvent(
    new CustomEvent(unicodeBridgeEventName, {
      detail: { enabled: Boolean(enabled) },
    })
  );
}

function injectUnicodeBridge() {
  if (unicodeBridgeInjected) {
    dispatchUnicodeBridgeState(unicodeDecodingEnabled);
    return;
  }

  const script = document.createElement("script");
  script.id = "tarot-unicode-bridge";
  script.src = chrome.runtime.getURL("unicodeBridge.js");
  script.onload = () => dispatchUnicodeBridgeState(unicodeDecodingEnabled);
  (document.head || document.documentElement).appendChild(script);
  unicodeBridgeInjected = true;
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
      return escapeUnicodeTransportValue(value);
    };
  }

  if (nativeFormDataAppend && nativeFormDataSet) {
    FormData.prototype.append = function(name, value, filename) {
      const nextValue = typeof value === "string"
        ? encodeUnicodeTransportValue(value)
        : value;

      return arguments.length > 2
        ? nativeFormDataAppend.call(this, name, nextValue, filename)
        : nativeFormDataAppend.call(this, name, nextValue);
    };

    FormData.prototype.set = function(name, value, filename) {
      const nextValue = typeof value === "string"
        ? encodeUnicodeTransportValue(value)
        : value;

      return arguments.length > 2
        ? nativeFormDataSet.call(this, name, nextValue, filename)
        : nativeFormDataSet.call(this, name, nextValue);
    };
  }

  if (nativeURLSearchParamsAppend && nativeURLSearchParamsSet) {
    URLSearchParams.prototype.append = function(name, value) {
      const nextValue = encodeUnicodeTransportValue(String(value));

      return nativeURLSearchParamsAppend.call(this, name, nextValue);
    };

    URLSearchParams.prototype.set = function(name, value) {
      const nextValue = encodeUnicodeTransportValue(String(value));

      return nativeURLSearchParamsSet.call(this, name, nextValue);
    };
  }

  unicodeTransportBridgesInstalled = true;
}

function syncUnicodeFormData(event) {
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
  dispatchUnicodeBridgeState(true);

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
  dispatchUnicodeBridgeState(false);

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

let shareForumEnabled = true;
let forumShareButtonScriptLoaded = false;
let forumShareButtonLastURL = location.href;

const setForumShareButtonInitialState = (enabled) => {
  const root = document.documentElement || document.body;
  if (root) {
    root.dataset.forumShareButtonEnabled = enabled ? "true" : "false";
  }
};

const dispatchForumShareButtonState = (enabled) => {
  document.dispatchEvent(new CustomEvent("forum-share-button-state", {
    detail: { enabled },
    bubbles: true,
  }));
};

const injectForumShareButtonScript = () => {
  if (forumShareButtonScriptLoaded) {
    return;
  }

  forumShareButtonScriptLoaded = true;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("buttonForum.js");
  (document.head || document.documentElement).appendChild(script);
};

const setForumShareButtonEnabled = (enabled) => {
  setForumShareButtonInitialState(enabled);

  if (!forumShareButtonScriptLoaded) {
    if (enabled && location.pathname.startsWith("/forum") && location.href.includes("/forum-sujet/")) {
      injectForumShareButtonScript();
    }
    return;
  }

  dispatchForumShareButtonState(enabled);
};

const syncForumShareButton = () => {
  const isForumSection = location.pathname.startsWith("/forum");
  const isForumSujetURL = location.href.includes("/forum-sujet/");
  const shouldShowForumButton = Boolean(shareForumEnabled && isForumSection && isForumSujetURL);

  setForumShareButtonEnabled(shouldShowForumButton);
};

chrome.storage.local.get(
  [
    "enabledExt",
    "shareForum",
    "emoticonsEnabled",
    "unicodeDecodingEnabled",
    "disabledEmoticons",
    "censureEnabled",
    "censureMode",
    "censureScope",
  ],
  (data) => {
    if (!data.enabledExt) return console.log("[EXT] ❌ Extension désactivée.");

    console.log("[EXT] ✅ Extension activée.");

    injectUnicodeBridge();
    ensureProfanityRecapObserver();

    shareForumEnabled = data.shareForum ?? true;

    void loadProfanityTerms().then(() => {
      setProfanityFilterState(
        data.censureEnabled ?? true,
        data.censureMode ?? "mask",
        data.censureScope ?? "insult"
      );

      if (data.unicodeDecodingEnabled ?? true) {
        startUnicodeDecoding();
      }

      chrome.storage.onChanged.addListener((changes, ns) => {
        if (ns !== "local") {
          return;
        }

        if (changes.disabledEmoticons && emoticonsEnabled && typeof updateEmoticons === "function") {
          console.log("[EXT] 🆕 Changement détecté dans la config des émoticônes.");
          updateEmoticons();
        }

        if (changes.emoticonsEnabled) {
          console.log("[EXT] 🧩 Changement détecté pour le mode émoticônes personnalisé.");
          setEmoticonsEnabled(changes.emoticonsEnabled.newValue ?? true);
        }

        if (changes.unicodeDecodingEnabled) {
          if (changes.unicodeDecodingEnabled.newValue) {
            startUnicodeDecoding();
          } else {
            stopUnicodeDecoding();
          }
        }

        if (changes.shareForum) {
          shareForumEnabled = changes.shareForum.newValue ?? true;
          syncForumShareButton();
        }

        if (changes.profanityTermsCustom) {
          void loadProfanityTerms().then(() => {
            profanityNeedsFullReset = true;
            if (profanityEnabled) {
              applyProfanityFilter();
            }
          });
        }

        if (changes.censureEnabled || changes.censureMode || changes.censureScope) {
          setProfanityFilterState(
            changes.censureEnabled ? changes.censureEnabled.newValue ?? true : profanityEnabled,
            changes.censureMode ? changes.censureMode.newValue ?? profanityMode : profanityMode,
            changes.censureScope ? changes.censureScope.newValue ?? profanityScope : profanityScope
          );
        }
      });

      syncForumShareButton();

      setEmoticonsEnabled(data.emoticonsEnabled ?? true);

      setInterval(() => {
        const currentURL = location.href;
        if (currentURL !== forumShareButtonLastURL) {
          forumShareButtonLastURL = currentURL;
          syncForumShareButton();
        }
      }, 1000);

      console.log("[EXT] 🎨 Gestion dynamique des émoticônes initialisée.");
    });

  }
);
