(function () {
  if (window.__tarotUnicodeBridgeInstalled) {
    return;
  }

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
    if (typeof value !== "string" || !value.includes("%u")) {
      return value;
    }

    return value.replace(/%u([0-9a-fA-F]{4,6})/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    );
  }
  function decodeHexadecimalSequences(value) {
    if (typeof value !== "string" || !value.match(/(?:[Uu]\+|0[xX]|\\[xX])/)) {
      return value;
    }

    return value.replace(/(^|[^0-9A-Fa-f])((?:[Uu]\+|0[xX]|\\[xX])([0-9a-fA-F]{2,6}))/g, (match, prefix, _sequence, hex) => {
      const codePoint = Number.parseInt(hex, 16);

      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
        return match;
      }

      return `${prefix}${String.fromCodePoint(codePoint)}`;
    });
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

  function decodeUnicodeTransportValue(value) {
    return decodeUnicodeSequences(decodeHexadecimalSequences(decodeUnicodeEntitySequences(value)));
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

    if (!args.length || !shouldWrapFormData(args[0])) {
      return nativeInstance;
    }

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
    enumerable: nativeTextAreaValueDescriptor.enumerable ?? false,
    get() {
      const currentValue = nativeTextAreaValueDescriptor.get.call(this);
      return unicodeBridgeEnabled ? encodeUnicodeSequences(currentValue) : currentValue;
    },
    set(value) {
      const nextValue = unicodeBridgeEnabled ? decodeUnicodeTransportValue(value) : value;
      nativeTextAreaValueDescriptor.set.call(this, nextValue);
    },
  });

  Object.defineProperty(HTMLInputElement.prototype, "value", {
    configurable: true,
    enumerable: nativeInputValueDescriptor.enumerable ?? false,
    get() {
      const currentValue = nativeInputValueDescriptor.get.call(this);
      return unicodeBridgeEnabled && isUnicodeTextInput(this) ? encodeUnicodeSequences(currentValue) : currentValue;
    },
    set(value) {
      const nextValue = unicodeBridgeEnabled && isUnicodeTextInput(this) ? decodeUnicodeTransportValue(value) : value;
      nativeInputValueDescriptor.set.call(this, nextValue);
    },
  });

  NativeFormData.prototype.append = function (name, value, filename) {
    const nextValue = typeof value === "string"
      ? encodeUnicodeTransportValue(value)
      : value;

    return arguments.length > 2
      ? nativeFormDataAppend.call(this, name, nextValue, filename)
      : nativeFormDataAppend.call(this, name, nextValue);
  };

  NativeFormData.prototype.set = function (name, value, filename) {
    const nextValue = typeof value === "string"
      ? encodeUnicodeTransportValue(value)
      : value;

    return arguments.length > 2
      ? nativeFormDataSet.call(this, name, nextValue, filename)
      : nativeFormDataSet.call(this, name, nextValue);
  };

  window.escape = function (value) {
    return escapeUnicodeTransportValue(value);
  };

  window.URLSearchParams.prototype.append = function (name, value) {
    const nextValue = encodeUnicodeTransportValue(String(value));

    return nativeURLSearchParamsAppend.call(this, name, nextValue);
  };

  window.URLSearchParams.prototype.set = function (name, value) {
    const nextValue = encodeUnicodeTransportValue(String(value));

    return nativeURLSearchParamsSet.call(this, name, nextValue);
  };

  function setEnabled(enabled) {
    unicodeBridgeEnabled = Boolean(enabled);
  }

  window.addEventListener("tarot-unicode-toggle", (event) => {
    if (!event || !event.detail || typeof event.detail.enabled === "undefined") {
      return;
    }

    setEnabled(event.detail.enabled);
  });

  setEnabled(false);
})();
