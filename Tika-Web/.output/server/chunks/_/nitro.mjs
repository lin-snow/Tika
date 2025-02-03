import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http from 'node:http';
import https from 'node:https';
import { promises, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';
import { createConsola as createConsola$1 } from 'consola/core';
import { dirname as dirname$1, resolve as resolve$1, join } from 'node:path';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  const _value = value.trim();
  if (
    // eslint-disable-next-line unicorn/prefer-at
    value[0] === '"' && value.endsWith('"') && !value.includes("\\")
  ) {
    return _value.slice(1, -1);
  }
  if (_value.length <= 9) {
    const _lval = _value.toLowerCase();
    if (_lval === "true") {
      return true;
    }
    if (_lval === "false") {
      return false;
    }
    if (_lval === "undefined") {
      return undefined;
    }
    if (_lval === "null") {
      return null;
    }
    if (_lval === "nan") {
      return Number.NaN;
    }
    if (_lval === "infinity") {
      return Number.POSITIVE_INFINITY;
    }
    if (_lval === "-infinity") {
      return Number.NEGATIVE_INFINITY;
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = {};
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === undefined) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map((_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== undefined).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const defaults = Object.freeze({
  ignoreUnknown: false,
  respectType: false,
  respectFunctionNames: false,
  respectFunctionProperties: false,
  unorderedObjects: true,
  unorderedArrays: false,
  unorderedSets: false,
  excludeKeys: undefined,
  excludeValues: undefined,
  replacer: undefined
});
function objectHash(object, options) {
  if (options) {
    options = { ...defaults, ...options };
  } else {
    options = defaults;
  }
  const hasher = createHasher(options);
  hasher.dispatch(object);
  return hasher.toString();
}
const defaultPrototypesKeys = Object.freeze([
  "prototype",
  "__proto__",
  "constructor"
]);
function createHasher(options) {
  let buff = "";
  let context = /* @__PURE__ */ new Map();
  const write = (str) => {
    buff += str;
  };
  return {
    toString() {
      return buff;
    },
    getContext() {
      return context;
    },
    dispatch(value) {
      if (options.replacer) {
        value = options.replacer(value);
      }
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    },
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      if (objectLength < 10) {
        objType = "unknown:[" + objString + "]";
      } else {
        objType = objString.slice(8, objectLength - 1);
      }
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = context.get(object)) === undefined) {
        context.set(object, context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        write("buffer:");
        return write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else if (!options.ignoreUnknown) {
          this.unkown(object, objType);
        }
      } else {
        let keys = Object.keys(object);
        if (options.unorderedObjects) {
          keys = keys.sort();
        }
        let extraKeys = [];
        if (options.respectType !== false && !isNativeFunction(object)) {
          extraKeys = defaultPrototypesKeys;
        }
        if (options.excludeKeys) {
          keys = keys.filter((key) => {
            return !options.excludeKeys(key);
          });
          extraKeys = extraKeys.filter((key) => {
            return !options.excludeKeys(key);
          });
        }
        write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          write(":");
          if (!options.excludeValues) {
            this.dispatch(object[key]);
          }
          write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    },
    array(arr, unordered) {
      unordered = unordered === undefined ? options.unorderedArrays !== false : unordered;
      write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = createHasher(options);
        hasher.dispatch(entry);
        for (const [key, value] of hasher.getContext()) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    },
    date(date) {
      return write("date:" + date.toJSON());
    },
    symbol(sym) {
      return write("symbol:" + sym.toString());
    },
    unkown(value, type) {
      write(type);
      if (!value) {
        return;
      }
      write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          Array.from(value.entries()),
          true
          /* ordered */
        );
      }
    },
    error(err) {
      return write("error:" + err.toString());
    },
    boolean(bool) {
      return write("bool:" + bool);
    },
    string(string) {
      write("string:" + string.length + ":");
      write(string);
    },
    function(fn) {
      write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
      if (options.respectFunctionNames !== false) {
        this.dispatch("function-name:" + String(fn.name));
      }
      if (options.respectFunctionProperties) {
        this.object(fn);
      }
    },
    number(number) {
      return write("number:" + number);
    },
    xml(xml) {
      return write("xml:" + xml.toString());
    },
    null() {
      return write("Null");
    },
    undefined() {
      return write("Undefined");
    },
    regexp(regex) {
      return write("regex:" + regex.toString());
    },
    uint8array(arr) {
      write("uint8array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint8clampedarray(arr) {
      write("uint8clampedarray:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int8array(arr) {
      write("int8array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint16array(arr) {
      write("uint16array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int16array(arr) {
      write("int16array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint32array(arr) {
      write("uint32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int32array(arr) {
      write("int32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    float32array(arr) {
      write("float32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    float64array(arr) {
      write("float64array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    arraybuffer(arr) {
      write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    },
    url(url) {
      return write("url:" + url.toString());
    },
    map(map) {
      write("map:");
      const arr = [...map];
      return this.array(arr, options.unorderedSets !== false);
    },
    set(set) {
      write("set:");
      const arr = [...set];
      return this.array(arr, options.unorderedSets !== false);
    },
    file(file) {
      write("file:");
      return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
    },
    blob() {
      if (options.ignoreUnknown) {
        return write("[blob]");
      }
      throw new Error(
        'Hashing Blob objects is currently not supported\nUse "options.replacer" or "options.ignoreUnknown"\n'
      );
    },
    domwindow() {
      return write("domwindow");
    },
    bigint(number) {
      return write("bigint:" + number.toString());
    },
    /* Node.js standard native objects */
    process() {
      return write("process");
    },
    timer() {
      return write("timer");
    },
    pipe() {
      return write("pipe");
    },
    tcp() {
      return write("tcp");
    },
    udp() {
      return write("udp");
    },
    tty() {
      return write("tty");
    },
    statwatcher() {
      return write("statwatcher");
    },
    securecontext() {
      return write("securecontext");
    },
    connection() {
      return write("connection");
    },
    zlib() {
      return write("zlib");
    },
    context() {
      return write("context");
    },
    nodescript() {
      return write("nodescript");
    },
    httpparser() {
      return write("httpparser");
    },
    dataview() {
      return write("dataview");
    },
    signal() {
      return write("signal");
    },
    fsevent() {
      return write("fsevent");
    },
    tlswrap() {
      return write("tlswrap");
    }
  };
}
const nativeFunc = "[native code] }";
const nativeFuncLength = nativeFunc.length;
function isNativeFunction(f) {
  if (typeof f !== "function") {
    return false;
  }
  return Function.prototype.toString.call(f).slice(-nativeFuncLength) === nativeFunc;
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class WordArray {
  constructor(words, sigBytes) {
    __publicField$1(this, "words");
    __publicField$1(this, "sigBytes");
    words = this.words = words || [];
    this.sigBytes = sigBytes === undefined ? words.length * 4 : sigBytes;
  }
  toString(encoder) {
    return (encoder || Hex).stringify(this);
  }
  concat(wordArray) {
    this.clamp();
    if (this.sigBytes % 4) {
      for (let i = 0; i < wordArray.sigBytes; i++) {
        const thatByte = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
        this.words[this.sigBytes + i >>> 2] |= thatByte << 24 - (this.sigBytes + i) % 4 * 8;
      }
    } else {
      for (let j = 0; j < wordArray.sigBytes; j += 4) {
        this.words[this.sigBytes + j >>> 2] = wordArray.words[j >>> 2];
      }
    }
    this.sigBytes += wordArray.sigBytes;
    return this;
  }
  clamp() {
    this.words[this.sigBytes >>> 2] &= 4294967295 << 32 - this.sigBytes % 4 * 8;
    this.words.length = Math.ceil(this.sigBytes / 4);
  }
  clone() {
    return new WordArray([...this.words]);
  }
}
const Hex = {
  stringify(wordArray) {
    const hexChars = [];
    for (let i = 0; i < wordArray.sigBytes; i++) {
      const bite = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
      hexChars.push((bite >>> 4).toString(16), (bite & 15).toString(16));
    }
    return hexChars.join("");
  }
};
const Base64 = {
  stringify(wordArray) {
    const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const base64Chars = [];
    for (let i = 0; i < wordArray.sigBytes; i += 3) {
      const byte1 = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
      const byte2 = wordArray.words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
      const byte3 = wordArray.words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
      const triplet = byte1 << 16 | byte2 << 8 | byte3;
      for (let j = 0; j < 4 && i * 8 + j * 6 < wordArray.sigBytes * 8; j++) {
        base64Chars.push(keyStr.charAt(triplet >>> 6 * (3 - j) & 63));
      }
    }
    return base64Chars.join("");
  }
};
const Latin1 = {
  parse(latin1Str) {
    const latin1StrLength = latin1Str.length;
    const words = [];
    for (let i = 0; i < latin1StrLength; i++) {
      words[i >>> 2] |= (latin1Str.charCodeAt(i) & 255) << 24 - i % 4 * 8;
    }
    return new WordArray(words, latin1StrLength);
  }
};
const Utf8 = {
  parse(utf8Str) {
    return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
  }
};
class BufferedBlockAlgorithm {
  constructor() {
    __publicField$1(this, "_data", new WordArray());
    __publicField$1(this, "_nDataBytes", 0);
    __publicField$1(this, "_minBufferSize", 0);
    __publicField$1(this, "blockSize", 512 / 32);
  }
  reset() {
    this._data = new WordArray();
    this._nDataBytes = 0;
  }
  _append(data) {
    if (typeof data === "string") {
      data = Utf8.parse(data);
    }
    this._data.concat(data);
    this._nDataBytes += data.sigBytes;
  }
  _doProcessBlock(_dataWords, _offset) {
  }
  _process(doFlush) {
    let processedWords;
    let nBlocksReady = this._data.sigBytes / (this.blockSize * 4);
    if (doFlush) {
      nBlocksReady = Math.ceil(nBlocksReady);
    } else {
      nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    }
    const nWordsReady = nBlocksReady * this.blockSize;
    const nBytesReady = Math.min(nWordsReady * 4, this._data.sigBytes);
    if (nWordsReady) {
      for (let offset = 0; offset < nWordsReady; offset += this.blockSize) {
        this._doProcessBlock(this._data.words, offset);
      }
      processedWords = this._data.words.splice(0, nWordsReady);
      this._data.sigBytes -= nBytesReady;
    }
    return new WordArray(processedWords, nBytesReady);
  }
}
class Hasher extends BufferedBlockAlgorithm {
  update(messageUpdate) {
    this._append(messageUpdate);
    this._process();
    return this;
  }
  finalize(messageUpdate) {
    if (messageUpdate) {
      this._append(messageUpdate);
    }
  }
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, key + "" , value);
  return value;
};
const H = [
  1779033703,
  -1150833019,
  1013904242,
  -1521486534,
  1359893119,
  -1694144372,
  528734635,
  1541459225
];
const K = [
  1116352408,
  1899447441,
  -1245643825,
  -373957723,
  961987163,
  1508970993,
  -1841331548,
  -1424204075,
  -670586216,
  310598401,
  607225278,
  1426881987,
  1925078388,
  -2132889090,
  -1680079193,
  -1046744716,
  -459576895,
  -272742522,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  -1740746414,
  -1473132947,
  -1341970488,
  -1084653625,
  -958395405,
  -710438585,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  -2117940946,
  -1838011259,
  -1564481375,
  -1474664885,
  -1035236496,
  -949202525,
  -778901479,
  -694614492,
  -200395387,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  -2067236844,
  -1933114872,
  -1866530822,
  -1538233109,
  -1090935817,
  -965641998
];
const W = [];
class SHA256 extends Hasher {
  constructor() {
    super(...arguments);
    __publicField(this, "_hash", new WordArray([...H]));
  }
  /**
   * Resets the internal state of the hash object to initial values.
   */
  reset() {
    super.reset();
    this._hash = new WordArray([...H]);
  }
  _doProcessBlock(M, offset) {
    const H2 = this._hash.words;
    let a = H2[0];
    let b = H2[1];
    let c = H2[2];
    let d = H2[3];
    let e = H2[4];
    let f = H2[5];
    let g = H2[6];
    let h = H2[7];
    for (let i = 0; i < 64; i++) {
      if (i < 16) {
        W[i] = M[offset + i] | 0;
      } else {
        const gamma0x = W[i - 15];
        const gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
        const gamma1x = W[i - 2];
        const gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
        W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
      }
      const ch = e & f ^ ~e & g;
      const maj = a & b ^ a & c ^ b & c;
      const sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
      const sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
      const t1 = h + sigma1 + ch + K[i] + W[i];
      const t2 = sigma0 + maj;
      h = g;
      g = f;
      f = e;
      e = d + t1 | 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    H2[0] = H2[0] + a | 0;
    H2[1] = H2[1] + b | 0;
    H2[2] = H2[2] + c | 0;
    H2[3] = H2[3] + d | 0;
    H2[4] = H2[4] + e | 0;
    H2[5] = H2[5] + f | 0;
    H2[6] = H2[6] + g | 0;
    H2[7] = H2[7] + h | 0;
  }
  /**
   * Finishes the hash calculation and returns the hash as a WordArray.
   *
   * @param {string} messageUpdate - Additional message content to include in the hash.
   * @returns {WordArray} The finalised hash as a WordArray.
   */
  finalize(messageUpdate) {
    super.finalize(messageUpdate);
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = this._data.sigBytes * 8;
    this._data.words[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    this._data.words[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(
      nBitsTotal / 4294967296
    );
    this._data.words[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
    this._data.sigBytes = this._data.words.length * 4;
    this._process();
    return this._hash;
  }
}
function sha256base64(message) {
  return new SHA256().finalize(message).toString(Base64);
}

function hash(object, options = {}) {
  const hashed = typeof object === "string" ? object : objectHash(object, options);
  return sha256base64(hashed).slice(0, 10);
}

function isEqual(object1, object2, hashOptions = {}) {
  if (object1 === object2) {
    return true;
  }
  if (objectHash(object1, hashOptions) === objectHash(object2, hashOptions)) {
    return true;
  }
  return false;
}

function diff(obj1, obj2, opts = {}) {
  const h1 = _toHashedObject(obj1, opts);
  const h2 = _toHashedObject(obj2, opts);
  return _diff(h1, h2, opts);
}
function _diff(h1, h2, opts = {}) {
  const diffs = [];
  const allProps = /* @__PURE__ */ new Set([
    ...Object.keys(h1.props || {}),
    ...Object.keys(h2.props || {})
  ]);
  if (h1.props && h2.props) {
    for (const prop of allProps) {
      const p1 = h1.props[prop];
      const p2 = h2.props[prop];
      if (p1 && p2) {
        diffs.push(..._diff(h1.props?.[prop], h2.props?.[prop], opts));
      } else if (p1 || p2) {
        diffs.push(
          new DiffEntry((p2 || p1).key, p1 ? "removed" : "added", p2, p1)
        );
      }
    }
  }
  if (allProps.size === 0 && h1.hash !== h2.hash) {
    diffs.push(new DiffEntry((h2 || h1).key, "changed", h2, h1));
  }
  return diffs;
}
function _toHashedObject(obj, opts, key = "") {
  if (obj && typeof obj !== "object") {
    return new DiffHashedObject(key, obj, objectHash(obj, opts));
  }
  const props = {};
  const hashes = [];
  for (const _key in obj) {
    props[_key] = _toHashedObject(
      obj[_key],
      opts,
      key ? `${key}.${_key}` : _key
    );
    hashes.push(props[_key].hash);
  }
  return new DiffHashedObject(key, obj, `{${hashes.join(":")}}`, props);
}
class DiffEntry {
  constructor(key, type, newValue, oldValue) {
    this.key = key;
    this.type = type;
    this.newValue = newValue;
    this.oldValue = oldValue;
  }
  toString() {
    return this.toJSON();
  }
  toJSON() {
    switch (this.type) {
      case "added": {
        return `Added   \`${this.key}\``;
      }
      case "removed": {
        return `Removed \`${this.key}\``;
      }
      case "changed": {
        return `Changed \`${this.key}\` from \`${this.oldValue?.toString() || "-"}\` to \`${this.newValue.toString()}\``;
      }
    }
  }
}
class DiffHashedObject {
  constructor(key, value, hash, props) {
    this.key = key;
    this.value = value;
    this.hash = hash;
    this.props = props;
  }
  toString() {
    if (this.props) {
      return `{${Object.keys(this.props).join(",")}}`;
    } else {
      return JSON.stringify(this.value);
    }
  }
  toJSON() {
    const k = this.key || ".";
    if (this.props) {
      return `${k}({${Object.keys(this.props).join(",")}})`;
    }
    return `${k}(${this.value})`;
  }
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === undefined) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : undefined
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === undefined) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== undefined && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function rawHeaders(headers) {
  const rawHeaders2 = [];
  for (const key in headers) {
    if (Array.isArray(headers[key])) {
      for (const h of headers[key]) {
        rawHeaders2.push(key, h);
      }
    } else {
      rawHeaders2.push(key, headers[key]);
    }
  }
  return rawHeaders2;
}
function mergeFns(...functions) {
  return function(...args) {
    for (const fn of functions) {
      fn(...args);
    }
  };
}
function createNotImplementedError(name) {
  throw new Error(`[unenv] ${name} is not implemented yet!`);
}

let defaultMaxListeners = 10;
let EventEmitter$1 = class EventEmitter {
  __unenv__ = true;
  _events = /* @__PURE__ */ Object.create(null);
  _maxListeners;
  static get defaultMaxListeners() {
    return defaultMaxListeners;
  }
  static set defaultMaxListeners(arg) {
    if (typeof arg !== "number" || arg < 0 || Number.isNaN(arg)) {
      throw new RangeError(
        'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + "."
      );
    }
    defaultMaxListeners = arg;
  }
  setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || Number.isNaN(n)) {
      throw new RangeError(
        'The value of "n" is out of range. It must be a non-negative number. Received ' + n + "."
      );
    }
    this._maxListeners = n;
    return this;
  }
  getMaxListeners() {
    return _getMaxListeners(this);
  }
  emit(type, ...args) {
    if (!this._events[type] || this._events[type].length === 0) {
      return false;
    }
    if (type === "error") {
      let er;
      if (args.length > 0) {
        er = args[0];
      }
      if (er instanceof Error) {
        throw er;
      }
      const err = new Error(
        "Unhandled error." + (er ? " (" + er.message + ")" : "")
      );
      err.context = er;
      throw err;
    }
    for (const _listener of this._events[type]) {
      (_listener.listener || _listener).apply(this, args);
    }
    return true;
  }
  addListener(type, listener) {
    return _addListener(this, type, listener, false);
  }
  on(type, listener) {
    return _addListener(this, type, listener, false);
  }
  prependListener(type, listener) {
    return _addListener(this, type, listener, true);
  }
  once(type, listener) {
    return this.on(type, _wrapOnce(this, type, listener));
  }
  prependOnceListener(type, listener) {
    return this.prependListener(type, _wrapOnce(this, type, listener));
  }
  removeListener(type, listener) {
    return _removeListener(this, type, listener);
  }
  off(type, listener) {
    return this.removeListener(type, listener);
  }
  removeAllListeners(type) {
    return _removeAllListeners(this, type);
  }
  listeners(type) {
    return _listeners(this, type, true);
  }
  rawListeners(type) {
    return _listeners(this, type, false);
  }
  listenerCount(type) {
    return this.rawListeners(type).length;
  }
  eventNames() {
    return Object.keys(this._events);
  }
};
function _addListener(target, type, listener, prepend) {
  _checkListener(listener);
  if (target._events.newListener !== undefined) {
    target.emit("newListener", type, listener.listener || listener);
  }
  if (!target._events[type]) {
    target._events[type] = [];
  }
  if (prepend) {
    target._events[type].unshift(listener);
  } else {
    target._events[type].push(listener);
  }
  const maxListeners = _getMaxListeners(target);
  if (maxListeners > 0 && target._events[type].length > maxListeners && !target._events[type].warned) {
    target._events[type].warned = true;
    const warning = new Error(
      `[unenv] Possible EventEmitter memory leak detected. ${target._events[type].length} ${type} listeners added. Use emitter.setMaxListeners() to increase limit`
    );
    warning.name = "MaxListenersExceededWarning";
    warning.emitter = target;
    warning.type = type;
    warning.count = target._events[type]?.length;
    console.warn(warning);
  }
  return target;
}
function _removeListener(target, type, listener) {
  _checkListener(listener);
  if (!target._events[type] || target._events[type].length === 0) {
    return target;
  }
  const lenBeforeFilter = target._events[type].length;
  target._events[type] = target._events[type].filter((fn) => fn !== listener);
  if (lenBeforeFilter === target._events[type].length) {
    return target;
  }
  if (target._events.removeListener) {
    target.emit("removeListener", type, listener.listener || listener);
  }
  if (target._events[type].length === 0) {
    delete target._events[type];
  }
  return target;
}
function _removeAllListeners(target, type) {
  if (!target._events[type] || target._events[type].length === 0) {
    return target;
  }
  if (target._events.removeListener) {
    for (const _listener of target._events[type]) {
      target.emit("removeListener", type, _listener.listener || _listener);
    }
  }
  delete target._events[type];
  return target;
}
function _wrapOnce(target, type, listener) {
  let fired = false;
  const wrapper = (...args) => {
    if (fired) {
      return;
    }
    target.removeListener(type, wrapper);
    fired = true;
    return args.length === 0 ? listener.call(target) : listener.apply(target, args);
  };
  wrapper.listener = listener;
  return wrapper;
}
function _getMaxListeners(target) {
  return target._maxListeners ?? EventEmitter$1.defaultMaxListeners;
}
function _listeners(target, type, unwrap) {
  let listeners = target._events[type];
  if (typeof listeners === "function") {
    listeners = [listeners];
  }
  return unwrap ? listeners.map((l) => l.listener || l) : listeners;
}
function _checkListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError(
      'The "listener" argument must be of type Function. Received type ' + typeof listener
    );
  }
}

const EventEmitter = globalThis.EventEmitter || EventEmitter$1;

class _Readable extends EventEmitter {
  __unenv__ = true;
  readableEncoding = null;
  readableEnded = true;
  readableFlowing = false;
  readableHighWaterMark = 0;
  readableLength = 0;
  readableObjectMode = false;
  readableAborted = false;
  readableDidRead = false;
  closed = false;
  errored = null;
  readable = false;
  destroyed = false;
  static from(_iterable, options) {
    return new _Readable(options);
  }
  constructor(_opts) {
    super();
  }
  _read(_size) {
  }
  read(_size) {
  }
  setEncoding(_encoding) {
    return this;
  }
  pause() {
    return this;
  }
  resume() {
    return this;
  }
  isPaused() {
    return true;
  }
  unpipe(_destination) {
    return this;
  }
  unshift(_chunk, _encoding) {
  }
  wrap(_oldStream) {
    return this;
  }
  push(_chunk, _encoding) {
    return false;
  }
  _destroy(_error, _callback) {
    this.removeAllListeners();
  }
  destroy(error) {
    this.destroyed = true;
    this._destroy(error);
    return this;
  }
  pipe(_destenition, _options) {
    return {};
  }
  compose(stream, options) {
    throw new Error("[unenv] Method not implemented.");
  }
  [Symbol.asyncDispose]() {
    this.destroy();
    return Promise.resolve();
  }
  // eslint-disable-next-line require-yield
  async *[Symbol.asyncIterator]() {
    throw createNotImplementedError("Readable.asyncIterator");
  }
  iterator(options) {
    throw createNotImplementedError("Readable.iterator");
  }
  map(fn, options) {
    throw createNotImplementedError("Readable.map");
  }
  filter(fn, options) {
    throw createNotImplementedError("Readable.filter");
  }
  forEach(fn, options) {
    throw createNotImplementedError("Readable.forEach");
  }
  reduce(fn, initialValue, options) {
    throw createNotImplementedError("Readable.reduce");
  }
  find(fn, options) {
    throw createNotImplementedError("Readable.find");
  }
  findIndex(fn, options) {
    throw createNotImplementedError("Readable.findIndex");
  }
  some(fn, options) {
    throw createNotImplementedError("Readable.some");
  }
  toArray(options) {
    throw createNotImplementedError("Readable.toArray");
  }
  every(fn, options) {
    throw createNotImplementedError("Readable.every");
  }
  flatMap(fn, options) {
    throw createNotImplementedError("Readable.flatMap");
  }
  drop(limit, options) {
    throw createNotImplementedError("Readable.drop");
  }
  take(limit, options) {
    throw createNotImplementedError("Readable.take");
  }
  asIndexedPairs(options) {
    throw createNotImplementedError("Readable.asIndexedPairs");
  }
}
const Readable = globalThis.Readable || _Readable;

class _Writable extends EventEmitter {
  __unenv__ = true;
  writable = true;
  writableEnded = false;
  writableFinished = false;
  writableHighWaterMark = 0;
  writableLength = 0;
  writableObjectMode = false;
  writableCorked = 0;
  closed = false;
  errored = null;
  writableNeedDrain = false;
  destroyed = false;
  _data;
  _encoding = "utf-8";
  constructor(_opts) {
    super();
  }
  pipe(_destenition, _options) {
    return {};
  }
  _write(chunk, encoding, callback) {
    if (this.writableEnded) {
      if (callback) {
        callback();
      }
      return;
    }
    if (this._data === undefined) {
      this._data = chunk;
    } else {
      const a = typeof this._data === "string" ? Buffer.from(this._data, this._encoding || encoding || "utf8") : this._data;
      const b = typeof chunk === "string" ? Buffer.from(chunk, encoding || this._encoding || "utf8") : chunk;
      this._data = Buffer.concat([a, b]);
    }
    this._encoding = encoding;
    if (callback) {
      callback();
    }
  }
  _writev(_chunks, _callback) {
  }
  _destroy(_error, _callback) {
  }
  _final(_callback) {
  }
  write(chunk, arg2, arg3) {
    const encoding = typeof arg2 === "string" ? this._encoding : "utf-8";
    const cb = typeof arg2 === "function" ? arg2 : typeof arg3 === "function" ? arg3 : undefined;
    this._write(chunk, encoding, cb);
    return true;
  }
  setDefaultEncoding(_encoding) {
    return this;
  }
  end(arg1, arg2, arg3) {
    const callback = typeof arg1 === "function" ? arg1 : typeof arg2 === "function" ? arg2 : typeof arg3 === "function" ? arg3 : undefined;
    if (this.writableEnded) {
      if (callback) {
        callback();
      }
      return this;
    }
    const data = arg1 === callback ? undefined : arg1;
    if (data) {
      const encoding = arg2 === callback ? undefined : arg2;
      this.write(data, encoding, callback);
    }
    this.writableEnded = true;
    this.writableFinished = true;
    this.emit("close");
    this.emit("finish");
    return this;
  }
  cork() {
  }
  uncork() {
  }
  destroy(_error) {
    this.destroyed = true;
    delete this._data;
    this.removeAllListeners();
    return this;
  }
  compose(stream, options) {
    throw new Error("[h3] Method not implemented.");
  }
}
const Writable = globalThis.Writable || _Writable;

const __Duplex = class {
  allowHalfOpen = true;
  _destroy;
  constructor(readable = new Readable(), writable = new Writable()) {
    Object.assign(this, readable);
    Object.assign(this, writable);
    this._destroy = mergeFns(readable._destroy, writable._destroy);
  }
};
function getDuplex() {
  Object.assign(__Duplex.prototype, Readable.prototype);
  Object.assign(__Duplex.prototype, Writable.prototype);
  return __Duplex;
}
const _Duplex = /* @__PURE__ */ getDuplex();
const Duplex = globalThis.Duplex || _Duplex;

class Socket extends Duplex {
  __unenv__ = true;
  bufferSize = 0;
  bytesRead = 0;
  bytesWritten = 0;
  connecting = false;
  destroyed = false;
  pending = false;
  localAddress = "";
  localPort = 0;
  remoteAddress = "";
  remoteFamily = "";
  remotePort = 0;
  autoSelectFamilyAttemptedAddresses = [];
  readyState = "readOnly";
  constructor(_options) {
    super();
  }
  write(_buffer, _arg1, _arg2) {
    return false;
  }
  connect(_arg1, _arg2, _arg3) {
    return this;
  }
  end(_arg1, _arg2, _arg3) {
    return this;
  }
  setEncoding(_encoding) {
    return this;
  }
  pause() {
    return this;
  }
  resume() {
    return this;
  }
  setTimeout(_timeout, _callback) {
    return this;
  }
  setNoDelay(_noDelay) {
    return this;
  }
  setKeepAlive(_enable, _initialDelay) {
    return this;
  }
  address() {
    return {};
  }
  unref() {
    return this;
  }
  ref() {
    return this;
  }
  destroySoon() {
    this.destroy();
  }
  resetAndDestroy() {
    const err = new Error("ERR_SOCKET_CLOSED");
    err.code = "ERR_SOCKET_CLOSED";
    this.destroy(err);
    return this;
  }
}

class IncomingMessage extends Readable {
  __unenv__ = {};
  aborted = false;
  httpVersion = "1.1";
  httpVersionMajor = 1;
  httpVersionMinor = 1;
  complete = true;
  connection;
  socket;
  headers = {};
  trailers = {};
  method = "GET";
  url = "/";
  statusCode = 200;
  statusMessage = "";
  closed = false;
  errored = null;
  readable = false;
  constructor(socket) {
    super();
    this.socket = this.connection = socket || new Socket();
  }
  get rawHeaders() {
    return rawHeaders(this.headers);
  }
  get rawTrailers() {
    return [];
  }
  setTimeout(_msecs, _callback) {
    return this;
  }
  get headersDistinct() {
    return _distinct(this.headers);
  }
  get trailersDistinct() {
    return _distinct(this.trailers);
  }
}
function _distinct(obj) {
  const d = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key) {
      d[key] = (Array.isArray(value) ? value : [value]).filter(
        Boolean
      );
    }
  }
  return d;
}

class ServerResponse extends Writable {
  __unenv__ = true;
  statusCode = 200;
  statusMessage = "";
  upgrading = false;
  chunkedEncoding = false;
  shouldKeepAlive = false;
  useChunkedEncodingByDefault = false;
  sendDate = false;
  finished = false;
  headersSent = false;
  strictContentLength = false;
  connection = null;
  socket = null;
  req;
  _headers = {};
  constructor(req) {
    super();
    this.req = req;
  }
  assignSocket(socket) {
    socket._httpMessage = this;
    this.socket = socket;
    this.connection = socket;
    this.emit("socket", socket);
    this._flush();
  }
  _flush() {
    this.flushHeaders();
  }
  detachSocket(_socket) {
  }
  writeContinue(_callback) {
  }
  writeHead(statusCode, arg1, arg2) {
    if (statusCode) {
      this.statusCode = statusCode;
    }
    if (typeof arg1 === "string") {
      this.statusMessage = arg1;
      arg1 = undefined;
    }
    const headers = arg2 || arg1;
    if (headers) {
      if (Array.isArray(headers)) ; else {
        for (const key in headers) {
          this.setHeader(key, headers[key]);
        }
      }
    }
    this.headersSent = true;
    return this;
  }
  writeProcessing() {
  }
  setTimeout(_msecs, _callback) {
    return this;
  }
  appendHeader(name, value) {
    name = name.toLowerCase();
    const current = this._headers[name];
    const all = [
      ...Array.isArray(current) ? current : [current],
      ...Array.isArray(value) ? value : [value]
    ].filter(Boolean);
    this._headers[name] = all.length > 1 ? all : all[0];
    return this;
  }
  setHeader(name, value) {
    this._headers[name.toLowerCase()] = value;
    return this;
  }
  getHeader(name) {
    return this._headers[name.toLowerCase()];
  }
  getHeaders() {
    return this._headers;
  }
  getHeaderNames() {
    return Object.keys(this._headers);
  }
  hasHeader(name) {
    return name.toLowerCase() in this._headers;
  }
  removeHeader(name) {
    delete this._headers[name.toLowerCase()];
  }
  addTrailers(_headers) {
  }
  flushHeaders() {
  }
  writeEarlyHints(_headers, cb) {
    if (typeof cb === "function") {
      cb();
    }
  }
}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== undefined) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== undefined) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== undefined) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, undefined, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const xForwardedHost = event.node.req.headers["x-forwarded-host"];
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !String(event.node.req.headers["transfer-encoding"] ?? "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked")) {
    return Promise.resolve(undefined);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== undefined) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= opts.modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => undefined);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== undefined) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : undefined;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  if (!isEventHandler(input)) {
    console.warn(
      "[h3] Implicit event handler conversion is deprecated. Use `eventHandler()` or `fromNodeMiddleware()` to define event handlers.",
      _route && _route !== "/" ? `
     Route: ${_route}` : "",
      `
     Handler: ${input}`
    );
  }
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : undefined;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _reqPath = event._path || event.node.req.url || "/";
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _layerPath;
      const val = await layer.handler(event);
      const _body = val === undefined ? undefined : await val;
      if (_body !== undefined) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, undefined);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, undefined);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, undefined)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, undefined, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, undefined, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler, undefined, path);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === undefined && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = undefined;
    this._after = undefined;
    this._deprecatedMessages = undefined;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = undefined;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = undefined;
      _function = undefined;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : undefined;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== undefined) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== undefined) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : undefined
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === undefined) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses$1 = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch$1(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: undefined,
      error: undefined
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        context.options.body = typeof context.options.body === "string" ? context.options.body : JSON.stringify(context.options.body);
        context.options.headers = new Headers(context.options.headers || {});
        if (!context.options.headers.has("content-type")) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses$1.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch$1({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch$1({ fetch, Headers: Headers$1, AbortController });
const $fetch$1 = ofetch;

const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createCall(handle) {
  return function callHandle(context) {
    const req = new IncomingMessage();
    const res = new ServerResponse(req);
    req.url = context.url || "/";
    req.method = context.method || "GET";
    req.headers = {};
    if (context.headers) {
      const headerEntries = typeof context.headers.entries === "function" ? context.headers.entries() : Object.entries(context.headers);
      for (const [name, value] of headerEntries) {
        if (!value) {
          continue;
        }
        req.headers[name.toLowerCase()] = value;
      }
    }
    req.headers.host = req.headers.host || context.host || "localhost";
    req.connection.encrypted = // @ts-ignore
    req.connection.encrypted || context.protocol === "https";
    req.body = context.body || null;
    req.__unenv__ = context.context;
    return handle(req, res).then(() => {
      let body = res._data;
      if (nullBodyResponses.has(res.statusCode) || req.method.toUpperCase() === "HEAD") {
        body = null;
        delete res._headers["content-length"];
      }
      const r = {
        body,
        headers: res._headers,
        status: res.statusCode,
        statusText: res.statusMessage
      };
      req.destroy();
      res.destroy();
      return r;
    });
  };
}

function createFetch(call, _fetch = global.fetch) {
  return async function ufetch(input, init) {
    const url = input.toString();
    if (!url.startsWith("/")) {
      return _fetch(url, init);
    }
    try {
      const r = await call({ url, ...init });
      return new Response(r.body, {
        status: r.status,
        statusText: r.statusText,
        headers: Object.fromEntries(
          Object.entries(r.headers).map(([name, value]) => [
            name,
            Array.isArray(value) ? value.join(",") : String(value) || ""
          ])
        )
      });
    } catch (error) {
      return new Response(error.toString(), {
        status: Number.parseInt(error.statusCode || error.code) || 500,
        statusText: error.statusText
      });
    }
  };
}

function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}
function isJsonRequest(event) {
  if (hasReqHeader(event, "accept", "text/html")) {
    return false;
  }
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function normalizeError(error, isDev) {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "/";
  const stack = (error.unhandled || error.fatal) ? [] : (error.stack || "").split("\n").splice(1).filter((line) => line.includes("at ")).map((line) => {
    const text = line.replace(cwd + "/", "./").replace("webpack:/", "").replace("file://", "").trim();
    return {
      text,
      internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
    };
  });
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage ?? (statusCode === 404 ? "Not Found" : "");
  const message = error.unhandled ? "internal server error" : error.message || error.toString();
  return {
    stack,
    statusCode,
    statusMessage,
    message
  };
}
function _captureError(error, type) {
  console.error(`[nitro] [${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

const errorHandler = (async function errorhandler(error, event) {
  const { stack, statusCode, statusMessage, message } = normalizeError(error);
  const errorObject = {
    url: event.path,
    statusCode,
    statusMessage,
    message,
    stack: "",
    // TODO: check and validate error.data for serialisation into query
    data: error.data
  };
  if (error.unhandled || error.fatal) {
    const tags = [
      "[nuxt]",
      "[request error]",
      error.unhandled && "[unhandled]",
      error.fatal && "[fatal]",
      Number(errorObject.statusCode) !== 200 && `[${errorObject.statusCode}]`
    ].filter(Boolean).join(" ");
    console.error(tags, (error.message || error.toString() || "internal server error") + "\n" + stack.map((l) => "  " + l.text).join("  \n"));
  }
  if (event.handled) {
    return;
  }
  setResponseStatus(event, errorObject.statusCode !== 200 && errorObject.statusCode || 500, errorObject.statusMessage);
  if (isJsonRequest(event)) {
    setResponseHeader(event, "Content-Type", "application/json");
    return send(event, JSON.stringify(errorObject));
  }
  const reqHeaders = getRequestHeaders(event);
  const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
  const res = isRenderingError ? null : await useNitroApp().localFetch(
    withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject),
    {
      headers: { ...reqHeaders, "x-nuxt-error": "true" },
      redirect: "manual"
    }
  ).catch(() => null);
  if (!res) {
    const { template } = await import('./error-500.mjs');
    if (event.handled) {
      return;
    }
    setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
    return send(event, template(errorObject));
  }
  const html = await res.text();
  if (event.handled) {
    return;
  }
  for (const [header, value] of res.headers.entries()) {
    setResponseHeader(event, header, value);
  }
  setResponseStatus(event, res.status && res.status !== 200 ? res.status : undefined, res.statusText);
  return send(event, html);
});

const script = "\"use strict\";(()=>{const t=window,e=document.documentElement,c=[\"dark\",\"light\"],n=getStorageValue(\"localStorage\",\"nuxt-color-mode\")||\"light\";let i=n===\"system\"?u():n;const r=e.getAttribute(\"data-color-mode-forced\");r&&(i=r),l(i),t[\"__NUXT_COLOR_MODE__\"]={preference:n,value:i,getColorScheme:u,addColorScheme:l,removeColorScheme:d};function l(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.add(s):e.className+=\" \"+s,a&&e.setAttribute(\"data-\"+a,o)}function d(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.remove(s):e.className=e.className.replace(new RegExp(s,\"g\"),\"\"),a&&e.removeAttribute(\"data-\"+a)}function f(o){return t.matchMedia(\"(prefers-color-scheme\"+o+\")\")}function u(){if(t.matchMedia&&f(\"\").media!==\"not all\"){for(const o of c)if(f(\":\"+o).matches)return o}return\"light\"}})();function getStorageValue(t,e){switch(t){case\"localStorage\":return window.localStorage.getItem(e);case\"sessionStorage\":return window.sessionStorage.getItem(e);case\"cookie\":return getCookie(e);default:return null}}function getCookie(t){const c=(\"; \"+window.document.cookie).split(\"; \"+t+\"=\");if(c.length===2)return c.pop()?.split(\";\").shift()}";

const _OdUJsQnmT1 = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

const plugins = [
  _OdUJsQnmT1
];

const assets$1 = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"10be-n8egyE9tcb7sKGr/pYCaQ4uWqxI\"",
    "mtime": "2025-01-25T13:51:18.000Z",
    "size": 4286,
    "path": "../public/favicon.ico"
  },
  "/robots.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1-rcg7GeeTSRscbqD9i0bNnzLlkvw\"",
    "mtime": "2025-01-25T13:51:18.000Z",
    "size": 1,
    "path": "../public/robots.txt"
  },
  "/_nuxt/003fc7e9f5925aff2368e543ccc6a2e3.CRNCn1y0.woff2": {
    "type": "font/woff2",
    "etag": "\"fdcc-FeGv39l8SuT6urklxBi7k9ywr7Q\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 64972,
    "path": "../public/_nuxt/003fc7e9f5925aff2368e543ccc6a2e3.CRNCn1y0.woff2"
  },
  "/_nuxt/00574f73ac7417880855599b6db6e3e0.CmZD4n2R.woff2": {
    "type": "font/woff2",
    "etag": "\"11374-6N7tTlO+/SWHLLIXeZatg5EuXFY\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 70516,
    "path": "../public/_nuxt/00574f73ac7417880855599b6db6e3e0.CmZD4n2R.woff2"
  },
  "/_nuxt/02c8495c4c5088eac82f81ef01d7fd27.C8ziN5Ji.woff2": {
    "type": "font/woff2",
    "etag": "\"fcc4-U4AOA08ZnbgU7bttcMiiKHl3xlg\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 64708,
    "path": "../public/_nuxt/02c8495c4c5088eac82f81ef01d7fd27.C8ziN5Ji.woff2"
  },
  "/_nuxt/04ff46d730a1173ab00bd0bb984edab0.sQc16lmR.woff2": {
    "type": "font/woff2",
    "etag": "\"fbac-6kv8BmSCepOoRdCt0Cb0RZr2xkA\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 64428,
    "path": "../public/_nuxt/04ff46d730a1173ab00bd0bb984edab0.sQc16lmR.woff2"
  },
  "/_nuxt/07a475bf61ae162772902e800d32c91e.Cvwf5_wf.woff2": {
    "type": "font/woff2",
    "etag": "\"10490-xC2MqQLgVHErFB/bgw1815UeAvw\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 66704,
    "path": "../public/_nuxt/07a475bf61ae162772902e800d32c91e.Cvwf5_wf.woff2"
  },
  "/_nuxt/0989e4b0adf52936f27ac9940fbb9d25.H_uSf2wa.woff2": {
    "type": "font/woff2",
    "etag": "\"10140-ScUFrlVqDiFdsCUVMuoY1vwaZV0\"",
    "mtime": "2025-02-03T06:36:23.212Z",
    "size": 65856,
    "path": "../public/_nuxt/0989e4b0adf52936f27ac9940fbb9d25.H_uSf2wa.woff2"
  },
  "/_nuxt/09bf969b8eb403a12a05f01af50aefc7.Brwdtbhz.woff2": {
    "type": "font/woff2",
    "etag": "\"107d8-k7In17EDhwZEJBUqzgnAYORKAAc\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 67544,
    "path": "../public/_nuxt/09bf969b8eb403a12a05f01af50aefc7.Brwdtbhz.woff2"
  },
  "/_nuxt/0b0a323dd0f4c391c3be9d2fc8811d0d.BCNOgTgG.woff2": {
    "type": "font/woff2",
    "etag": "\"dbe4-g6RE+iNzbIkwMbbEA2A53LJbVXE\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 56292,
    "path": "../public/_nuxt/0b0a323dd0f4c391c3be9d2fc8811d0d.BCNOgTgG.woff2"
  },
  "/_nuxt/0bc1da8259f95ecf9c4660a098c2c825.BfO95qWf.woff2": {
    "type": "font/woff2",
    "etag": "\"422c-Ml/YkXP6NIGhOR+Sum7Nx19FGDs\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 16940,
    "path": "../public/_nuxt/0bc1da8259f95ecf9c4660a098c2c825.BfO95qWf.woff2"
  },
  "/_nuxt/0cce722fd89105166c62479ffaf67c96.B0DZQWkI.woff2": {
    "type": "font/woff2",
    "etag": "\"3cc4-5Q04j9Wv4l2cBN1GY/tEoHqppkw\"",
    "mtime": "2025-02-03T06:36:23.150Z",
    "size": 15556,
    "path": "../public/_nuxt/0cce722fd89105166c62479ffaf67c96.B0DZQWkI.woff2"
  },
  "/_nuxt/0cea3e23ebaebb9b59937147b832347d.DGwInnLH.woff2": {
    "type": "font/woff2",
    "etag": "\"f330-5bXsictrxjHN6oSDweA1LSjefys\"",
    "mtime": "2025-02-03T06:36:23.175Z",
    "size": 62256,
    "path": "../public/_nuxt/0cea3e23ebaebb9b59937147b832347d.DGwInnLH.woff2"
  },
  "/_nuxt/0df338083ebbef98d1dae2098a533931.CE3vZdu8.woff2": {
    "type": "font/woff2",
    "etag": "\"f960-UD62hQBLoWvPOAa5XZ5DjbvyFl8\"",
    "mtime": "2025-02-03T06:36:23.175Z",
    "size": 63840,
    "path": "../public/_nuxt/0df338083ebbef98d1dae2098a533931.CE3vZdu8.woff2"
  },
  "/_nuxt/0e6e3b050f335e9f942583ec0d056009.DxvTFFZI.woff2": {
    "type": "font/woff2",
    "etag": "\"101f4-bVpLcfqsqB482eIh4eOrLKzo0Ls\"",
    "mtime": "2025-02-03T06:36:23.212Z",
    "size": 66036,
    "path": "../public/_nuxt/0e6e3b050f335e9f942583ec0d056009.DxvTFFZI.woff2"
  },
  "/_nuxt/0f57abe5e71ade7124dddc10ffd5b829.C4uulZhW.woff2": {
    "type": "font/woff2",
    "etag": "\"4810-bXDpMDNlkI8bBAumy5dklY/FuTc\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 18448,
    "path": "../public/_nuxt/0f57abe5e71ade7124dddc10ffd5b829.C4uulZhW.woff2"
  },
  "/_nuxt/12c1d91c994b4dd39436265f19a67ccd.DrFgOCbH.woff2": {
    "type": "font/woff2",
    "etag": "\"3698-pm3O0mvn9FU31THnXGzCLcKGa2c\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 13976,
    "path": "../public/_nuxt/12c1d91c994b4dd39436265f19a67ccd.DrFgOCbH.woff2"
  },
  "/_nuxt/13808a64410680072762e5b9febae744.Cju77N4v.woff2": {
    "type": "font/woff2",
    "etag": "\"109d8-agqQQgIHtQTQAjLrAv3HlooJohg\"",
    "mtime": "2025-02-03T06:36:23.216Z",
    "size": 68056,
    "path": "../public/_nuxt/13808a64410680072762e5b9febae744.Cju77N4v.woff2"
  },
  "/_nuxt/13cc4b04dc3fe4315d2ce25a865df5dd.STLvFoN0.woff2": {
    "type": "font/woff2",
    "etag": "\"f958-eBwGiiAeixMSHgpHBmDl7NCOdLw\"",
    "mtime": "2025-02-03T06:36:23.196Z",
    "size": 63832,
    "path": "../public/_nuxt/13cc4b04dc3fe4315d2ce25a865df5dd.STLvFoN0.woff2"
  },
  "/_nuxt/142819d67d449dff5a8b3c348dd67a6a.-szoZlzk.woff2": {
    "type": "font/woff2",
    "etag": "\"10f30-tvB0sc4S55ESNH1vx5HNRBXNdTw\"",
    "mtime": "2025-02-03T06:36:23.221Z",
    "size": 69424,
    "path": "../public/_nuxt/142819d67d449dff5a8b3c348dd67a6a.-szoZlzk.woff2"
  },
  "/_nuxt/14bd4b0bc73d4762c2e8c84bcc47bcc5.BT12E7Fz.woff2": {
    "type": "font/woff2",
    "etag": "\"10e70-zw5eaaM7T/1Nq6lsBfwNcD5dKVI\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 69232,
    "path": "../public/_nuxt/14bd4b0bc73d4762c2e8c84bcc47bcc5.BT12E7Fz.woff2"
  },
  "/_nuxt/14d3fdda3d5cfde6be07d39a0c370949.DssyhtoK.woff2": {
    "type": "font/woff2",
    "etag": "\"103c0-uKGqLVg2rDfzRl5u9ywl9NCshYo\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 66496,
    "path": "../public/_nuxt/14d3fdda3d5cfde6be07d39a0c370949.DssyhtoK.woff2"
  },
  "/_nuxt/1618ddcb43e3b264d9c6adde2c411a62.D9A4dp4Q.woff2": {
    "type": "font/woff2",
    "etag": "\"dd88-q/u9kVCeaAViZAGEbMlBwAfzG5o\"",
    "mtime": "2025-02-03T06:36:23.230Z",
    "size": 56712,
    "path": "../public/_nuxt/1618ddcb43e3b264d9c6adde2c411a62.D9A4dp4Q.woff2"
  },
  "/_nuxt/17ef24a1974ab3731f4e5bf989ff4e5a.Rf9k3GQ8.woff2": {
    "type": "font/woff2",
    "etag": "\"fafc-H69AJ6/1NY2wF4bB4Zv3Hwhw5S8\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 64252,
    "path": "../public/_nuxt/17ef24a1974ab3731f4e5bf989ff4e5a.Rf9k3GQ8.woff2"
  },
  "/_nuxt/198150d59f6556eb89a39dced63632a3.BovenKre.woff2": {
    "type": "font/woff2",
    "etag": "\"f2bc-mrTB3c/NLRnQ2vNI1cQFTaRBJbU\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 62140,
    "path": "../public/_nuxt/198150d59f6556eb89a39dced63632a3.BovenKre.woff2"
  },
  "/_nuxt/1ae5f89e2aaafba916bb3ba8b32717da.VP1c3iSo.woff2": {
    "type": "font/woff2",
    "etag": "\"f33c-FBEhK5OC+Ce0dHEXBGCssI4fUzU\"",
    "mtime": "2025-02-03T06:36:23.225Z",
    "size": 62268,
    "path": "../public/_nuxt/1ae5f89e2aaafba916bb3ba8b32717da.VP1c3iSo.woff2"
  },
  "/_nuxt/1cbcabfee4c776c07bcab2f96d43204b.BFkSnaV8.woff2": {
    "type": "font/woff2",
    "etag": "\"100f4-SNIrspK1D6bCSqyCTt+URY8oM3o\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 65780,
    "path": "../public/_nuxt/1cbcabfee4c776c07bcab2f96d43204b.BFkSnaV8.woff2"
  },
  "/_nuxt/1cbede970fbfd93fdb7cf497a9cff62e.Cd_XIFO-.woff2": {
    "type": "font/woff2",
    "etag": "\"11978-6P1m+ohyuMqd+JwyDS0OOdRJJy0\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 72056,
    "path": "../public/_nuxt/1cbede970fbfd93fdb7cf497a9cff62e.Cd_XIFO-.woff2"
  },
  "/_nuxt/1e4603959576139316bcabb6955d01ef.BVMYv-XA.woff2": {
    "type": "font/woff2",
    "etag": "\"107d4-xAl2h4tsjBVPCILU+IkHgpuWR+4\"",
    "mtime": "2025-02-03T06:36:23.218Z",
    "size": 67540,
    "path": "../public/_nuxt/1e4603959576139316bcabb6955d01ef.BVMYv-XA.woff2"
  },
  "/_nuxt/1ef78fec0c7d5b522a1e2c4a9fbe1b16.BzuM10BY.woff2": {
    "type": "font/woff2",
    "etag": "\"11508-T7X/ghyfDQfQZQwT6hgHwqvt69Y\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 70920,
    "path": "../public/_nuxt/1ef78fec0c7d5b522a1e2c4a9fbe1b16.BzuM10BY.woff2"
  },
  "/_nuxt/1f951aa9f13b06ce3b58c2024615ecd8.b8SsRTsE.woff2": {
    "type": "font/woff2",
    "etag": "\"eb70-JRN4boeaetP/V3r+hszNkZ3S+Gk\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 60272,
    "path": "../public/_nuxt/1f951aa9f13b06ce3b58c2024615ecd8.b8SsRTsE.woff2"
  },
  "/_nuxt/2058cdb9042268a1e15f93e6d50c5471.ITjpo7ZT.woff2": {
    "type": "font/woff2",
    "etag": "\"10ff0-VKcy97ndxvUYYlgjskdakpSbzf0\"",
    "mtime": "2025-02-03T06:36:23.198Z",
    "size": 69616,
    "path": "../public/_nuxt/2058cdb9042268a1e15f93e6d50c5471.ITjpo7ZT.woff2"
  },
  "/_nuxt/21c0bacc76b8a6fdabf71ceefce990e7.BYh8FgA0.woff2": {
    "type": "font/woff2",
    "etag": "\"f76c-TEtSvDR9HgsCSmn9NW0gUOBj8Sc\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 63340,
    "path": "../public/_nuxt/21c0bacc76b8a6fdabf71ceefce990e7.BYh8FgA0.woff2"
  },
  "/_nuxt/21c1a30cd05c8debbca416f899ee6101.BgoXCkWI.woff2": {
    "type": "font/woff2",
    "etag": "\"fc24-Ge2DPyewZBfOSQftKTNjVAowDss\"",
    "mtime": "2025-02-03T06:36:23.177Z",
    "size": 64548,
    "path": "../public/_nuxt/21c1a30cd05c8debbca416f899ee6101.BgoXCkWI.woff2"
  },
  "/_nuxt/230f2fe5c4a1e21d285451b5fd60425d.DJcpx_ns.woff2": {
    "type": "font/woff2",
    "etag": "\"11cd0-fMNrO/UAvDsHB0+a6C2XVjZL4Hc\"",
    "mtime": "2025-02-03T06:36:23.184Z",
    "size": 72912,
    "path": "../public/_nuxt/230f2fe5c4a1e21d285451b5fd60425d.DJcpx_ns.woff2"
  },
  "/_nuxt/23711dca0c73c03a6bd88a1deb06be24.ChXF08sS.woff2": {
    "type": "font/woff2",
    "etag": "\"de70-dlPkxDN+gWsL4bYEWKge3EAnzlE\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 56944,
    "path": "../public/_nuxt/23711dca0c73c03a6bd88a1deb06be24.ChXF08sS.woff2"
  },
  "/_nuxt/24326e3c5bcb5fb4904fab7cf1fbf71f.BRw-rr-2.woff2": {
    "type": "font/woff2",
    "etag": "\"10b94-fFS2I4iOK5nnQxgQTVaPLVADMw0\"",
    "mtime": "2025-02-03T06:36:23.186Z",
    "size": 68500,
    "path": "../public/_nuxt/24326e3c5bcb5fb4904fab7cf1fbf71f.BRw-rr-2.woff2"
  },
  "/_nuxt/25cbc6e160ae34232fa282c5c77a4936.CWHhyLoD.woff2": {
    "type": "font/woff2",
    "etag": "\"ee30-lxOSl+m6Wa9KdkTYkBL71/wf6dg\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 60976,
    "path": "../public/_nuxt/25cbc6e160ae34232fa282c5c77a4936.CWHhyLoD.woff2"
  },
  "/_nuxt/28340f939b216176c904d819f1af7a6f.DK2WA0Qv.woff2": {
    "type": "font/woff2",
    "etag": "\"10340-GKBvJi8TVx46xBua1W/pTYFMpQY\"",
    "mtime": "2025-02-03T06:36:23.196Z",
    "size": 66368,
    "path": "../public/_nuxt/28340f939b216176c904d819f1af7a6f.DK2WA0Qv.woff2"
  },
  "/_nuxt/28a05326c45669815ce7b6bec1039ddb.DrqZVM0x.woff2": {
    "type": "font/woff2",
    "etag": "\"f924-sp9lnk+shwUfdmcowdz8Ve0TVYw\"",
    "mtime": "2025-02-03T06:36:23.170Z",
    "size": 63780,
    "path": "../public/_nuxt/28a05326c45669815ce7b6bec1039ddb.DrqZVM0x.woff2"
  },
  "/_nuxt/2a6acf7e981f309f7219d814c948a35e.BYu8z7Rq.woff2": {
    "type": "font/woff2",
    "etag": "\"f0cc-eOpWDeU3UAx2CW7wK+u9ap8ukkA\"",
    "mtime": "2025-02-03T06:36:23.200Z",
    "size": 61644,
    "path": "../public/_nuxt/2a6acf7e981f309f7219d814c948a35e.BYu8z7Rq.woff2"
  },
  "/_nuxt/2c21be4c793402d3b0a7633bcd641e19.DqXa939Y.woff2": {
    "type": "font/woff2",
    "etag": "\"104a0-wgjz4z7SydvSPJQ9UrsjokWsd6g\"",
    "mtime": "2025-02-03T06:36:23.218Z",
    "size": 66720,
    "path": "../public/_nuxt/2c21be4c793402d3b0a7633bcd641e19.DqXa939Y.woff2"
  },
  "/_nuxt/2ed1d859000cdd194f7513e6d8cb3269.DM-JRibx.woff2": {
    "type": "font/woff2",
    "etag": "\"4b68-DGnMfMoggEPPpdzz/RKF/DzyxI0\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 19304,
    "path": "../public/_nuxt/2ed1d859000cdd194f7513e6d8cb3269.DM-JRibx.woff2"
  },
  "/_nuxt/32ace119ad05c1a669e22344be34bc9a.BoMO04qY.woff2": {
    "type": "font/woff2",
    "etag": "\"41dc-/7//vB0XXpskNjJz3d6xCiOCsZE\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 16860,
    "path": "../public/_nuxt/32ace119ad05c1a669e22344be34bc9a.BoMO04qY.woff2"
  },
  "/_nuxt/37368bdd40deffba0d3ed3d9f2619a2c.D9qSMS6W.woff2": {
    "type": "font/woff2",
    "etag": "\"102b8-rSgk3uzBggT+dm7QpM3l8cCXhwY\"",
    "mtime": "2025-02-03T06:36:23.191Z",
    "size": 66232,
    "path": "../public/_nuxt/37368bdd40deffba0d3ed3d9f2619a2c.D9qSMS6W.woff2"
  },
  "/_nuxt/39f9c7b90128175459dd43211a9530bb.DJLYCQFI.woff2": {
    "type": "font/woff2",
    "etag": "\"f9d8-iExzCr9YmV17qO5+983zoS+sPOA\"",
    "mtime": "2025-02-03T06:36:23.170Z",
    "size": 63960,
    "path": "../public/_nuxt/39f9c7b90128175459dd43211a9530bb.DJLYCQFI.woff2"
  },
  "/_nuxt/3a863d72088bb7161ffa922f2cbfea09.B-ewGQZS.woff2": {
    "type": "font/woff2",
    "etag": "\"103ec-HAwhmIJROgYL5ICBkK3bJ5SxZ4w\"",
    "mtime": "2025-02-03T06:36:23.215Z",
    "size": 66540,
    "path": "../public/_nuxt/3a863d72088bb7161ffa922f2cbfea09.B-ewGQZS.woff2"
  },
  "/_nuxt/3aab620d3e366f1e4fb5bbaa2df5eee4.Bu6UpjYg.woff2": {
    "type": "font/woff2",
    "etag": "\"103bc-LCCSqPGrt4z/khJnI45HrsRrTLQ\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 66492,
    "path": "../public/_nuxt/3aab620d3e366f1e4fb5bbaa2df5eee4.Bu6UpjYg.woff2"
  },
  "/_nuxt/3ee07816d21bb6557265ab2b51de53d0.f610kX59.woff2": {
    "type": "font/woff2",
    "etag": "\"fc84-duIuwT6oVxONOw+151YfNy8n62w\"",
    "mtime": "2025-02-03T06:36:23.197Z",
    "size": 64644,
    "path": "../public/_nuxt/3ee07816d21bb6557265ab2b51de53d0.f610kX59.woff2"
  },
  "/_nuxt/3f87b7e17144f32ae4d467684f47c915.1ey_JNlW.woff2": {
    "type": "font/woff2",
    "etag": "\"fa8c-fkCOmXc8iSfwrQC/GOwyYFstSfk\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 64140,
    "path": "../public/_nuxt/3f87b7e17144f32ae4d467684f47c915.1ey_JNlW.woff2"
  },
  "/_nuxt/40e4333e310ca2fee7c8bd88ce1bdbb8.Cd9AtrNY.woff2": {
    "type": "font/woff2",
    "etag": "\"12400-6nspENuiF1WNhFMRU36dexg96To\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 74752,
    "path": "../public/_nuxt/40e4333e310ca2fee7c8bd88ce1bdbb8.Cd9AtrNY.woff2"
  },
  "/_nuxt/41f9860c0949e9eb0ba509cf3d8d4801.D6ilBYyw.woff2": {
    "type": "font/woff2",
    "etag": "\"dc6c-CgIuXPmSrWa0Ak4e/gg6oPtRYTU\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 56428,
    "path": "../public/_nuxt/41f9860c0949e9eb0ba509cf3d8d4801.D6ilBYyw.woff2"
  },
  "/_nuxt/431705014d53ad28735674e5b0354a5a.CMgdkMAf.woff2": {
    "type": "font/woff2",
    "etag": "\"fdc8-5fllIP34K2dKZu4es1MU7Rmhhxw\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 64968,
    "path": "../public/_nuxt/431705014d53ad28735674e5b0354a5a.CMgdkMAf.woff2"
  },
  "/_nuxt/436e67b2b212cb2f30d42d5b97305409.Cz8Ivk6h.woff2": {
    "type": "font/woff2",
    "etag": "\"10544-Z1Doah3g/fn3SrIhOI3Au1ueosM\"",
    "mtime": "2025-02-03T06:36:23.212Z",
    "size": 66884,
    "path": "../public/_nuxt/436e67b2b212cb2f30d42d5b97305409.Cz8Ivk6h.woff2"
  },
  "/_nuxt/43d8a535787965d7b7197c841e6b17e0.Cvmu586K.woff2": {
    "type": "font/woff2",
    "etag": "\"50a0-LYeo0vg1EI0+nqqlFYFt/G0QVio\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 20640,
    "path": "../public/_nuxt/43d8a535787965d7b7197c841e6b17e0.Cvmu586K.woff2"
  },
  "/_nuxt/4503eb010424afa006a87e82e48033aa.mRyee9TX.woff2": {
    "type": "font/woff2",
    "etag": "\"103f4-TwEXKwrZRqdVOvFHgZN5Phn7N/s\"",
    "mtime": "2025-02-03T06:36:23.203Z",
    "size": 66548,
    "path": "../public/_nuxt/4503eb010424afa006a87e82e48033aa.mRyee9TX.woff2"
  },
  "/_nuxt/47da81e1efe2c9253aa00a1d2098238c.BI4LMLxM.woff2": {
    "type": "font/woff2",
    "etag": "\"f37c-2EALMhqwaF3z5g6djI0gkcQuzWE\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 62332,
    "path": "../public/_nuxt/47da81e1efe2c9253aa00a1d2098238c.BI4LMLxM.woff2"
  },
  "/_nuxt/4830c3acae9137c45501e052c6897532.wR7GEZCj.woff2": {
    "type": "font/woff2",
    "etag": "\"4510-Uruc+TSFw8gGMBcM48dKTTFFsFE\"",
    "mtime": "2025-02-03T06:36:23.211Z",
    "size": 17680,
    "path": "../public/_nuxt/4830c3acae9137c45501e052c6897532.wR7GEZCj.woff2"
  },
  "/_nuxt/492f1378d9fcf80e49530310154be814.7CnyrkSD.woff2": {
    "type": "font/woff2",
    "etag": "\"10e28-mqJ1yhxyzS9R/q5v00G+zTZ/q0Y\"",
    "mtime": "2025-02-03T06:36:23.220Z",
    "size": 69160,
    "path": "../public/_nuxt/492f1378d9fcf80e49530310154be814.7CnyrkSD.woff2"
  },
  "/_nuxt/4a524d91aea44d809fd10578dfbd8e43.z15pyacU.woff2": {
    "type": "font/woff2",
    "etag": "\"e330-9mXqyNpwcHIWkmP0+IPYXz9gSSM\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 58160,
    "path": "../public/_nuxt/4a524d91aea44d809fd10578dfbd8e43.z15pyacU.woff2"
  },
  "/_nuxt/4afd851af23874cce86341acee6e0b77.DR4IKJAt.woff2": {
    "type": "font/woff2",
    "etag": "\"102e8-i9o1tyZJagOikutET1RSchy9bRM\"",
    "mtime": "2025-02-03T06:36:23.215Z",
    "size": 66280,
    "path": "../public/_nuxt/4afd851af23874cce86341acee6e0b77.DR4IKJAt.woff2"
  },
  "/_nuxt/4c1a7a5b43a5e54d668a5eadfd82c11c.DjPLmrxm.woff2": {
    "type": "font/woff2",
    "etag": "\"fae4-IgpJ6B0zgiJ84NRxRIDSRhbEur0\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 64228,
    "path": "../public/_nuxt/4c1a7a5b43a5e54d668a5eadfd82c11c.DjPLmrxm.woff2"
  },
  "/_nuxt/4e1d5575712ea5a71c74c14c775f12ef.Cx_-95BB.woff2": {
    "type": "font/woff2",
    "etag": "\"f9fc-BzDX1NhxTAhVBEk9CuFCuVYG2m4\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 63996,
    "path": "../public/_nuxt/4e1d5575712ea5a71c74c14c775f12ef.Cx_-95BB.woff2"
  },
  "/_nuxt/5008dfde142375aa744192ac8e79b9ac.Dgr5M4c8.woff2": {
    "type": "font/woff2",
    "etag": "\"100e8-FwMA6hC7f/ZJjO+HMW4VpnKczH4\"",
    "mtime": "2025-02-03T06:36:23.186Z",
    "size": 65768,
    "path": "../public/_nuxt/5008dfde142375aa744192ac8e79b9ac.Dgr5M4c8.woff2"
  },
  "/_nuxt/541763cab389f103f8ad69380d19aa3b.CtMiJ--u.woff2": {
    "type": "font/woff2",
    "etag": "\"10f10-KG8LXWDl7P0ZqG7+lmMiiUpGlZM\"",
    "mtime": "2025-02-03T06:36:23.186Z",
    "size": 69392,
    "path": "../public/_nuxt/541763cab389f103f8ad69380d19aa3b.CtMiJ--u.woff2"
  },
  "/_nuxt/54e7588acb21da318d7003f457266af1.Bcrj-Cho.woff2": {
    "type": "font/woff2",
    "etag": "\"ea20-a/WwNfxZsOSn/c2XjH5ntJDDc3s\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 59936,
    "path": "../public/_nuxt/54e7588acb21da318d7003f457266af1.Bcrj-Cho.woff2"
  },
  "/_nuxt/55ca7259a01efb2430d6d10d1e96df8e.D9fhoBOo.woff2": {
    "type": "font/woff2",
    "etag": "\"f288-cilauox/wT8yBqLc51qrAQtpvqo\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 62088,
    "path": "../public/_nuxt/55ca7259a01efb2430d6d10d1e96df8e.D9fhoBOo.woff2"
  },
  "/_nuxt/562ba74711d661bcd5f2b41c5cbb97b4.CV-DK50A.woff2": {
    "type": "font/woff2",
    "etag": "\"45ac-rHwAFYGP6WPVaGb1+FxY5VJ5xcQ\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 17836,
    "path": "../public/_nuxt/562ba74711d661bcd5f2b41c5cbb97b4.CV-DK50A.woff2"
  },
  "/_nuxt/56c9ccc4b6516b963e67f07a24debf5c.CmfN1ZrW.woff2": {
    "type": "font/woff2",
    "etag": "\"10d04-BWgSVxxGPx0cCqqmYSUnf6KHADI\"",
    "mtime": "2025-02-03T06:36:23.184Z",
    "size": 68868,
    "path": "../public/_nuxt/56c9ccc4b6516b963e67f07a24debf5c.CmfN1ZrW.woff2"
  },
  "/_nuxt/56d92d285b1a0d85f88129da296148a8.Bz_huxNA.woff2": {
    "type": "font/woff2",
    "etag": "\"f034-1BFG2Pnn9Agh2iZz9HbNV0hYGO8\"",
    "mtime": "2025-02-03T06:36:23.232Z",
    "size": 61492,
    "path": "../public/_nuxt/56d92d285b1a0d85f88129da296148a8.Bz_huxNA.woff2"
  },
  "/_nuxt/56dc6046fe9c42194cf83edf2011276c.BgnN4rNp.woff2": {
    "type": "font/woff2",
    "etag": "\"104dc-lX2uo+9v+9yzafxNbve1lP8PpdU\"",
    "mtime": "2025-02-03T06:36:23.199Z",
    "size": 66780,
    "path": "../public/_nuxt/56dc6046fe9c42194cf83edf2011276c.BgnN4rNp.woff2"
  },
  "/_nuxt/5a1d2b4b3124f23aee23db7800d16ec8.B6il6ldn.woff2": {
    "type": "font/woff2",
    "etag": "\"103b8-zSoH2mVG3aLfSuDAeoMvP/FjGaA\"",
    "mtime": "2025-02-03T06:36:23.197Z",
    "size": 66488,
    "path": "../public/_nuxt/5a1d2b4b3124f23aee23db7800d16ec8.B6il6ldn.woff2"
  },
  "/_nuxt/5afba0249e8df078abcf36341a422534.C27VLvLZ.woff2": {
    "type": "font/woff2",
    "etag": "\"f82c-7YXegXdnzCv9GSIl60zOK2kBIr8\"",
    "mtime": "2025-02-03T06:36:23.179Z",
    "size": 63532,
    "path": "../public/_nuxt/5afba0249e8df078abcf36341a422534.C27VLvLZ.woff2"
  },
  "/_nuxt/5d0e934848526835719b3d095833a52e.DIufT02M.woff2": {
    "type": "font/woff2",
    "etag": "\"f784-zS8EvcqFRi/jekpevsuiLK1oEHA\"",
    "mtime": "2025-02-03T06:36:23.169Z",
    "size": 63364,
    "path": "../public/_nuxt/5d0e934848526835719b3d095833a52e.DIufT02M.woff2"
  },
  "/_nuxt/5e4328174e6ee651c556ec835734daf5.vmneyq49.woff2": {
    "type": "font/woff2",
    "etag": "\"f7a0-+NNTFCU8Eclw9R1Bg8gEW/ZtnfQ\"",
    "mtime": "2025-02-03T06:36:23.224Z",
    "size": 63392,
    "path": "../public/_nuxt/5e4328174e6ee651c556ec835734daf5.vmneyq49.woff2"
  },
  "/_nuxt/5ece9498a4e90ffcd0e4c81f693469a2.D6c8a6f0.woff2": {
    "type": "font/woff2",
    "etag": "\"ff48-uWQIzU86AK4O4KKhTrYsE16ZiAM\"",
    "mtime": "2025-02-03T06:36:23.179Z",
    "size": 65352,
    "path": "../public/_nuxt/5ece9498a4e90ffcd0e4c81f693469a2.D6c8a6f0.woff2"
  },
  "/_nuxt/5f44ece1665084b0bd38e264a0eee549.BiOKoUHp.woff2": {
    "type": "font/woff2",
    "etag": "\"e934-rF7EQbpTi1IfJSo3TTkRXG+NE7I\"",
    "mtime": "2025-02-03T06:36:23.221Z",
    "size": 59700,
    "path": "../public/_nuxt/5f44ece1665084b0bd38e264a0eee549.BiOKoUHp.woff2"
  },
  "/_nuxt/60069069857287888fe021ffcbb6b914.CO_6Rnaq.woff2": {
    "type": "font/woff2",
    "etag": "\"10e40-fY/3yI5YJ0NnI6H0g8toskDnmoI\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 69184,
    "path": "../public/_nuxt/60069069857287888fe021ffcbb6b914.CO_6Rnaq.woff2"
  },
  "/_nuxt/6040adc2be658aed8dc37c90af2d3158.BLLSHZ6Z.woff2": {
    "type": "font/woff2",
    "etag": "\"10034-HrR/3CflfeOHUAtXTUfye3H7fGM\"",
    "mtime": "2025-02-03T06:36:23.212Z",
    "size": 65588,
    "path": "../public/_nuxt/6040adc2be658aed8dc37c90af2d3158.BLLSHZ6Z.woff2"
  },
  "/_nuxt/63638845b589c7eb9d6a6b9f82de684b.B95-x-Zq.woff2": {
    "type": "font/woff2",
    "etag": "\"10acc-ZezuoX6Bx1nGSXZwv8lMoNmWee4\"",
    "mtime": "2025-02-03T06:36:23.184Z",
    "size": 68300,
    "path": "../public/_nuxt/63638845b589c7eb9d6a6b9f82de684b.B95-x-Zq.woff2"
  },
  "/_nuxt/640401b239e80d24f908eba73760f11f.DMSECNba.woff2": {
    "type": "font/woff2",
    "etag": "\"10110-7B78a2qzyccxZL9ZKx2S3nVqPGg\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 65808,
    "path": "../public/_nuxt/640401b239e80d24f908eba73760f11f.DMSECNba.woff2"
  },
  "/_nuxt/648c6ef421128471ab7e2d1e164df387.CnQB0cvr.woff2": {
    "type": "font/woff2",
    "etag": "\"11aa0-pH6XRAVIEJQM37lb4pLN6keSosg\"",
    "mtime": "2025-02-03T06:36:23.191Z",
    "size": 72352,
    "path": "../public/_nuxt/648c6ef421128471ab7e2d1e164df387.CnQB0cvr.woff2"
  },
  "/_nuxt/66c3326b5548dacb38621377f6ebb897.DWLEkV7B.woff2": {
    "type": "font/woff2",
    "etag": "\"2374-zYf3cmeqT6aDz7mxqa3S8ooI6yY\"",
    "mtime": "2025-02-03T06:36:23.229Z",
    "size": 9076,
    "path": "../public/_nuxt/66c3326b5548dacb38621377f6ebb897.DWLEkV7B.woff2"
  },
  "/_nuxt/66ff7446e51f0d2b3f1489a6a4f29e0c.wM3Mq0Qb.woff2": {
    "type": "font/woff2",
    "etag": "\"10cb0-H+MiyS0SXzlRs/skJcIfrYkwS/o\"",
    "mtime": "2025-02-03T06:36:23.220Z",
    "size": 68784,
    "path": "../public/_nuxt/66ff7446e51f0d2b3f1489a6a4f29e0c.wM3Mq0Qb.woff2"
  },
  "/_nuxt/69f305ef76f611d9caef53f73870131b.BRL7MHbS.woff2": {
    "type": "font/woff2",
    "etag": "\"11240-eV+uyMHJ+b0bh6EGily4wtEBskk\"",
    "mtime": "2025-02-03T06:36:23.206Z",
    "size": 70208,
    "path": "../public/_nuxt/69f305ef76f611d9caef53f73870131b.BRL7MHbS.woff2"
  },
  "/_nuxt/6bd74cf56573115191bc5c534900f69a.BjxlYqAu.woff2": {
    "type": "font/woff2",
    "etag": "\"2dd4-PMnfGITCiWlTyn5c5ZSPvHyIbKo\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 11732,
    "path": "../public/_nuxt/6bd74cf56573115191bc5c534900f69a.BjxlYqAu.woff2"
  },
  "/_nuxt/6e2995a3d1d1cd231bc76b5d2e956452.CQlZ-aD0.woff2": {
    "type": "font/woff2",
    "etag": "\"db74-cCsz2Iy9DJhAcD5mN0yM9ag5j+8\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 56180,
    "path": "../public/_nuxt/6e2995a3d1d1cd231bc76b5d2e956452.CQlZ-aD0.woff2"
  },
  "/_nuxt/6f98ab9ec94bd27a71e26493d676d67e.BYtoPpWN.woff2": {
    "type": "font/woff2",
    "etag": "\"41bc-te+iMz7+ysHaJ3ESqZpHqPDqWbo\"",
    "mtime": "2025-02-03T06:36:23.229Z",
    "size": 16828,
    "path": "../public/_nuxt/6f98ab9ec94bd27a71e26493d676d67e.BYtoPpWN.woff2"
  },
  "/_nuxt/719cffcb1600d826239d034f92f4fd65._Wg_q1PU.woff2": {
    "type": "font/woff2",
    "etag": "\"10100-FNHD3CLm1aN6+pn3B2xYnnvJSss\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 65792,
    "path": "../public/_nuxt/719cffcb1600d826239d034f92f4fd65._Wg_q1PU.woff2"
  },
  "/_nuxt/742c75daae3cee016fa651812f7dc932.BRJtlyDQ.woff2": {
    "type": "font/woff2",
    "etag": "\"10aec-KUZ/gJdHyYR0bJ8CzqqPl8WTDlE\"",
    "mtime": "2025-02-03T06:36:23.186Z",
    "size": 68332,
    "path": "../public/_nuxt/742c75daae3cee016fa651812f7dc932.BRJtlyDQ.woff2"
  },
  "/_nuxt/748009d6ef32b48d43d3e51586be318b.dqZcxWcM.woff2": {
    "type": "font/woff2",
    "etag": "\"f1f8-qn+58Ua4TRm4lTwqVhD15Bpe8cc\"",
    "mtime": "2025-02-03T06:36:23.169Z",
    "size": 61944,
    "path": "../public/_nuxt/748009d6ef32b48d43d3e51586be318b.dqZcxWcM.woff2"
  },
  "/_nuxt/74c44fc8d40e3c487e61f19ab364cb08.BGkMKGgb.woff2": {
    "type": "font/woff2",
    "etag": "\"4690-SUG6Mi9UjxTIBclani64xJfKkH8\"",
    "mtime": "2025-02-03T06:36:23.229Z",
    "size": 18064,
    "path": "../public/_nuxt/74c44fc8d40e3c487e61f19ab364cb08.BGkMKGgb.woff2"
  },
  "/_nuxt/7909c005b670dfcb95aeacf03e0bacf4.BTXrVNPl.woff2": {
    "type": "font/woff2",
    "etag": "\"1cf4-6FIupGsNr7J7l3B+ZaCxZtjQLj8\"",
    "mtime": "2025-02-03T06:36:23.228Z",
    "size": 7412,
    "path": "../public/_nuxt/7909c005b670dfcb95aeacf03e0bacf4.BTXrVNPl.woff2"
  },
  "/_nuxt/7be17f9dbd406a0764a19bef3a61cddc.CjU3MtYR.woff2": {
    "type": "font/woff2",
    "etag": "\"4108-57r4kouPmQboDgS8FcVpmb52LNI\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 16648,
    "path": "../public/_nuxt/7be17f9dbd406a0764a19bef3a61cddc.CjU3MtYR.woff2"
  },
  "/_nuxt/7cbc7bd4a432ad42483d6f81a405322f.DXfyg7Z9.woff2": {
    "type": "font/woff2",
    "etag": "\"7230-xOLCzfWv8W4gMnDaugk8tLzW/tg\"",
    "mtime": "2025-02-03T06:36:23.230Z",
    "size": 29232,
    "path": "../public/_nuxt/7cbc7bd4a432ad42483d6f81a405322f.DXfyg7Z9.woff2"
  },
  "/_nuxt/7d94b2a9c0690ad93d113300ce00cde2.C3FLvRVx.woff2": {
    "type": "font/woff2",
    "etag": "\"f7d0-CjpffB7fd9GeyTYgXcxX435JgMk\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 63440,
    "path": "../public/_nuxt/7d94b2a9c0690ad93d113300ce00cde2.C3FLvRVx.woff2"
  },
  "/_nuxt/7f93a521e6f7960ee74e5f29523086d9.B0zgyKA3.woff2": {
    "type": "font/woff2",
    "etag": "\"10590-LmsC7lYm1X65BVWN9kOlizCj0D8\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 66960,
    "path": "../public/_nuxt/7f93a521e6f7960ee74e5f29523086d9.B0zgyKA3.woff2"
  },
  "/_nuxt/80452fdaa1c9112c5080a0073a3aa93a.BV7ejv6u.woff2": {
    "type": "font/woff2",
    "etag": "\"eefc-aV7PAARVzUugXX5S5sTBEszAb6I\"",
    "mtime": "2025-02-03T06:36:23.169Z",
    "size": 61180,
    "path": "../public/_nuxt/80452fdaa1c9112c5080a0073a3aa93a.BV7ejv6u.woff2"
  },
  "/_nuxt/8055c49daac63421a32f8b37f2e17f37.CSB_DEKz.woff2": {
    "type": "font/woff2",
    "etag": "\"10600-7vKRWTeaNSrXTOAzLryD5NJ8OKE\"",
    "mtime": "2025-02-03T06:36:23.197Z",
    "size": 67072,
    "path": "../public/_nuxt/8055c49daac63421a32f8b37f2e17f37.CSB_DEKz.woff2"
  },
  "/_nuxt/8133ac914bcece4fe2795f59a129de25.DjXRg3Ow.woff2": {
    "type": "font/woff2",
    "etag": "\"f24c-3sTg14f1pPvVUd4FoIHybq/UEjA\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 62028,
    "path": "../public/_nuxt/8133ac914bcece4fe2795f59a129de25.DjXRg3Ow.woff2"
  },
  "/_nuxt/8551069b5791b180a39c5a4372487370.KsDv3GlE.woff2": {
    "type": "font/woff2",
    "etag": "\"10394-WMv6lnmxHvB2iXcJEWUc5NTG5cs\"",
    "mtime": "2025-02-03T06:36:23.213Z",
    "size": 66452,
    "path": "../public/_nuxt/8551069b5791b180a39c5a4372487370.KsDv3GlE.woff2"
  },
  "/_nuxt/8567cfda91a32f226fe0bfe42a0abd50.BGxT4r-_.woff2": {
    "type": "font/woff2",
    "etag": "\"bbe0-EOKuJY3L+DAp3sN9KE2ZlLGDK8I\"",
    "mtime": "2025-02-03T06:36:23.208Z",
    "size": 48096,
    "path": "../public/_nuxt/8567cfda91a32f226fe0bfe42a0abd50.BGxT4r-_.woff2"
  },
  "/_nuxt/85905e20c4c0e291ab4114022e9fb151.xh3smfTd.woff2": {
    "type": "font/woff2",
    "etag": "\"10424-yX4XUn7UR70gn2EEdLeGCrjHXLU\"",
    "mtime": "2025-02-03T06:36:23.213Z",
    "size": 66596,
    "path": "../public/_nuxt/85905e20c4c0e291ab4114022e9fb151.xh3smfTd.woff2"
  },
  "/_nuxt/8abc54fbeec4061e16d353b36f6433f9.CDMFabJO.woff2": {
    "type": "font/woff2",
    "etag": "\"ec08-gHOKxG/9fO5OkmaBSzU2C+31Tz4\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 60424,
    "path": "../public/_nuxt/8abc54fbeec4061e16d353b36f6433f9.CDMFabJO.woff2"
  },
  "/_nuxt/8bb0f11ca49cb173e00550220c8cfec3.5fyhPwFU.woff2": {
    "type": "font/woff2",
    "etag": "\"10898-RAu6MpiLrpTYpHevUJs3BSacgfU\"",
    "mtime": "2025-02-03T06:36:23.219Z",
    "size": 67736,
    "path": "../public/_nuxt/8bb0f11ca49cb173e00550220c8cfec3.5fyhPwFU.woff2"
  },
  "/_nuxt/8e031fa2b44a3df42888009f0921a106.BVCdby7d.woff2": {
    "type": "font/woff2",
    "etag": "\"10914-a0pclYiCTpnitEeyip5OhgwfjJM\"",
    "mtime": "2025-02-03T06:36:23.213Z",
    "size": 67860,
    "path": "../public/_nuxt/8e031fa2b44a3df42888009f0921a106.BVCdby7d.woff2"
  },
  "/_nuxt/8f5324794373d67408959d2f1a1deefa.Bd1Q-xFa.woff2": {
    "type": "font/woff2",
    "etag": "\"10ce0-tdB0vgDTjj8poUfOhk/NyL2zjgw\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 68832,
    "path": "../public/_nuxt/8f5324794373d67408959d2f1a1deefa.Bd1Q-xFa.woff2"
  },
  "/_nuxt/913f8aeb518ef93aba57bfc1b48cbef9.CxbN1W2L.woff2": {
    "type": "font/woff2",
    "etag": "\"10e00-tK+MFr5UDwbys1ak08GpSC0+4no\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 69120,
    "path": "../public/_nuxt/913f8aeb518ef93aba57bfc1b48cbef9.CxbN1W2L.woff2"
  },
  "/_nuxt/919e2ea7286cfe6aa0bdca248b495587.BCB7Y4iQ.woff2": {
    "type": "font/woff2",
    "etag": "\"3334-Lvqsgk7n5242A9nMznu3geP5QqY\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 13108,
    "path": "../public/_nuxt/919e2ea7286cfe6aa0bdca248b495587.BCB7Y4iQ.woff2"
  },
  "/_nuxt/931c553ff60ac2ab730f9c712fd1b7e8.GryANivV.woff2": {
    "type": "font/woff2",
    "etag": "\"108ac-25vhpTNC8zyqARBofgr4jsRuBM0\"",
    "mtime": "2025-02-03T06:36:23.218Z",
    "size": 67756,
    "path": "../public/_nuxt/931c553ff60ac2ab730f9c712fd1b7e8.GryANivV.woff2"
  },
  "/_nuxt/973230a2d36c1b70802738e835b8d805.BBmMLQg-.woff2": {
    "type": "font/woff2",
    "etag": "\"10404-dtc4z6NXSZCuJCD0rdPSkwNozW4\"",
    "mtime": "2025-02-03T06:36:23.203Z",
    "size": 66564,
    "path": "../public/_nuxt/973230a2d36c1b70802738e835b8d805.BBmMLQg-.woff2"
  },
  "/_nuxt/97a071777e9d1fa74002b4d0c0efd748.bpEI7fR8.woff2": {
    "type": "font/woff2",
    "etag": "\"100bc-hT+zJckPRk0Oqy3HpYwc1tJEaEE\"",
    "mtime": "2025-02-03T06:36:23.198Z",
    "size": 65724,
    "path": "../public/_nuxt/97a071777e9d1fa74002b4d0c0efd748.bpEI7fR8.woff2"
  },
  "/_nuxt/992ff0a84e000e66f9e1f8183e39c2c2.B7rVhLJ1.woff2": {
    "type": "font/woff2",
    "etag": "\"f96c-516xmSCed+58xlMm6pY6GXNyxKs\"",
    "mtime": "2025-02-03T06:36:23.179Z",
    "size": 63852,
    "path": "../public/_nuxt/992ff0a84e000e66f9e1f8183e39c2c2.B7rVhLJ1.woff2"
  },
  "/_nuxt/99b6b6fd6e3f0e28e92371faf51e4a9f.DC1brXvn.woff2": {
    "type": "font/woff2",
    "etag": "\"3ab8-p6SIuyLPTXvvrp5KGUZ6IYis64g\"",
    "mtime": "2025-02-03T06:36:23.227Z",
    "size": 15032,
    "path": "../public/_nuxt/99b6b6fd6e3f0e28e92371faf51e4a9f.DC1brXvn.woff2"
  },
  "/_nuxt/99dbfcd133ab2ecc8e8321e30ced194b.D9H2-Aue.woff2": {
    "type": "font/woff2",
    "etag": "\"1011c-sibkJFk8zq8oKqx4Ll+E+PTeHNg\"",
    "mtime": "2025-02-03T06:36:23.184Z",
    "size": 65820,
    "path": "../public/_nuxt/99dbfcd133ab2ecc8e8321e30ced194b.D9H2-Aue.woff2"
  },
  "/_nuxt/9a552af2231d93fe9602a687fbee5283.Bxh5c0Fv.woff2": {
    "type": "font/woff2",
    "etag": "\"fed8-+U0iSzO5+8LoT13TBEbhE4l0lsQ\"",
    "mtime": "2025-02-03T06:36:23.194Z",
    "size": 65240,
    "path": "../public/_nuxt/9a552af2231d93fe9602a687fbee5283.Bxh5c0Fv.woff2"
  },
  "/_nuxt/9ba0f810ca87591a1e9452cc3f8db743.BKQF8kah.woff2": {
    "type": "font/woff2",
    "etag": "\"10c28-MHINj8Z6ar+7Cl8Hysikhhoh74c\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 68648,
    "path": "../public/_nuxt/9ba0f810ca87591a1e9452cc3f8db743.BKQF8kah.woff2"
  },
  "/_nuxt/9ba3cc9d48fe1566c82ac9cbd3d83529.CyTx4dst.woff2": {
    "type": "font/woff2",
    "etag": "\"12848-l/YOSUXMzsEBmSDeFsCjDiBRnPs\"",
    "mtime": "2025-02-03T06:36:23.204Z",
    "size": 75848,
    "path": "../public/_nuxt/9ba3cc9d48fe1566c82ac9cbd3d83529.CyTx4dst.woff2"
  },
  "/_nuxt/9df6bae8552cf3cae3b08e08d44fb2da.CMvhyOpI.woff2": {
    "type": "font/woff2",
    "etag": "\"10474-59SsYaj576nSdzSxRHtVb4btZXQ\"",
    "mtime": "2025-02-03T06:36:23.215Z",
    "size": 66676,
    "path": "../public/_nuxt/9df6bae8552cf3cae3b08e08d44fb2da.CMvhyOpI.woff2"
  },
  "/_nuxt/9e991598cd8ea89b03a3cdde4fac38e2.f0WxE4AN.woff2": {
    "type": "font/woff2",
    "etag": "\"4a08-uJwy2kU7hFF3F6gP69j2ItIwsFU\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 18952,
    "path": "../public/_nuxt/9e991598cd8ea89b03a3cdde4fac38e2.f0WxE4AN.woff2"
  },
  "/_nuxt/a05249353b081c72e1f0cce7b66f67c4.B6xNhTzg.woff2": {
    "type": "font/woff2",
    "etag": "\"10a28-uGjikTRtrqTTskrZJU9628p12SA\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 68136,
    "path": "../public/_nuxt/a05249353b081c72e1f0cce7b66f67c4.B6xNhTzg.woff2"
  },
  "/_nuxt/a0fff5797422aabe6bf53939e8967f8b.Ct73tGEb.woff2": {
    "type": "font/woff2",
    "etag": "\"107b0-CI6/hi8CqTOCOzwTBy1KE7HiraQ\"",
    "mtime": "2025-02-03T06:36:23.215Z",
    "size": 67504,
    "path": "../public/_nuxt/a0fff5797422aabe6bf53939e8967f8b.Ct73tGEb.woff2"
  },
  "/_nuxt/a4038c92675564ad8e01cb0fe2946ec7.g-NBaqeD.woff2": {
    "type": "font/woff2",
    "etag": "\"101b4-z/vHwqQPI+lWJcadgQb7LiQr6l4\"",
    "mtime": "2025-02-03T06:36:23.184Z",
    "size": 65972,
    "path": "../public/_nuxt/a4038c92675564ad8e01cb0fe2946ec7.g-NBaqeD.woff2"
  },
  "/_nuxt/a4edaa673c162ce19b31cb437c519ed9.BMQC7bKc.woff2": {
    "type": "font/woff2",
    "etag": "\"10b2c-PzMAs4P20TrVv9tZuHWMykNT8Dk\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 68396,
    "path": "../public/_nuxt/a4edaa673c162ce19b31cb437c519ed9.BMQC7bKc.woff2"
  },
  "/_nuxt/a525d11771e08ae1f1a1ee18d759f58c.BOalRjxN.woff2": {
    "type": "font/woff2",
    "etag": "\"10838-RvfRBC3iQVzOLwPHcnzyKPiknNg\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 67640,
    "path": "../public/_nuxt/a525d11771e08ae1f1a1ee18d759f58c.BOalRjxN.woff2"
  },
  "/_nuxt/a612eb81f0df3cc98a8a5dfeb83faf6a.w2D7r1OB.woff2": {
    "type": "font/woff2",
    "etag": "\"e4cc-59aC5b0vbj+nYGdu0cYL0LvEP3s\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 58572,
    "path": "../public/_nuxt/a612eb81f0df3cc98a8a5dfeb83faf6a.w2D7r1OB.woff2"
  },
  "/_nuxt/a63f1c6fe5034073c0eed7c28f6ca8fa.Cw62zI6_.woff2": {
    "type": "font/woff2",
    "etag": "\"10e98-EWEMcsCypvduy4wj7Wry2x9nQZY\"",
    "mtime": "2025-02-03T06:36:23.204Z",
    "size": 69272,
    "path": "../public/_nuxt/a63f1c6fe5034073c0eed7c28f6ca8fa.Cw62zI6_.woff2"
  },
  "/_nuxt/aa4ccac36d0cd15e172b6acb48815b6d.Dndua_32.woff2": {
    "type": "font/woff2",
    "etag": "\"10b3c-6ns+AgA+5tp8/+fq3YdOXbMLlno\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 68412,
    "path": "../public/_nuxt/aa4ccac36d0cd15e172b6acb48815b6d.Dndua_32.woff2"
  },
  "/_nuxt/ab41eb3d72c335b480d731e474d6cd1f.5OjLZwD5.woff2": {
    "type": "font/woff2",
    "etag": "\"fe20-GefGPYU0LJ8nceixnWfaB/rmbVc\"",
    "mtime": "2025-02-03T06:36:23.223Z",
    "size": 65056,
    "path": "../public/_nuxt/ab41eb3d72c335b480d731e474d6cd1f.5OjLZwD5.woff2"
  },
  "/_nuxt/ab7b28099c30038149430c3633497b17.DpIyDnlv.woff2": {
    "type": "font/woff2",
    "etag": "\"56cc-WdVvEHd83KVISchkQ06Ms8R3Nck\"",
    "mtime": "2025-02-03T06:36:23.208Z",
    "size": 22220,
    "path": "../public/_nuxt/ab7b28099c30038149430c3633497b17.DpIyDnlv.woff2"
  },
  "/_nuxt/ab9b95ff40fa85e62611f60a5862d450.DqxTRl2N.woff2": {
    "type": "font/woff2",
    "etag": "\"b53c-ApeG8fnMlW0veYroaHS4e3rUTw8\"",
    "mtime": "2025-02-03T06:36:23.211Z",
    "size": 46396,
    "path": "../public/_nuxt/ab9b95ff40fa85e62611f60a5862d450.DqxTRl2N.woff2"
  },
  "/_nuxt/ac0502fbe3dc5eb8c391e679dc90959f.DRH1sbv1.woff2": {
    "type": "font/woff2",
    "etag": "\"10f9c-zOI3MYXtCUcuuqAWyskmu5oaKMA\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 69532,
    "path": "../public/_nuxt/ac0502fbe3dc5eb8c391e679dc90959f.DRH1sbv1.woff2"
  },
  "/_nuxt/aef604bf4bb7b19cf75c384929d3d5e0.BEp9bMJZ.woff2": {
    "type": "font/woff2",
    "etag": "\"d608-wdt6flxPNuHIGanPU2qhZDLWCMg\"",
    "mtime": "2025-02-03T06:36:23.208Z",
    "size": 54792,
    "path": "../public/_nuxt/aef604bf4bb7b19cf75c384929d3d5e0.BEp9bMJZ.woff2"
  },
  "/_nuxt/af7c04653904f8419e1d8a1b6e2fdb81.B5QWkAsc.woff2": {
    "type": "font/woff2",
    "etag": "\"d2a0-TKw52aa0wbzvrFRg0EnUugjuosA\"",
    "mtime": "2025-02-03T06:36:23.192Z",
    "size": 53920,
    "path": "../public/_nuxt/af7c04653904f8419e1d8a1b6e2fdb81.B5QWkAsc.woff2"
  },
  "/_nuxt/B-d6VWha.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d9e9-JelHJs7o+JufKNlnVif9TVeWv20\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 252393,
    "path": "../public/_nuxt/B-d6VWha.js"
  },
  "/_nuxt/b05b51643955b8edbe35bd318e78f4ed.BwOehWk3.woff2": {
    "type": "font/woff2",
    "etag": "\"f2cc-L894SfZPZqMfz7lgBfHn6gERfTQ\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 62156,
    "path": "../public/_nuxt/b05b51643955b8edbe35bd318e78f4ed.BwOehWk3.woff2"
  },
  "/_nuxt/b0663a52d24a4eefaf958ff042a9240c.BeoIcby5.woff2": {
    "type": "font/woff2",
    "etag": "\"e3ac-JkQ2Bb+Q5AEEoCTFCHtqtEiA/ng\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 58284,
    "path": "../public/_nuxt/b0663a52d24a4eefaf958ff042a9240c.BeoIcby5.woff2"
  },
  "/_nuxt/b0987b051e0b081af5764d1640d8d1b5.DANFRLDo.woff2": {
    "type": "font/woff2",
    "etag": "\"fc64-N6+SmtD7QlZZZ78n6T65SrNpLt0\"",
    "mtime": "2025-02-03T06:36:23.190Z",
    "size": 64612,
    "path": "../public/_nuxt/b0987b051e0b081af5764d1640d8d1b5.DANFRLDo.woff2"
  },
  "/_nuxt/b262ecb6fa922bb9ad9d62645deda510.BDcAHmXV.woff2": {
    "type": "font/woff2",
    "etag": "\"7784-WetokItG+KLtvW+7qisu2GGFcVU\"",
    "mtime": "2025-02-03T06:36:23.211Z",
    "size": 30596,
    "path": "../public/_nuxt/b262ecb6fa922bb9ad9d62645deda510.BDcAHmXV.woff2"
  },
  "/_nuxt/b2891e53f92ba248f463a0b2522d2a80.C5ixFegY.woff2": {
    "type": "font/woff2",
    "etag": "\"f438-mTpvDlHl+7sbOiFKDWjtL1Ej1jc\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 62520,
    "path": "../public/_nuxt/b2891e53f92ba248f463a0b2522d2a80.C5ixFegY.woff2"
  },
  "/_nuxt/b2a3ef16c76d0d70385632f137f7937c.DOp8gczZ.woff2": {
    "type": "font/woff2",
    "etag": "\"f010-s2mEyjCLtmks1spMQ7wS2KgVPDE\"",
    "mtime": "2025-02-03T06:36:23.225Z",
    "size": 61456,
    "path": "../public/_nuxt/b2a3ef16c76d0d70385632f137f7937c.DOp8gczZ.woff2"
  },
  "/_nuxt/b2cf2aff85366dc6ef376123bb843fcc.Cbstq73X.woff2": {
    "type": "font/woff2",
    "etag": "\"41b8-+g+U0fHtVVLZpQgmwSVHtwci2Jc\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 16824,
    "path": "../public/_nuxt/b2cf2aff85366dc6ef376123bb843fcc.Cbstq73X.woff2"
  },
  "/_nuxt/b373fe57f2a123014ae6abb877bfc042.BsA1bpFs.woff2": {
    "type": "font/woff2",
    "etag": "\"10b10-zFUDN8cPZkgD6pqvx+fstHX5A4E\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 68368,
    "path": "../public/_nuxt/b373fe57f2a123014ae6abb877bfc042.BsA1bpFs.woff2"
  },
  "/_nuxt/b45d60bddb1422666b047c10aea8cab6.D--H6Hii.woff2": {
    "type": "font/woff2",
    "etag": "\"1039c-Gl4uKXHut4MvNh9KfhQeLnujasQ\"",
    "mtime": "2025-02-03T06:36:23.175Z",
    "size": 66460,
    "path": "../public/_nuxt/b45d60bddb1422666b047c10aea8cab6.D--H6Hii.woff2"
  },
  "/_nuxt/b46ae7eaf7c3345209e1572d44f24715.CXH7kENC.woff2": {
    "type": "font/woff2",
    "etag": "\"1bb8-ebWoL8hjW7b1y6rCBYWbTCx3EaU\"",
    "mtime": "2025-02-03T06:36:23.232Z",
    "size": 7096,
    "path": "../public/_nuxt/b46ae7eaf7c3345209e1572d44f24715.CXH7kENC.woff2"
  },
  "/_nuxt/b502bcff4431c3b92dde71c4e65c02cd.9NZjYdkn.woff2": {
    "type": "font/woff2",
    "etag": "\"e1b0-hLGzrHnzZj1TCrNonV2QYra0z4w\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 57776,
    "path": "../public/_nuxt/b502bcff4431c3b92dde71c4e65c02cd.9NZjYdkn.woff2"
  },
  "/_nuxt/b665a9a11dcee1cea406dbd212a9df67.BVPjpgh1.woff2": {
    "type": "font/woff2",
    "etag": "\"e4c8-W/JaQvJddIlfxAXdCrrfX8MkdBM\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 58568,
    "path": "../public/_nuxt/b665a9a11dcee1cea406dbd212a9df67.BVPjpgh1.woff2"
  },
  "/_nuxt/bbb4362799c7bc7ec834596bf4d6ab4c.DpS1xHo8.woff2": {
    "type": "font/woff2",
    "etag": "\"10320-xHCtMrUH6o6pcPWyN0qAyOt045o\"",
    "mtime": "2025-02-03T06:36:23.213Z",
    "size": 66336,
    "path": "../public/_nuxt/bbb4362799c7bc7ec834596bf4d6ab4c.DpS1xHo8.woff2"
  },
  "/_nuxt/bd83d1be8b7a390ad06c324e2bc54110.BlahsDN7.woff2": {
    "type": "font/woff2",
    "etag": "\"102d4-IEz4aGYr1Rk3JtNBef5w/QqZMOs\"",
    "mtime": "2025-02-03T06:36:23.215Z",
    "size": 66260,
    "path": "../public/_nuxt/bd83d1be8b7a390ad06c324e2bc54110.BlahsDN7.woff2"
  },
  "/_nuxt/bf9ab2484c978ed999d7dcd707e9dbab.DlUhJI_s.woff2": {
    "type": "font/woff2",
    "etag": "\"fdc0-0OXizrMdT5sspVzdA/mr4YIuoqU\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 64960,
    "path": "../public/_nuxt/bf9ab2484c978ed999d7dcd707e9dbab.DlUhJI_s.woff2"
  },
  "/_nuxt/BMgcE3EL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ca6-Y2YBgyUHORawixgFQlExSEAkC2Q\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 7334,
    "path": "../public/_nuxt/BMgcE3EL.js"
  },
  "/_nuxt/BqHsLyaQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a4f-1t8124b0xjsUUtaLRYWqzxaP9Nk\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 2639,
    "path": "../public/_nuxt/BqHsLyaQ.js"
  },
  "/_nuxt/c0d244ec70688c7f02c593d401ef3388.B_E0YAtF.woff2": {
    "type": "font/woff2",
    "etag": "\"e4d0-rhSanoRphbmuODJwqcdRamEIcNg\"",
    "mtime": "2025-02-03T06:36:23.228Z",
    "size": 58576,
    "path": "../public/_nuxt/c0d244ec70688c7f02c593d401ef3388.B_E0YAtF.woff2"
  },
  "/_nuxt/c0d8a4bc07f4c4dc783390c33ca505eb.C7aj9mnI.woff2": {
    "type": "font/woff2",
    "etag": "\"ff30-NUWiIFOVZEhyPcRc0DOA1gIJhmU\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 65328,
    "path": "../public/_nuxt/c0d8a4bc07f4c4dc783390c33ca505eb.C7aj9mnI.woff2"
  },
  "/_nuxt/c20918a6ba176a42ceb9ecfbaa6be118.BaGr9Xzy.woff2": {
    "type": "font/woff2",
    "etag": "\"effc-Sq3nueqOLvy/PkgXqlEwTUx2yaA\"",
    "mtime": "2025-02-03T06:36:23.177Z",
    "size": 61436,
    "path": "../public/_nuxt/c20918a6ba176a42ceb9ecfbaa6be118.BaGr9Xzy.woff2"
  },
  "/_nuxt/c43246d44c5b5c1bfb9f0b72a17031db.kL2-JJ8b.woff2": {
    "type": "font/woff2",
    "etag": "\"fb34-mBTQ2y6Kl+cM2eBtY61L0XQ3GSM\"",
    "mtime": "2025-02-03T06:36:23.200Z",
    "size": 64308,
    "path": "../public/_nuxt/c43246d44c5b5c1bfb9f0b72a17031db.kL2-JJ8b.woff2"
  },
  "/_nuxt/c4ce86d6dddfdd702b6b37decae90f59.CR66z4_q.woff2": {
    "type": "font/woff2",
    "etag": "\"e8b0-fkKquGzQs3YgujHMpH6OXThhgmU\"",
    "mtime": "2025-02-03T06:36:23.227Z",
    "size": 59568,
    "path": "../public/_nuxt/c4ce86d6dddfdd702b6b37decae90f59.CR66z4_q.woff2"
  },
  "/_nuxt/c6f2dfad5fa5f2416935fda6c4c92c66.C7HUEa0Q.woff2": {
    "type": "font/woff2",
    "etag": "\"113a0-ZxKHqQT/24QXcAxLT+Z/gWEzkHE\"",
    "mtime": "2025-02-03T06:36:23.204Z",
    "size": 70560,
    "path": "../public/_nuxt/c6f2dfad5fa5f2416935fda6c4c92c66.C7HUEa0Q.woff2"
  },
  "/_nuxt/c7149a980ee8b2ea9a5c71d0729fec67.oqZigq9-.woff2": {
    "type": "font/woff2",
    "etag": "\"100c4-QyPkoaXEHL8KRi4EX7BUQysTjaM\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 65732,
    "path": "../public/_nuxt/c7149a980ee8b2ea9a5c71d0729fec67.oqZigq9-.woff2"
  },
  "/_nuxt/c761a6a421e601dd243ca159e1f5a186.D3x_qQy1.woff2": {
    "type": "font/woff2",
    "etag": "\"10c9c-LMLaA1p4QyVFT2c8yoFx5OUGi2U\"",
    "mtime": "2025-02-03T06:36:23.197Z",
    "size": 68764,
    "path": "../public/_nuxt/c761a6a421e601dd243ca159e1f5a186.D3x_qQy1.woff2"
  },
  "/_nuxt/c7dc6ca9168cbd20d5c7b1c108ae4dd8.DJ2eH02i.woff2": {
    "type": "font/woff2",
    "etag": "\"dfc8-IY6a67OleQj55kI18xXBsvJoYMo\"",
    "mtime": "2025-02-03T06:36:23.228Z",
    "size": 57288,
    "path": "../public/_nuxt/c7dc6ca9168cbd20d5c7b1c108ae4dd8.DJ2eH02i.woff2"
  },
  "/_nuxt/c8685ee277575b38069d2d0edd1a24c6.CM_v2PD4.woff2": {
    "type": "font/woff2",
    "etag": "\"d3bc-7UQNJDE82/5a5m9jgb6QLa/rdbw\"",
    "mtime": "2025-02-03T06:36:23.225Z",
    "size": 54204,
    "path": "../public/_nuxt/c8685ee277575b38069d2d0edd1a24c6.CM_v2PD4.woff2"
  },
  "/_nuxt/ca7a1beabf7e8f96bbc8088c6df18773.PHHWYTNe.woff2": {
    "type": "font/woff2",
    "etag": "\"118d0-sr9165P3Bf9JlEsEKbeZjCCj5rc\"",
    "mtime": "2025-02-03T06:36:23.198Z",
    "size": 71888,
    "path": "../public/_nuxt/ca7a1beabf7e8f96bbc8088c6df18773.PHHWYTNe.woff2"
  },
  "/_nuxt/cbbe9b3870e9d4a1cdcbbf5bd516662c.CgxBCKcX.woff2": {
    "type": "font/woff2",
    "etag": "\"10834-4CIkw3xIbTfu+EaF/0+k/YmVB5Q\"",
    "mtime": "2025-02-03T06:36:23.220Z",
    "size": 67636,
    "path": "../public/_nuxt/cbbe9b3870e9d4a1cdcbbf5bd516662c.CgxBCKcX.woff2"
  },
  "/_nuxt/cdacc38b7b2fed5b640bbadbe91dba67.CFtBLz9_.woff2": {
    "type": "font/woff2",
    "etag": "\"edf0-2C4AK+Dof4VvEd5DwT4Xc2z1OYk\"",
    "mtime": "2025-02-03T06:36:23.192Z",
    "size": 60912,
    "path": "../public/_nuxt/cdacc38b7b2fed5b640bbadbe91dba67.CFtBLz9_.woff2"
  },
  "/_nuxt/cebd0ae142a2002ca9d87ff04198d24a.DXlfq3ag.woff2": {
    "type": "font/woff2",
    "etag": "\"28c0-vz//3lMiwtK9/V64xX7/H164ZTI\"",
    "mtime": "2025-02-03T06:36:23.232Z",
    "size": 10432,
    "path": "../public/_nuxt/cebd0ae142a2002ca9d87ff04198d24a.DXlfq3ag.woff2"
  },
  "/_nuxt/CkC02aX9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"405a2-5QUu24jbJzdP+IZq6Dzp1CU/Niw\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 263586,
    "path": "../public/_nuxt/CkC02aX9.js"
  },
  "/_nuxt/d0d841e71cb2e9caa2842c6615fdbb50.CE17xkt6.woff2": {
    "type": "font/woff2",
    "etag": "\"af00-8GnKRa3AM+t+848j1ERAagUMq8A\"",
    "mtime": "2025-02-03T06:36:23.228Z",
    "size": 44800,
    "path": "../public/_nuxt/d0d841e71cb2e9caa2842c6615fdbb50.CE17xkt6.woff2"
  },
  "/_nuxt/d11b4fe50e6d1769287fb4c5033905da.B1bFynY_.woff2": {
    "type": "font/woff2",
    "etag": "\"113d0-Ds/ZeNICSc7BYkhOBGjgvtYC0P4\"",
    "mtime": "2025-02-03T06:36:23.199Z",
    "size": 70608,
    "path": "../public/_nuxt/d11b4fe50e6d1769287fb4c5033905da.B1bFynY_.woff2"
  },
  "/_nuxt/d1b47853c1fb39b73350431e078eeb11.Bgp_kxuL.woff2": {
    "type": "font/woff2",
    "etag": "\"b028-84t6EVe34Z2761o2OLI9ovVbbLg\"",
    "mtime": "2025-02-03T06:36:23.208Z",
    "size": 45096,
    "path": "../public/_nuxt/d1b47853c1fb39b73350431e078eeb11.Bgp_kxuL.woff2"
  },
  "/_nuxt/d200dc6577335821562ab03779402907.DcoL8nEf.woff2": {
    "type": "font/woff2",
    "etag": "\"40f0-vDevltIjVidCM0/LOEWGLgExa00\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 16624,
    "path": "../public/_nuxt/d200dc6577335821562ab03779402907.DcoL8nEf.woff2"
  },
  "/_nuxt/d299cbba2de9b55096424ee88ae8a3e2.Cm0N9vQN.woff2": {
    "type": "font/woff2",
    "etag": "\"11eb0-Ywq/Ko24HIEhjHwZiXWdc/TKKhM\"",
    "mtime": "2025-02-03T06:36:23.203Z",
    "size": 73392,
    "path": "../public/_nuxt/d299cbba2de9b55096424ee88ae8a3e2.Cm0N9vQN.woff2"
  },
  "/_nuxt/d4840aa20b0bc55b5f4036ad1b6e67ac.CP5MGKki.woff2": {
    "type": "font/woff2",
    "etag": "\"10b10-FbmBKKMggm4/V5a7Zi9JEZYpJOw\"",
    "mtime": "2025-02-03T06:36:23.218Z",
    "size": 68368,
    "path": "../public/_nuxt/d4840aa20b0bc55b5f4036ad1b6e67ac.CP5MGKki.woff2"
  },
  "/_nuxt/d49a94e0e3513234413be41f97059448.C2lbgDTI.woff2": {
    "type": "font/woff2",
    "etag": "\"f6a0-DEqbNXVqe66kt6FKQ7BZffkm+1g\"",
    "mtime": "2025-02-03T06:36:23.182Z",
    "size": 63136,
    "path": "../public/_nuxt/d49a94e0e3513234413be41f97059448.C2lbgDTI.woff2"
  },
  "/_nuxt/d716d69ccb7d185be6502d57bbd23a83.Dg6QHx4P.woff2": {
    "type": "font/woff2",
    "etag": "\"f5b0-y7VJyTrdpxwwI93DMAO/M7VUk4U\"",
    "mtime": "2025-02-03T06:36:23.169Z",
    "size": 62896,
    "path": "../public/_nuxt/d716d69ccb7d185be6502d57bbd23a83.Dg6QHx4P.woff2"
  },
  "/_nuxt/d854b991110b1eb11973e2a83c75a73c.Bxc0XBBH.woff2": {
    "type": "font/woff2",
    "etag": "\"faac-/GEWMj9sxn7mDFcwsCgh8zj2L9k\"",
    "mtime": "2025-02-03T06:36:23.193Z",
    "size": 64172,
    "path": "../public/_nuxt/d854b991110b1eb11973e2a83c75a73c.Bxc0XBBH.woff2"
  },
  "/_nuxt/dd8c2789d6a4d789a1281b3e738aee92.B5NYj-DF.woff2": {
    "type": "font/woff2",
    "etag": "\"11b1c-ze8jCjVLrA9bhNZDmy11WuiUUHY\"",
    "mtime": "2025-02-03T06:36:23.204Z",
    "size": 72476,
    "path": "../public/_nuxt/dd8c2789d6a4d789a1281b3e738aee92.B5NYj-DF.woff2"
  },
  "/_nuxt/ddc4490bce7e5735603be38a61065aa8.BC_TjT69.woff2": {
    "type": "font/woff2",
    "etag": "\"10934-Ex2UEFduLrcaDdpwyR6/U87yAh4\"",
    "mtime": "2025-02-03T06:36:23.223Z",
    "size": 67892,
    "path": "../public/_nuxt/ddc4490bce7e5735603be38a61065aa8.BC_TjT69.woff2"
  },
  "/_nuxt/de59581509a3f2871d08b351183d1b77.BJWGGxWt.woff2": {
    "type": "font/woff2",
    "etag": "\"10078-M9hbxLHEEljVrp1ch+suBhoXr+Y\"",
    "mtime": "2025-02-03T06:36:23.203Z",
    "size": 65656,
    "path": "../public/_nuxt/de59581509a3f2871d08b351183d1b77.BJWGGxWt.woff2"
  },
  "/_nuxt/e017704faf03247e988bd13b3f3cde6a.Da0YFSY8.woff2": {
    "type": "font/woff2",
    "etag": "\"de50-6xhPPr5PoytPUuU07WWf845Cz4E\"",
    "mtime": "2025-02-03T06:36:23.229Z",
    "size": 56912,
    "path": "../public/_nuxt/e017704faf03247e988bd13b3f3cde6a.Da0YFSY8.woff2"
  },
  "/_nuxt/e09026b1798784e0531b76970e0ba4aa.DNHBAvOu.woff2": {
    "type": "font/woff2",
    "etag": "\"f8d4-8stwx6nHAI/08xcRnGNUVytI6w0\"",
    "mtime": "2025-02-03T06:36:23.200Z",
    "size": 63700,
    "path": "../public/_nuxt/e09026b1798784e0531b76970e0ba4aa.DNHBAvOu.woff2"
  },
  "/_nuxt/e136e954ddf7333c2f97833bc28ab021.tQuT8fkp.woff2": {
    "type": "font/woff2",
    "etag": "\"11510-YoAeVlM0cC4cpWewKCCF8M5lnIc\"",
    "mtime": "2025-02-03T06:36:23.207Z",
    "size": 70928,
    "path": "../public/_nuxt/e136e954ddf7333c2f97833bc28ab021.tQuT8fkp.woff2"
  },
  "/_nuxt/e192e94088c6ef76817b7de20f6e5c1e.UJBhXk-o.woff2": {
    "type": "font/woff2",
    "etag": "\"104b8-/MitwPTlKgvKFRuOmXq4eDs9OOI\"",
    "mtime": "2025-02-03T06:36:23.211Z",
    "size": 66744,
    "path": "../public/_nuxt/e192e94088c6ef76817b7de20f6e5c1e.UJBhXk-o.woff2"
  },
  "/_nuxt/e33e7a0304a685e4227fe5a254d6e146.C4Sz3l9-.woff2": {
    "type": "font/woff2",
    "etag": "\"10890-mr9YlHQSNRC95gWY8BxNRxPfn+I\"",
    "mtime": "2025-02-03T06:36:23.216Z",
    "size": 67728,
    "path": "../public/_nuxt/e33e7a0304a685e4227fe5a254d6e146.C4Sz3l9-.woff2"
  },
  "/_nuxt/e403b4de781eab0c35519635df07fdb0.CvsTTXU5.woff2": {
    "type": "font/woff2",
    "etag": "\"e30c-ZBJ/6HmHcM3W6+3khwwB0eL4tyM\"",
    "mtime": "2025-02-03T06:36:23.226Z",
    "size": 58124,
    "path": "../public/_nuxt/e403b4de781eab0c35519635df07fdb0.CvsTTXU5.woff2"
  },
  "/_nuxt/e5d57b10e6f559640f7e43d7ccbd4eb9.C00BX3Fd.woff2": {
    "type": "font/woff2",
    "etag": "\"d77c-jVWkssedHKhM3rsM6woohTqqMvM\"",
    "mtime": "2025-02-03T06:36:23.231Z",
    "size": 55164,
    "path": "../public/_nuxt/e5d57b10e6f559640f7e43d7ccbd4eb9.C00BX3Fd.woff2"
  },
  "/_nuxt/e94a62517eb978b6ea09441d164b6863.D2Wju-gm.woff2": {
    "type": "font/woff2",
    "etag": "\"fb60-kdPzkYkW5U3ax+DPZnnHF/g7s+o\"",
    "mtime": "2025-02-03T06:36:23.192Z",
    "size": 64352,
    "path": "../public/_nuxt/e94a62517eb978b6ea09441d164b6863.D2Wju-gm.woff2"
  },
  "/_nuxt/eaa697a359f4b834e94dfde0725aadf5.Cxv5jDE7.woff2": {
    "type": "font/woff2",
    "etag": "\"e12c-i2d3DuN+Zm1dN/xnNfdIlgiJfUo\"",
    "mtime": "2025-02-03T06:36:23.224Z",
    "size": 57644,
    "path": "../public/_nuxt/eaa697a359f4b834e94dfde0725aadf5.Cxv5jDE7.woff2"
  },
  "/_nuxt/ec5a6f2ea140dff3810fcf96cd28efc1.BdXuL_tW.woff2": {
    "type": "font/woff2",
    "etag": "\"f3e4-qorSSwLw36AAnZsxbVf5kun77iU\"",
    "mtime": "2025-02-03T06:36:23.177Z",
    "size": 62436,
    "path": "../public/_nuxt/ec5a6f2ea140dff3810fcf96cd28efc1.BdXuL_tW.woff2"
  },
  "/_nuxt/ecb309951c409d5c871cafe16e1d563b.DQBoH8xt.woff2": {
    "type": "font/woff2",
    "etag": "\"e380-Qf8341Sdffkv/JykqGHX3xISeSc\"",
    "mtime": "2025-02-03T06:36:23.163Z",
    "size": 58240,
    "path": "../public/_nuxt/ecb309951c409d5c871cafe16e1d563b.DQBoH8xt.woff2"
  },
  "/_nuxt/edb8c90c1fa92e7a688a06db02bb9cb6.CCYfZY10.woff2": {
    "type": "font/woff2",
    "etag": "\"a548-zu4DsKT8bNEB5IfDLVBr7gZTXYM\"",
    "mtime": "2025-02-03T06:36:23.208Z",
    "size": 42312,
    "path": "../public/_nuxt/edb8c90c1fa92e7a688a06db02bb9cb6.CCYfZY10.woff2"
  },
  "/_nuxt/ee7d08ffda98843d5d50ca7fd9c55027.D0OgfjOI.woff2": {
    "type": "font/woff2",
    "etag": "\"fb30-AIsjejRI6HfrAHjb+xatQRV/218\"",
    "mtime": "2025-02-03T06:36:23.186Z",
    "size": 64304,
    "path": "../public/_nuxt/ee7d08ffda98843d5d50ca7fd9c55027.D0OgfjOI.woff2"
  },
  "/_nuxt/f02ec29820bf6f00d7edbe003d61e1b8.C-7EcffT.woff2": {
    "type": "font/woff2",
    "etag": "\"4008-K0szOE6FTxpe6WwO7ninsPZbveU\"",
    "mtime": "2025-02-03T06:36:23.229Z",
    "size": 16392,
    "path": "../public/_nuxt/f02ec29820bf6f00d7edbe003d61e1b8.C-7EcffT.woff2"
  },
  "/_nuxt/f0d66e81a8cc6a6e74b7d46baf80a5c5.DFD-KmCq.woff2": {
    "type": "font/woff2",
    "etag": "\"4440-7FZnBinoMJEXyHyzcgyVPzIC6Bg\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 17472,
    "path": "../public/_nuxt/f0d66e81a8cc6a6e74b7d46baf80a5c5.DFD-KmCq.woff2"
  },
  "/_nuxt/f243aac1d7a0d9a1670e693d5ae02f93.Bqlx6T-b.woff2": {
    "type": "font/woff2",
    "etag": "\"f750-ZFbB6QTuwWaAHwMDcQW4esRoClg\"",
    "mtime": "2025-02-03T06:36:23.172Z",
    "size": 63312,
    "path": "../public/_nuxt/f243aac1d7a0d9a1670e693d5ae02f93.Bqlx6T-b.woff2"
  },
  "/_nuxt/f251e23d85a42372eb9eeec6feb265e9.0gZZ4FuY.woff2": {
    "type": "font/woff2",
    "etag": "\"10930-6D0Wxgnb6Acc2pWVwAIMZRb8grM\"",
    "mtime": "2025-02-03T06:36:23.213Z",
    "size": 67888,
    "path": "../public/_nuxt/f251e23d85a42372eb9eeec6feb265e9.0gZZ4FuY.woff2"
  },
  "/_nuxt/f343580e748755cf4ca1fb5e565f3c10.Dx8BZXLz.woff2": {
    "type": "font/woff2",
    "etag": "\"fccc-ZIzxB6B2kRvuIcjpr3+Gln2yQEQ\"",
    "mtime": "2025-02-03T06:36:23.168Z",
    "size": 64716,
    "path": "../public/_nuxt/f343580e748755cf4ca1fb5e565f3c10.Dx8BZXLz.woff2"
  },
  "/_nuxt/f46f8e1ac1f27066b34a15ae76184fd0.DmcOg6hH.woff2": {
    "type": "font/woff2",
    "etag": "\"e5a4-mTcobxH4FWdow4frJ4Y6yNcOmFU\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 58788,
    "path": "../public/_nuxt/f46f8e1ac1f27066b34a15ae76184fd0.DmcOg6hH.woff2"
  },
  "/_nuxt/f487203a628e17ab78df9e595f4ed162.CYwMseBy.woff2": {
    "type": "font/woff2",
    "etag": "\"10940-nnELMtHtzRJMoa4j7Hkmce08OUI\"",
    "mtime": "2025-02-03T06:36:23.179Z",
    "size": 67904,
    "path": "../public/_nuxt/f487203a628e17ab78df9e595f4ed162.CYwMseBy.woff2"
  },
  "/_nuxt/f5494e14cb1d43fd413fcccd6ace7dc1.DCQxqADS.woff2": {
    "type": "font/woff2",
    "etag": "\"109bc-GRbDfo2vuejKWhdSD3WUPBNZgNk\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 68028,
    "path": "../public/_nuxt/f5494e14cb1d43fd413fcccd6ace7dc1.DCQxqADS.woff2"
  },
  "/_nuxt/f5a1c9d26cd0f010975de2dc2db58f87.DDcp0yDd.woff2": {
    "type": "font/woff2",
    "etag": "\"476c-i0MTpHd2r4bCiYz3fIskFwYxkdE\"",
    "mtime": "2025-02-03T06:36:23.160Z",
    "size": 18284,
    "path": "../public/_nuxt/f5a1c9d26cd0f010975de2dc2db58f87.DDcp0yDd.woff2"
  },
  "/_nuxt/f5cbbb42fa97de1924f92fb597326f0c.DeFUwsdZ.woff2": {
    "type": "font/woff2",
    "etag": "\"102dc-1lt7pOfvFKfXRnqvpuGRL5E4xJg\"",
    "mtime": "2025-02-03T06:36:23.201Z",
    "size": 66268,
    "path": "../public/_nuxt/f5cbbb42fa97de1924f92fb597326f0c.DeFUwsdZ.woff2"
  },
  "/_nuxt/f6b8eaac641da20653f679837d0eca83.qw2tQqq6.woff2": {
    "type": "font/woff2",
    "etag": "\"f290-6+9M1MQrkpS6Fh8/fJzY0baoc34\"",
    "mtime": "2025-02-03T06:36:23.222Z",
    "size": 62096,
    "path": "../public/_nuxt/f6b8eaac641da20653f679837d0eca83.qw2tQqq6.woff2"
  },
  "/_nuxt/f6db8e11a87a552b7fb9908be69fb415.DY9Acwk5.woff2": {
    "type": "font/woff2",
    "etag": "\"fcc8-4EHiTKQ0IuoXIXhOqJfD8Pj1xkE\"",
    "mtime": "2025-02-03T06:36:23.176Z",
    "size": 64712,
    "path": "../public/_nuxt/f6db8e11a87a552b7fb9908be69fb415.DY9Acwk5.woff2"
  },
  "/_nuxt/f89db6c995bc4a4a3053e8abf71516a6.l810ztqA.woff2": {
    "type": "font/woff2",
    "etag": "\"f2e4-pxnK6Kju8DCTc2N7eI4k5sFVewc\"",
    "mtime": "2025-02-03T06:36:23.183Z",
    "size": 62180,
    "path": "../public/_nuxt/f89db6c995bc4a4a3053e8abf71516a6.l810ztqA.woff2"
  },
  "/_nuxt/fb16e59b4adc16093e89f989bc23d3ad.M3nnsPvg.woff2": {
    "type": "font/woff2",
    "etag": "\"117a0-E+oK8rBiEOri/SDwGpje2oeiLiY\"",
    "mtime": "2025-02-03T06:36:23.192Z",
    "size": 71584,
    "path": "../public/_nuxt/fb16e59b4adc16093e89f989bc23d3ad.M3nnsPvg.woff2"
  },
  "/_nuxt/fb3d0eb02a6e724156d2e7409895dee8.C5bAtehD.woff2": {
    "type": "font/woff2",
    "etag": "\"4be0-ntpF70CaJCNFpXBL/BvDmvAh7x8\"",
    "mtime": "2025-02-03T06:36:23.163Z",
    "size": 19424,
    "path": "../public/_nuxt/fb3d0eb02a6e724156d2e7409895dee8.C5bAtehD.woff2"
  },
  "/_nuxt/febca0265ee7fbe9b95d6e1e3f7ac35b.BAGDbBbH.woff2": {
    "type": "font/woff2",
    "etag": "\"6a1c-u7H9NojiaL3fpEGOJSR/SldMgwA\"",
    "mtime": "2025-02-03T06:36:23.232Z",
    "size": 27164,
    "path": "../public/_nuxt/febca0265ee7fbe9b95d6e1e3f7ac35b.BAGDbBbH.woff2"
  },
  "/_nuxt/feda0848903d3afd7187ade2c485be1b.COqgEwQy.woff2": {
    "type": "font/woff2",
    "etag": "\"eb68-6J4a0aYUEqEWSS5foZV8FkS99UU\"",
    "mtime": "2025-02-03T06:36:23.170Z",
    "size": 60264,
    "path": "../public/_nuxt/feda0848903d3afd7187ade2c485be1b.COqgEwQy.woff2"
  },
  "/_nuxt/index.B6M_7rlM.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"5ecf-adE+/YFO9qmHP78RIl6GP69klfg\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 24271,
    "path": "../public/_nuxt/index.B6M_7rlM.css"
  },
  "/_nuxt/M9rg3Bvf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"850-ddczEZF283NkzE//I8CMyHci3zY\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 2128,
    "path": "../public/_nuxt/M9rg3Bvf.js"
  },
  "/_nuxt/SZOcU6H1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"993e-eunhgRN+MO+YJXCuTEcTkFg+jvY\"",
    "mtime": "2025-02-03T06:36:23.235Z",
    "size": 39230,
    "path": "../public/_nuxt/SZOcU6H1.js"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-ejVJveE/er3MfxXm42m7qmRk6aI\"",
    "mtime": "2025-02-03T06:36:26.527Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/_nuxt/builds/meta/e83ae66c-2180-47fa-a7b8-f35824c230d5.json": {
    "type": "application/json",
    "etag": "\"8b-x067YwsjR86p/MU4uFs676sR+Mw\"",
    "mtime": "2025-02-03T06:36:26.528Z",
    "size": 139,
    "path": "../public/_nuxt/builds/meta/e83ae66c-2180-47fa-a7b8-f35824c230d5.json"
  }
};

const _DRIVE_LETTER_START_RE$1 = /^[A-Za-z]:\//;
function normalizeWindowsPath$1(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE$1, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath$1(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath$1(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets$1[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_fonts/":{"maxAge":31536000},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets$1[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets$1[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _115Txo = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({
        statusMessage: "Cannot find static asset " + id,
        statusCode: 404
      });
    }
    return;
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const basename = function(p, extension) {
  const lastSegment = normalizeWindowsPath(p).split("/").pop();
  return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};

const basicReporter = {
  log(logObj) {
    (console[logObj.type] || console.log)(...logObj.args);
  }
};
function createConsola(options = {}) {
  return createConsola$1({
    reporters: [basicReporter],
    ...options
  });
}
const consola = createConsola();
consola.consola = consola;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {},
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "dashicons",
      "devicon",
      "devicon-plain",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fad",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "logos",
      "ls",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "pixelarticons",
      "prime",
      "ps",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "si-glyph",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "streamline",
      "streamline-emojis",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  },
  "ui": {
    "primary": "green",
    "gray": "cool",
    "colors": [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "primary"
    ],
    "strategy": "merge"
  }
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return undefined;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = undefined;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === undefined) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /{{(.*?)}}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "e83ae66c-2180-47fa-a7b8-f35824c230d5",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_fonts/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "baseApi": "/api/v1"
  },
  "icon": {
    "serverKnownCssClasses": []
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
const _sharedAppConfig = _deepFreeze(klona(appConfig));
function useAppConfig(event) {
  {
    return _sharedAppConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return undefined;
  }
});

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "hasItem",
  "getItem",
  "getItemRaw",
  "setItem",
  "setItemRaw",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : undefined,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? undefined : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === undefined) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === undefined) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      for (const mount of mounts) {
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      return base ? allKeys.filter(
        (key) => key.startsWith(base) && key[key.length - 1] !== "$"
      ) : allKeys.filter((key) => key[key.length - 1] !== "$");
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        const dirFiles = await readdirRecursive(entryPath, ignore);
        files.push(...dirFiles.map((f) => entry.name + "/" + f));
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys() {
      return readdirRecursive(r("."), opts.ignore);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"C:\\Users\\LinSnow\\Desktop\\Project\\Tika\\Tika-Web\\.data\\kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== undefined);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[nitro] [cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[nitro] [cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== undefined && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = undefined;
          entry.integrity = undefined;
          entry.mtime = undefined;
          entry.expires = undefined;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[nitro] [cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === undefined) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[nitro] [cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : undefined
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args, {}) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === undefined) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== undefined) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(undefined);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== undefined) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== undefined) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: undefined };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== undefined) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === undefined) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = undefined;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = undefined;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : undefined;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

function baseURL() {
  return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
  return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
  const app = useRuntimeConfig().app;
  const publicBase = app.cdnURL || app.baseURL;
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

const collections = {
  'fluent': () => import('./icons.mjs').then(m => m.default),
  'fluent-emoji-flat': () => import('./icons2.mjs').then(m => m.default),
  'heroicons': () => import('./icons3.mjs').then(m => m.default),
  'line-md': () => import('./icons4.mjs').then(m => m.default),
  'unjs': () => import('./icons5.mjs').then(m => m.default),
};

const DEFAULT_ENDPOINT = "https://api.iconify.design";
const _EzhHi5 = defineCachedEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (!url)
    return createError$1({ status: 400, message: "Invalid icon request" });
  const options = useAppConfig().icon;
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint || DEFAULT_ENDPOINT;
  const icons = url.searchParams.get("icons")?.split(",");
  if (collection) {
    if (icons?.length) {
      const data = getIcons(
        collection,
        icons
      );
      consola.debug(`[Icon] serving ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
      return data;
    }
  }
  if (options.fallbackToApi === true || options.fallbackToApi === "server-only") {
    const apiUrl = new URL("./" + basename(url.pathname) + url.search, apiEndPoint);
    consola.debug(`[Icon] fetching ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const data = await $fetch(apiUrl.href);
      return data;
    } catch (e) {
      consola.error(e);
      if (e.status === 404)
        return createError$1({ status: 404 });
      else
        return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(getQuery(event).icons || "");
    return `${collection}_${icons.split(",")[0]}_${icons.length}_${hash(icons)}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const _lazy_p3hSG6 = () => import('../routes/renderer.mjs');

const handlers = [
  { route: '', handler: _115Txo, lazy: false, middleware: true, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_p3hSG6, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _EzhHi5, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_p3hSG6, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const localCall = createCall(toNodeListener(h3App));
  const _localFetch = createFetch(localCall, globalThis.fetch);
  const localFetch = (input, init) => _localFetch(input, init).then(
    (response) => normalizeFetchResponse(response)
  );
  const $fetch = createFetch$1({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  h3App.use(
    eventHandler((event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const envContext = event.node.req?.__unenv__;
      if (envContext) {
        Object.assign(event.context, envContext);
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (envContext?.waitUntil) {
          envContext.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
    })
  );
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp = createNitroApp();
function useNitroApp() {
  return nitroApp;
}
runNitroPlugins(nitroApp);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        destroy(socket);
      }
    }
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        destroy(socket);
      }
    }
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    if (options.development) {
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        return Promise.resolve(false);
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

export { $fetch$1 as $, isScriptProtocol as A, withQuery as B, sanitizeStatusCode as C, withTrailingSlash as D, withoutTrailingSlash as E, toRouteMatcher as F, createRouter$1 as G, trapUnhandledNodeErrors as a, useNitroApp as b, defineRenderHandler as c, destr as d, buildAssetsURL as e, createError$1 as f, getQuery as g, getRouteRules as h, getResponseStatus as i, getResponseStatusText as j, baseURL as k, defuFn as l, defu as m, parseQuery as n, klona as o, publicAssetsURL as p, createDefu as q, isEqual as r, setupGracefulShutdown as s, toNodeListener as t, useRuntimeConfig as u, createHooks as v, hasProtocol as w, joinURL as x, diff as y, getContext as z };
//# sourceMappingURL=nitro.mjs.map
