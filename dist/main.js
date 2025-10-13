'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sourceMapGenerator = {};

var base64Vlq = {};

var base64$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
base64$1.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
base64$1.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = base64$1;

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
base64Vlq.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

var util$5 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port;
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;
}(util$5));

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$4 = util$5;
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet$2() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet$2();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet$2.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet$2.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util$4.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util$4.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet$2.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

arraySet.ArraySet = ArraySet$2;

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$3 = util$5;

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList$1() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList$1.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList$1.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList$1.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util$3.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

mappingList.MappingList = MappingList$1;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ$1 = base64Vlq;
var util$2 = util$5;
var ArraySet$1 = arraySet.ArraySet;
var MappingList = mappingList.MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator$1(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util$2.getArg(aArgs, 'file', null);
  this._sourceRoot = util$2.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util$2.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet$1();
  this._names = new ArraySet$1();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator$1.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator$1.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator$1({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util$2.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util$2.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator$1.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util$2.getArg(aArgs, 'generated');
    var original = util$2.getArg(aArgs, 'original', null);
    var source = util$2.getArg(aArgs, 'source', null);
    var name = util$2.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator$1.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util$2.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util$2.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator$1.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util$2.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet$1();
    var newNames = new ArraySet$1();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util$2.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util$2.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util$2.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util$2.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator$1.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator$1.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = '';

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ$1.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ$1.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ$1.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ$1.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ$1.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator$1.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util$2.relative(aSourceRoot, source);
      }
      var key = util$2.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator$1.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator$1.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

sourceMapGenerator.SourceMapGenerator = SourceMapGenerator$1;

var sourceMapConsumer = {};

var binarySearch$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};
}(binarySearch$1));

var quickSort$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
quickSort$1.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$1 = util$5;
var binarySearch = binarySearch$1;
var ArraySet = arraySet.ArraySet;
var base64VLQ = base64Vlq;
var quickSort = quickSort$1.quickSort;

function SourceMapConsumer$1(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer$1.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
};

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer$1.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer$1.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer$1.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer$1.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer$1.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer$1.GENERATED_ORDER = 1;
SourceMapConsumer$1.ORIGINAL_ORDER = 2;

SourceMapConsumer$1.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer$1.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer$1.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer$1.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer$1.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer$1.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer$1.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util$1.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util$1.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util$1.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util$1.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

sourceMapConsumer.SourceMapConsumer = SourceMapConsumer$1;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sources = util$1.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util$1.getArg(sourceMap, 'names', []);
  var sourceRoot = util$1.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util$1.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util$1.getArg(sourceMap, 'mappings');
  var file = util$1.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util$1.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util$1.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source)
        ? util$1.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer$1;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util$1.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util$1.compareByGeneratedPositionsDeflated,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util$1.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util$1.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util$1.getArg(mapping, 'originalLine', null),
          column: util$1.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util$1.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util$1.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util$1.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util$1.getArg(aArgs, 'line'),
      originalColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util$1.compareByOriginalPositions,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util$1.getArg(mapping, 'generatedLine', null),
          column: util$1.getArg(mapping, 'generatedColumn', null),
          lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

sourceMapConsumer.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sections = util$1.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util$1.getArg(s, 'offset');
    var offsetLine = util$1.getArg(offset, 'line');
    var offsetColumn = util$1.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer$1(util$1.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer$1;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util$1.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
  };

sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
var util = util$5;

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex] || '';
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || '';
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
var SourceMapConsumer = sourceMapConsumer.SourceMapConsumer;

class ErrorMapper {
    static get consumer() {
        if (this._consumer == null) {
            this._consumer = new SourceMapConsumer(require("main.js.map"));
        }
        return this._consumer;
    }
    /**
     * Generates a stack trace using a source map generate original symbol names.
     *
     * WARNING - EXTREMELY high CPU cost for first call after reset - >30 CPU! Use sparingly!
     * (Consecutive calls after a reset are more reasonable, ~0.1 CPU/ea)
     *
     * @param {Error | string} error The error or original stack trace
     * @returns {string} The source-mapped stack trace
     */
    static sourceMappedStackTrace(error) {
        const stack = error instanceof Error ? error.stack : error;
        if (Object.prototype.hasOwnProperty.call(this.cache, stack)) {
            return this.cache[stack];
        }
        // eslint-disable-next-line no-useless-escape
        const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
        let match;
        let outStack = error.toString();
        while ((match = re.exec(stack))) {
            if (match[2] === "main") {
                const pos = this.consumer.originalPositionFor({
                    column: parseInt(match[4], 10),
                    line: parseInt(match[3], 10)
                });
                if (pos.line != null) {
                    if (pos.name) {
                        outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
                    }
                    else {
                        if (match[1]) {
                            // no original source file name known - use file name from given trace
                            outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
                        }
                        else {
                            // no original source file name known or in given trace - omit name
                            outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`;
                        }
                    }
                }
                else {
                    // no known position
                    break;
                }
            }
            else {
                // no more parseable lines
                break;
            }
        }
        this.cache[stack] = outStack;
        return outStack;
    }
    static wrapLoop(loop) {
        return () => {
            try {
                loop();
            }
            catch (e) {
                if (e instanceof Error) {
                    if ("sim" in Game.rooms) {
                        const message = `Source maps don't work in the simulator - displaying original error`;
                        console.log(`<span style='color:red'>${message}<br>${_.escape(e.stack)}</span>`);
                    }
                    else {
                        console.log(`<span style='color:red'>${_.escape(this.sourceMappedStackTrace(e))}</span>`);
                    }
                }
                else {
                    // can't handle it
                    throw e;
                }
            }
        };
    }
}
// Cache previously mapped traces to improve performance
ErrorMapper.cache = {};

/**
 * To start using Traveler, require it in main.js:
 * Example: var Traveler = require('Traveler.js');
 */
class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        destination = this.normalizePos(destination);
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (state.stuckCount >= options.stuckValue && Math.random() > .5) {
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            delete travelData.path;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path = (travelData.path || "") + state.destination.getDirectionTo(destination);
                state.destination = destination;
            }
            else {
                delete travelData.path;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }
        // pathfinding
        let newPath = false;
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                // console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        // TRAFFIC FLOW OPTIMIZATION: Maintain 1-tile gap on roads for zipper-merge passing
        // Check if next position has a creep AND we're both on/moving to roads
        // Default to TRUE (enabled) unless explicitly disabled
        if (options.maintainRoadGap !== false) {
            let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
            if (nextPos && !options.ignoreCreeps) {
                let shouldMaintainGap = this.shouldMaintainTrafficGap(creep, nextPos, destination);
                if (shouldMaintainGap) {
                    // Don't move - maintain gap to allow passing
                    return OK;
                }
            }
        }
        return creep.move(nextDirection);
    }
    /**
     * Traffic flow optimization: Determine if creep should maintain 1-tile gap
     * Allows "zipper merge" behavior where creeps can pass each other on roads
     *
     * @param creep The creep considering movement
     * @param nextPos The position the creep wants to move to
     * @param destination The creep's final destination
     * @returns true if creep should wait to maintain gap
     */
    static shouldMaintainTrafficGap(creep, nextPos, destination) {
        // Only apply gap logic on roads (or if moving to road)
        const currentTerrain = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos);
        const nextTerrain = creep.room.lookForAt(LOOK_STRUCTURES, nextPos);
        const onRoad = currentTerrain.some(s => s.structureType === STRUCTURE_ROAD);
        const nextIsRoad = nextTerrain.some(s => s.structureType === STRUCTURE_ROAD);
        if (!onRoad && !nextIsRoad) {
            return false; // Not on road network, no gap needed
        }
        // Check if there's a creep at next position
        const creepsAtNext = nextPos.lookFor(LOOK_CREEPS);
        if (creepsAtNext.length === 0) {
            return false; // No creep ahead, move normally
        }
        const creepAhead = creepsAtNext[0];
        // Don't maintain gap if creep ahead is stationary (harvester, upgrader at controller)
        if (!creepAhead.memory._trav || creepAhead.fatigue > 0) {
            return false; // Stationary creep, we need to path around
        }
        // Check if creep ahead is moving in same general direction
        const ourDirection = creep.pos.getDirectionTo(destination);
        const theirDirection = creepAhead.pos.getDirectionTo(destination);
        // If moving in similar direction (within 2 directions), maintain gap
        const directionDiff = Math.abs(ourDirection - theirDirection);
        const similarDirection = directionDiff <= 2 || directionDiff >= 6; // Handles wrapping (1-8)
        if (similarDirection) {
            // Both moving same direction on road - maintain 1 tile gap
            return true;
        }
        return false; // Different directions, normal pathfinding
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = 1;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                }
                else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (!options.allowSK && !Game.rooms[roomName]) {
                    if (!parsed) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    }
                    let fMod = parsed[1] % 10;
                    let sMod = parsed[2] % 10;
                    let isSK = !(fMod === 5 && sMod === 5) &&
                        ((fMod >= 4) && (fMod <= 6)) &&
                        ((sMod >= 4) && (sMod <= 6));
                    if (isSK) {
                        return 10 * highwayBias;
                    }
                }
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room) {
        if (!this.creepMatrixCache[room.name] || Game.time !== this.creepMatrixTick) {
            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => {
            // OPTIMIZATION: Instead of making creeps impassable (0xff), set high cost (10)
            // This allows creeps to path through each other when it's more efficient
            // Enables "zipper merge" behavior on single-lane roads where creeps can pass
            // if they're moving in compatible directions
            matrix.set(creep.pos.x, creep.pos.y, 10);
        });
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
        }
        else {
            state.cpu = 0;
            state.destination = destination;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {
    return Traveler.travelTo(this, destination, options);
};

class RoleHarvester {
    static run(creep, config) {
        // Get role config for this role
        const roleConfig = config.roles.harvester;
        if (!roleConfig) {
            console.log(`⚠️ No harvester config found for ${creep.name}`);
            return;
        }
        // Toggle working state
        if (creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }
        if (creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working) {
            // Harvest energy from assigned source
            if (creep.memory.assignedSource) {
                const source = Game.getObjectById(creep.memory.assignedSource);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, source);
                    }
                }
            }
            else {
                // Fallback: find any source if no assignment
                const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, source);
                    }
                }
            }
        }
        else {
            // Check if source containers exist (for drop mining strategy)
            const sourceContainers = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            const hasSourceContainers = sourceContainers.some(container => {
                const sources = creep.room.find(FIND_SOURCES);
                return sources.some(source => container.pos.inRangeTo(source, 1));
            });
            // Phase 1 (no source containers): DROP MINING STRATEGY
            // Drop energy near container sites for builders to pick up
            if (!hasSourceContainers) {
                // Find container construction sites near sources
                const containerSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                    filter: site => {
                        if (site.structureType !== STRUCTURE_CONTAINER)
                            return false;
                        const sources = creep.room.find(FIND_SOURCES);
                        return sources.some(source => site.pos.inRangeTo(source, 1));
                    }
                });
                if (containerSite) {
                    // Move to container site and drop energy
                    if (creep.pos.inRangeTo(containerSite, 0)) {
                        // At container site - drop energy for builders
                        creep.drop(RESOURCE_ENERGY);
                    }
                    else {
                        Traveler.travelTo(creep, containerSite, { range: 0 });
                    }
                    return;
                }
            }
            // Phase 2+: Normal delivery to spawn/extensions
            // Transfer energy to spawn or extensions
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                        structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                }
            });
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, target);
                }
            }
        }
    }
}

class RoleUpgrader {
    static run(creep, config) {
        // Get role config for this role
        const roleConfig = config.roles.upgrader;
        if (!roleConfig) {
            console.log(`⚠️ No upgrader config found for ${creep.name}`);
            return;
        }
        // Toggle working state
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
        }
        if (creep.memory.working) {
            // Upgrade controller
            if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, creep.room.controller);
                }
            }
        }
        else {
            // CRITICAL GUARDRAIL: Don't withdraw if room needs energy for spawning
            // Reserve energy for spawn if we're below minimum viable energy (200)
            const shouldReserveEnergy = creep.room.energyAvailable < 200;
            if (!shouldReserveEnergy) {
                // Safe to withdraw - room has enough energy for spawning
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN) &&
                            structure.store &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
                    }
                });
                if (target) {
                    if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, target);
                    }
                    return;
                }
            }
            // Energy reserved for spawning OR no energy in spawn/extensions
            // Help bootstrap economy: harvest from sources or pickup dropped energy
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: resource => resource.resourceType === RESOURCE_ENERGY
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, droppedEnergy);
                }
            }
            else {
                // CRISIS MODE: Harvest directly from source
                const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, source);
                    }
                }
            }
        }
    }
}

/**
 * RCL 1 Configuration
 * Defines behaviors, body compositions, and strategic guidelines for RCL 1
 *
 * Strategy (from documentation):
 * Phase 1 (Bootstrap): Spawn first generalist [WORK, CARRY, MOVE]
 * Phase 2 (Stabilization): Build assembly line with 2-3 harvesters, 1-2 upgraders
 * Phase 3 (The Push): Maintain economy and upgrade to RCL 2
 *
 * Key Principles:
 * - DO NOT BUILD (no structures available at RCL 1)
 * - Specialists only (harvesters harvest, upgraders upgrade)
 * - Simple assembly line: Harvesters -> Spawn -> Upgraders -> Controller
 */
const RCL1Config = {
    roles: {
        harvester: {
            body: [WORK, CARRY, MOVE],
            priority: 1,
            assignToSource: true,
            behavior: {
                energySource: "harvest",
                workTarget: "spawn/extensions" // Deliver to spawn
            }
        },
        upgrader: {
            body: [WORK, CARRY, MOVE],
            priority: 2,
            behavior: {
                energySource: "withdraw",
                workTarget: "controller" // Upgrade controller
            }
        }
    },
    sourceAssignment: {
        maxWorkPartsPerSource: 5 // RCL1: 5 work parts = 10 energy/tick (source max)
    },
    spawning: {
        enableBuilders: false,
        useContainers: false // No containers available yet
    }
};

/**
 * RCL 2 Configuration
 * Defines behaviors, body compositions, and strategic guidelines for RCL 2
 *
 * Strategy (from documentation):
 * Phase 1 (Immediate): Build 5 extensions (300→550 energy capacity)
 * Phase 2 (Infrastructure): Build containers at sources, roads to core
 * Phase 3 (Economic Overhaul): Transition to specialist economy
 *   - Stationary Harvesters: [WORK×5, MOVE] mine to containers
 *   - Haulers: [CARRY×3, MOVE×3] transport from containers
 *   - Upgraders: Pull from containers, not spawn
 * Phase 4 (Stabilize): Scale upgraders, prepare for RCL 3 towers
 *
 * Key Principles:
 * - Build infrastructure first (extensions, containers, roads)
 * - Transition to specialist logistics (stationary miners + haulers)
 * - Minimize walking, maximize working
 */
const RCL2Config = {
    roles: {
        harvester: {
            body: [WORK, WORK, MOVE],
            // Double mining speed vs [WORK, CARRY, MOVE]
            // Phase 1: Drop energy near container sites for builders
            // Phase 2: Keep until extensions complete (can't afford stationary yet)
            // Phase 3: Replaced by [WORK×5, MOVE] stationary harvesters
            priority: 1,
            assignToSource: true,
            behavior: {
                energySource: "harvest",
                workTarget: "spawn/extensions" // Deliver to spawn/extensions (or drop if Phase 1)
            }
        },
        upgrader: {
            body: [WORK, CARRY, MOVE],
            // TODO: Scale up with more WORK parts once energy available
            priority: 2,
            behavior: {
                energySource: "withdraw",
                workTarget: "controller" // Upgrade controller
            }
        },
        builder: {
            body: [WORK, CARRY, MOVE],
            priority: 3,
            behavior: {
                energySource: "withdraw",
                workTarget: "construction" // Build extensions/containers/roads
                // Builder Intelligence (in builder role):
                // - Prioritizes finishing partially-built structures first
                // - Construction order: Extensions > Containers > Roads
                // - Focuses on one structure at a time until complete
            }
        }
        // TODO: Add "hauler" role once containers are operational
        // hauler: { body: [CARRY×3, MOVE×3], priority: 1, behavior: { energySource: "container", workTarget: "logistics" } }
    },
    sourceAssignment: {
        maxWorkPartsPerSource: 5 // Maximum efficiency: 5 work parts = 10 energy/tick (source max)
    },
    spawning: {
        enableBuilders: true,
        useContainers: false // Not yet - will enable once containers built
        // TODO: Set to true once containers operational
    }
};

/**
 * Spawn Request System
 * Generates spawn requests based on actual room conditions
 * Uses RCL configs for body parts and behaviors
 * Calculates counts dynamically based on room state
 */
class SpawnRequestGenerator {
    /**
     * Generate all spawn requests for a room
     */
    static generateRequests(room) {
        var _a;
        const requests = [];
        const config = RoomStateManager.getConfigForRoom(room);
        // Null check - if no config available, return empty requests
        if (!config) {
            console.log(`[SpawnRequestGenerator] No config found for room ${room.name}`);
            return requests;
        }
        // Get progression state for RCL 2+
        const progressionState = RoomStateManager.getProgressionState(room.name);
        // Always generate harvester requests first
        requests.push(...this.requestHarvesters(room, config, progressionState));
        // CRITICAL: Always maintain 1 fallback upgrader to prevent downgrade
        // Minimal body with WORK to actually upgrade controller
        const upgraderCount = this.getCreepCount(room, "upgrader");
        if (upgraderCount === 0) {
            requests.push({
                role: "upgrader",
                priority: 0,
                reason: `FALLBACK: No upgraders! Controller downgrade imminent`,
                body: [WORK, CARRY, MOVE],
                minEnergy: 200 // Cheap to spawn
            });
        }
        // Only request other roles if we have minimum harvesters
        const harvesterCount = this.getCreepCount(room, "harvester");
        const minHarvesters = this.getMinimumHarvesters(room);
        if (harvesterCount >= minHarvesters) {
            // NO UPGRADERS during Phase 1-3 (prevent source traffic congestion)
            // Only spawn upgraders when infrastructure is complete
            const allowUpgraders = !progressionState ||
                progressionState.phase === "complete" ||
                ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) === 1; // RCL1 always gets upgraders
            if (allowUpgraders) {
                requests.push(...this.requestUpgraders(room, config));
            }
            // Only request builders if enabled in config
            if (config.spawning.enableBuilders) {
                requests.push(...this.requestBuilders(room, config));
            }
            // Request haulers if progression state indicates they're needed
            if (progressionState === null || progressionState === void 0 ? void 0 : progressionState.useHaulers) {
                requests.push(...this.requestHaulers(room, config));
            }
        }
        return requests;
    }
    /**
     * Request harvesters based on source capacity
     * Uses RCL config for body composition
     * Adapts to progression state (stationary vs mobile harvesters)
     */
    static requestHarvesters(room, config, progressionState) {
        const requests = [];
        const sources = room.find(FIND_SOURCES);
        const harvesterCount = this.getCreepCount(room, "harvester");
        // CRITICAL: If only 1 harvester left, request emergency backup immediately
        if (harvesterCount === 1) {
            const body = this.buildScaledBody(room, "harvester");
            requests.push({
                role: "harvester",
                priority: 0,
                reason: `EMERGENCY: Only 1 harvester remaining! (${room.energyCapacityAvailable} energy)`,
                body: body,
                minEnergy: this.calculateBodyCost(body)
            });
        }
        // Determine if we need stationary harvesters
        const useStationaryHarvesters = (progressionState === null || progressionState === void 0 ? void 0 : progressionState.useStationaryHarvesters) || false;
        if (useStationaryHarvesters) {
            // Phase 2+: One stationary harvester per source
            const idealCount = sources.length;
            if (harvesterCount < idealCount) {
                // Stationary harvester: [WORK×5, MOVE] = 550 energy
                // Note: buildStationaryHarvesterBody() has scaling logic for future RCL3+,
                // but during RCL2 phased progression we use fixed bodies from config
                const stationaryBody = [WORK, WORK, WORK, WORK, WORK, MOVE];
                requests.push({
                    role: "harvester",
                    priority: 1,
                    reason: `Stationary harvesters: ${harvesterCount}/${idealCount}`,
                    body: stationaryBody,
                    minEnergy: 550
                });
            }
        }
        else {
            // Phase 1: Mobile harvesters (1 per source + 1 spare)
            // Scale body based on available energy capacity
            const idealCount = sources.length + 1;
            if (harvesterCount < idealCount) {
                const body = this.buildScaledBody(room, "harvester");
                requests.push({
                    role: "harvester",
                    priority: config.roles.harvester.priority,
                    reason: `Mobile harvesters: ${harvesterCount}/${idealCount} (${room.energyCapacityAvailable} energy)`,
                    body: body,
                    minEnergy: this.calculateBodyCost(body)
                });
            }
        }
        return requests;
    }
    /**
     * Request upgraders based on available energy and controller needs
     * Uses RCL config for body composition
     */
    static requestUpgraders(room, config) {
        var _a;
        const requests = [];
        const upgraderCount = this.getCreepCount(room, "upgrader");
        const harvesterCount = this.getCreepCount(room, "harvester");
        // Don't spawn upgraders if we don't have enough harvesters
        const minHarvesters = this.getMinimumHarvesters(room);
        if (harvesterCount < minHarvesters) {
            return requests;
        }
        // Calculate ideal upgraders based on RCL and energy capacity
        const rcl = ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 1;
        let idealCount = 0;
        if (rcl === 1) {
            // RCL 1: Just enough to keep upgrading (2 upgraders)
            idealCount = 2;
        }
        else if (rcl === 2) {
            // RCL 2: More upgraders to push to RCL 3 (3 upgraders)
            idealCount = 3;
        }
        else if (rcl >= 3) {
            // RCL 3+: Scale based on available extensions
            idealCount = Math.min(5, Math.floor(room.energyCapacityAvailable / 200));
        }
        if (upgraderCount < idealCount) {
            const body = this.buildScaledBody(room, "upgrader");
            requests.push({
                role: "upgrader",
                priority: config.roles.upgrader.priority,
                reason: `Controller upgrading: ${upgraderCount}/${idealCount} upgraders (${room.energyCapacityAvailable} energy)`,
                body: body,
                minEnergy: this.calculateBodyCost(body)
            });
        }
        return requests;
    }
    /**
     * Request builders only when construction sites exist
     * Uses RCL config for body composition
     */
    static requestBuilders(room, config) {
        const requests = [];
        const builderCount = this.getCreepCount(room, "builder");
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        // No construction sites = no builders needed
        if (constructionSites.length === 0) {
            return requests;
        }
        // Calculate builders needed based on construction volume
        const progressNeeded = constructionSites.reduce((sum, site) => {
            return sum + (site.progressTotal - site.progress);
        }, 0);
        // 1 builder per 10,000 progress needed, min 1, max 3
        const idealCount = Math.min(3, Math.max(1, Math.ceil(progressNeeded / 10000)));
        if (builderCount < idealCount) {
            const body = this.buildScaledBody(room, "builder");
            requests.push({
                role: "builder",
                priority: config.roles.builder.priority,
                reason: `Construction: ${constructionSites.length} sites, ${progressNeeded} progress needed (${room.energyCapacityAvailable} energy)`,
                body: body,
                minEnergy: this.calculateBodyCost(body)
            });
        }
        return requests;
    }
    /**
     * Calculate the energy cost of a body
     */
    static calculateBodyCost(body) {
        return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    }
    /**
     * Build a dynamically scaled body based on available energy
     * Scales up as extensions are completed during Phase 1-2
     */
    static buildScaledBody(room, role) {
        const energy = room.energyCapacityAvailable;
        const body = [];
        if (role === "harvester") {
            // Harvester: [WORK, WORK, MOVE] pattern for drop mining efficiency
            // 300 energy: [WORK, WORK, MOVE] = 250
            // 350 energy: [WORK, WORK, MOVE, WORK] = 350
            // 400 energy: [WORK, WORK, MOVE, WORK, MOVE] = 400
            // 550 energy: [WORK, WORK, MOVE, WORK, WORK, MOVE] = 500
            // Start with base pattern
            const basePattern = [WORK, WORK, MOVE]; // 250 energy
            if (energy >= 250) {
                body.push(...basePattern);
            }
            // Add more WORK+MOVE pairs with remaining energy
            let remaining = energy - this.calculateBodyCost(body);
            while (remaining >= 150 && body.length < 50) {
                body.push(WORK, MOVE);
                remaining -= 150;
            }
            // Use any remaining energy for extra WORK parts
            while (remaining >= 100 && body.length < 50) {
                body.push(WORK);
                remaining -= 100;
            }
        }
        else if (role === "upgrader" || role === "builder") {
            // Upgrader/Builder: Balanced WORK, CARRY, MOVE
            // Pattern: [WORK, CARRY, MOVE] = 200 energy per set
            const pattern = [WORK, CARRY, MOVE];
            const sets = Math.floor(energy / 200);
            for (let i = 0; i < sets && body.length < 50; i++) {
                body.push(...pattern);
            }
        }
        // Fallback: Minimum viable body
        return body.length > 0 ? body : [WORK, CARRY, MOVE];
    } /**
     * Build stationary harvester body: [WORK×5, MOVE]
     * Designed to sit on container and mine continuously
     */
    static buildStationaryHarvesterBody(room) {
        const energy = room.energyCapacityAvailable;
        // Ideal: [WORK×5, MOVE] = 550 energy (5 work parts mine full source capacity)
        if (energy >= 550) {
            return [WORK, WORK, WORK, WORK, WORK, MOVE];
        }
        // Fallback: Scale down based on available energy
        const workParts = Math.min(5, Math.floor((energy - 50) / 100)); // Reserve 50 for MOVE
        const body = [];
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }
        body.push(MOVE);
        return body.length > 0 ? body : [WORK, MOVE]; // Minimum viable
    }
    /**
     * Build hauler body: [CARRY×N, MOVE×N]
     * Designed to transport energy quickly
     */
    static buildHaulerBody(room) {
        const energy = room.energyCapacityAvailable;
        // Build balanced CARRY/MOVE pairs (50 + 50 = 100 per pair)
        const pairs = Math.floor(energy / 100);
        const maxPairs = Math.min(pairs, 6); // Cap at 6 pairs (600 energy)
        const body = [];
        for (let i = 0; i < maxPairs; i++) {
            body.push(CARRY, MOVE);
        }
        return body.length > 0 ? body : [CARRY, MOVE]; // Minimum viable
    }
    /**
     * Request haulers based on progression state
     * Haulers transport energy from containers to spawn/extensions
     */
    static requestHaulers(room, config) {
        const requests = [];
        const haulerCount = this.getCreepCount(room, "hauler");
        const sources = room.find(FIND_SOURCES);
        // Ideal: 1 hauler per source container
        const idealCount = sources.length;
        if (haulerCount < idealCount) {
            const body = this.buildHaulerBody(room);
            requests.push({
                role: "hauler",
                priority: 1,
                reason: `Hauler logistics: ${haulerCount}/${idealCount} haulers (${room.energyCapacityAvailable} energy)`,
                body: body,
                minEnergy: this.calculateBodyCost(body)
            });
        }
        return requests;
    }
    /**
     * Get minimum harvesters needed for room stability
     */
    static getMinimumHarvesters(room) {
        const sources = room.find(FIND_SOURCES);
        // Minimum: 1 harvester per source
        return sources.length;
    }
    /**
     * Count creeps by role in a room
     */
    static getCreepCount(room, role) {
        return room.find(FIND_MY_CREEPS, {
            filter: (c) => c.memory.role === role
        }).length;
    }
}

/**
 * Spawn Manager - Demand-Based Spawning
 * Evaluates spawn requests and spawns creeps based on actual room needs
 */
class SpawnManager {
    /**
     * Main spawn logic - evaluates requests and spawns
     */
    static run(spawn) {
        // Don't spawn if already spawning
        if (spawn.spawning) {
            this.displaySpawningStatus(spawn);
            return;
        }
        const room = spawn.room;
        // Generate spawn requests based on room conditions
        const requests = SpawnRequestGenerator.generateRequests(room);
        // Display status periodically
        if (Game.time % 10 === 0) {
            this.displayStatus(room, requests);
        }
        // Process requests by priority
        this.processRequests(spawn, requests);
    }
    /**
     * Process spawn requests in priority order
     */
    static processRequests(spawn, requests) {
        if (requests.length === 0) {
            return; // No requests
        }
        // Sort by priority (lower number = higher priority)
        const sortedRequests = requests.sort((a, b) => a.priority - b.priority);
        // Emergency: If no creeps alive, spawn first request immediately
        const totalCreeps = Object.keys(Game.creeps).filter(name => Game.creeps[name].room.name === spawn.room.name).length;
        if (totalCreeps === 0) {
            console.log("⚠️ CRITICAL: No creeps alive! Spawning emergency creep");
            const firstRequest = sortedRequests[0];
            this.spawnFromRequest(spawn, firstRequest);
            return;
        }
        // Process first viable request
        for (const request of sortedRequests) {
            // Check if we can afford this spawn
            const bodyCost = this.calculateBodyCost(request.body);
            const minEnergy = request.minEnergy || bodyCost;
            if (spawn.room.energyAvailable >= minEnergy) {
                const result = this.spawnFromRequest(spawn, request);
                if (result === OK) {
                    return; // Successfully spawned
                }
                else if (result !== ERR_NOT_ENOUGH_ENERGY) {
                    console.log(`❌ Spawn failed for ${request.role}: ${this.getErrorName(result)}`);
                }
            }
        }
    }
    /**
     * Spawn a creep from a request
     */
    static spawnFromRequest(spawn, request) {
        const name = this.generateCreepName(request.role);
        const result = spawn.spawnCreep(request.body, name, {
            memory: {
                role: request.role,
                room: spawn.room.name,
                working: false
            }
        });
        if (result === OK) {
            console.log(`✅ Spawning ${request.role}: ${name} (${request.reason})`);
        }
        return result;
    }
    /**
     * Generate a clean, readable creep name with emoji and incremental numbering
     * Format: ⛏️_1, ⚡_2, 🔨_1, etc.
     */
    static generateCreepName(role) {
        // Role emoji mapping
        const roleEmojis = {
            harvester: "⛏️",
            upgrader: "⚡",
            builder: "🔨",
            hauler: "🚚",
            repairer: "🔧",
            defender: "⚔️",
            healer: "💚",
            scout: "👁️",
            claimer: "🏴"
        };
        const emoji = roleEmojis[role.toLowerCase()] || "🤖";
        // Find the highest existing number for this role
        let maxNumber = 0;
        for (const name in Game.creeps) {
            if (name.startsWith(emoji + "_")) {
                const parts = name.split("_");
                if (parts.length === 2) {
                    const num = parseInt(parts[1], 10);
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            }
        }
        // Return next available number
        return `${emoji}_${maxNumber + 1}`;
    }
    /**
     * Display spawning status
     */
    static displaySpawningStatus(spawn) {
        if (!spawn.spawning)
            return;
        const spawningCreep = Game.creeps[spawn.spawning.name];
        spawn.room.visual.text(`🛠️ ${spawningCreep.memory.role}`, spawn.pos.x + 1, spawn.pos.y, { align: "left", opacity: 0.8 });
    }
    /**
     * Display room status with active requests
     */
    static displayStatus(room, requests) {
        var _a, _b, _c;
        const creeps = room.find(FIND_MY_CREEPS);
        const creepCounts = {};
        for (const creep of creeps) {
            const role = creep.memory.role;
            creepCounts[role] = (creepCounts[role] || 0) + 1;
        }
        console.log(`\n=== Room Status (${room.name}) ===`);
        console.log(`RCL: ${((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0} | Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);
        console.log(`Controller: ${(_b = room.controller) === null || _b === void 0 ? void 0 : _b.progress}/${(_c = room.controller) === null || _c === void 0 ? void 0 : _c.progressTotal}`);
        // Show creep counts
        console.log(`\nCreeps:`);
        const allRoles = new Set([...Object.keys(creepCounts), ...requests.map(r => r.role)]);
        for (const role of allRoles) {
            const count = creepCounts[role] || 0;
            console.log(`  ${role}: ${count}`);
        }
        // Show active requests
        if (requests.length > 0) {
            console.log(`\nSpawn Requests (${requests.length}):`);
            const sorted = requests.sort((a, b) => a.priority - b.priority);
            for (const req of sorted.slice(0, 3)) { // Show top 3
                console.log(`  [P${req.priority}] ${req.role}: ${req.reason}`);
            }
        }
    }
    /**
     * Calculate body cost
     */
    static calculateBodyCost(body) {
        return body.reduce((total, part) => total + BODYPART_COST[part], 0);
    }
    /**
     * Get error name from code
     */
    static getErrorName(code) {
        const errors = {
            [ERR_NOT_OWNER]: "ERR_NOT_OWNER",
            [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS",
            [ERR_BUSY]: "ERR_BUSY",
            [ERR_NOT_ENOUGH_ENERGY]: "ERR_NOT_ENOUGH_ENERGY",
            [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS",
            [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH"
        };
        return errors[code] || `Error code: ${code}`;
    }
}

/**
 * Assignment Manager - Manages creep assignments to prevent overcrowding
 * Uses RCL-specific configs to determine max work parts per source
 */
class AssignmentManager {
    /**
     * Main run method - handles all assignments for a room
     */
    static run(room, config) {
        // Find all roles that need source assignments
        const rolesNeedingAssignment = Object.entries(config.roles)
            .filter(([_, roleConfig]) => roleConfig.assignToSource)
            .map(([roleName, _]) => roleName);
        // Assign creeps that need it
        for (const roleName of rolesNeedingAssignment) {
            const creeps = room.find(FIND_MY_CREEPS, {
                filter: (creep) => creep.memory.role === roleName
            });
            for (const creep of creeps) {
                if (this.needsReassignment(creep)) {
                    this.assignCreepToSource(creep, room, config);
                }
            }
        }
    }
    /**
     * Get all sources in a room
     */
    static getRoomSources(room) {
        return room.find(FIND_SOURCES);
    }
    /**
     * Get assigned creeps for a source
     */
    static getSourceAssignments(sourceId) {
        return Object.values(Game.creeps).filter(creep => creep.memory.assignedSource === sourceId);
    }
    /**
     * Calculate total work parts assigned to a source
     */
    static getSourceWorkParts(sourceId) {
        const assignedCreeps = this.getSourceAssignments(sourceId);
        return assignedCreeps.reduce((total, creep) => {
            return total + creep.body.filter(part => part.type === WORK).length;
        }, 0);
    }
    /**
     * Assign a creep to the best available source using RCL config
     * Evenly distributes creeps across sources up to max work parts
     * Returns true if assignment successful
     */
    static assignCreepToSource(creep, room, config) {
        const sources = this.getRoomSources(room);
        const maxWorkParts = config.sourceAssignment.maxWorkPartsPerSource;
        const creepWorkParts = creep.body.filter(part => part.type === WORK).length;
        if (sources.length === 0) {
            console.log(`⚠️ No sources found in room ${room.name}`);
            return false;
        }
        // Build assignment map: source -> current work parts
        const sourceWorkParts = new Map();
        for (const source of sources) {
            sourceWorkParts.set(source.id, this.getSourceWorkParts(source.id));
        }
        // Find source with fewest work parts that can still accept this creep
        let bestSource = null;
        let minWorkParts = Infinity;
        for (const source of sources) {
            const currentWorkParts = sourceWorkParts.get(source.id) || 0;
            const wouldHaveWorkParts = currentWorkParts + creepWorkParts;
            // Can this source accept this creep without exceeding the limit?
            if (wouldHaveWorkParts <= maxWorkParts && currentWorkParts < minWorkParts) {
                minWorkParts = currentWorkParts;
                bestSource = source;
            }
        }
        if (bestSource) {
            creep.memory.assignedSource = bestSource.id;
            const newTotal = minWorkParts + creepWorkParts;
            console.log(`✓ Assigned ${creep.name} to source (${newTotal}/${maxWorkParts} work parts)`);
            return true;
        }
        else {
            console.log(`⚠️ Cannot assign ${creep.name}: All sources at capacity (${maxWorkParts} work parts each)`);
            return false;
        }
    }
    /**
     * Unassign a creep from its source
     */
    static unassignCreep(creep) {
        delete creep.memory.assignedSource;
    }
    /**
     * Check if a creep needs reassignment (e.g., if source no longer exists)
     */
    static needsReassignment(creep) {
        if (!creep.memory.assignedSource)
            return true;
        const source = Game.getObjectById(creep.memory.assignedSource);
        return !source; // Reassign if source no longer exists
    }
    /**
     * Display assignment info for debugging
     */
    static displayAssignments(room, config) {
        const sources = this.getRoomSources(room);
        const maxWorkParts = config.sourceAssignment.maxWorkPartsPerSource;
        console.log(`\n=== Source Assignments for ${room.name} ===`);
        console.log(`Max work parts per source: ${maxWorkParts}`);
        console.log(`Total sources: ${sources.length}`);
        for (const source of sources) {
            const workParts = this.getSourceWorkParts(source.id);
            const creeps = this.getSourceAssignments(source.id);
            const percentage = Math.round((workParts / maxWorkParts) * 100);
            console.log(`Source @ ${source.pos.x},${source.pos.y}: ${workParts}/${maxWorkParts} work parts (${percentage}%) - ${creeps.length} creeps`);
            creeps.forEach(c => {
                const cWorkParts = c.body.filter(part => part.type === WORK).length;
                console.log(`  - ${c.name} (${c.memory.role}, ${cWorkParts} work)`);
            });
        }
    }
}

/**
 * Architect - Intelligent Room Planning System
 *
 * Analyzes room topology and uses pathfinding data to optimally place:
 * - Extensions (efficient energy distribution)
 * - Containers (source containers, destination containers)
 * - Roads (connecting infrastructure)
 * - Future: Towers, labs, storage, terminals, etc.
 *
 * Design Philosophy:
 * - Use actual pathfinding data (Traveler) to inform decisions
 * - Minimize creep travel time (fewer CPU cycles, faster economy)
 * - Adaptive to room terrain and source positions
 * - Extensible for all RCL levels
 */
class Architect {
    /**
     * Main entry point - automatically plans and executes for a room
     * Call this once per tick for each room
     */
    static run(room) {
        if (!room.controller || !room.controller.my)
            return;
        const rcl = room.controller.level;
        const roomKey = room.name;
        // Initialize Memory tracking if needed
        if (!Memory.architectPlans) {
            Memory.architectPlans = {};
        }
        const lastPlannedRCL = Memory.architectPlans[roomKey];
        // Only plan when RCL has CHANGED (not on fresh deploy with no memory!)
        // If lastPlannedRCL is undefined, just record current RCL without planning
        if (lastPlannedRCL === undefined) {
            // First time seeing this room - record RCL without triggering
            Memory.architectPlans[roomKey] = rcl;
            console.log(`📐 Architect: Initialized tracking for ${room.name} at RCL ${rcl} (no planning yet)`);
            return;
        }
        // Now we have previous data - only plan if RCL actually changed
        if (lastPlannedRCL !== rcl && rcl >= 2) {
            console.log(`📐 Architect: RCL changed ${lastPlannedRCL} → ${rcl} in ${room.name}`);
            console.log(`📐 Architect: Planning infrastructure for ${room.name} (RCL ${rcl})`);
            const plan = this.planRoom(room);
            this.executePlan(room, plan);
            // Mark this RCL as planned in Memory (persists across code pushes)
            Memory.architectPlans[roomKey] = rcl;
        }
    }
    /**
     * Force replan for a room (useful after manual cleanup or structure destruction)
     */
    static forceReplan(roomName) {
        const room = Game.rooms[roomName];
        if (!room || !room.controller || !room.controller.my) {
            console.log(`❌ Architect: Cannot replan ${roomName} - invalid room or not owned`);
            return;
        }
        console.log(`🔄 Architect: Force replanning ${roomName}...`);
        // Clear the RCL tracking in Memory to force replan
        if (Memory.architectPlans) {
            delete Memory.architectPlans[roomName];
        }
        this.run(room);
        console.log(`✅ Architect: Replan complete for ${roomName}`);
    }
    /**
     * Generate a complete construction plan for a room
     * Includes cleanup of faulty/misplaced construction sites
     */
    static planRoom(room) {
        const plan = {
            extensions: [],
            sourceContainers: new Map(),
            destContainers: {},
            roads: []
        };
        // Get key anchor points
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) {
            console.log(`⚠️ Architect: No spawn found in ${room.name}`);
            return plan;
        }
        const controller = room.controller;
        const sources = room.find(FIND_SOURCES);
        // Plan infrastructure based on RCL
        const rcl = (controller === null || controller === void 0 ? void 0 : controller.level) || 1;
        if (rcl >= 2) {
            // RCL 2: Containers first (drop mining), then extensions, then roads
            // Phase 1: Source containers (fast with drop mining)
            for (const source of sources) {
                const containerPos = this.planSourceContainer(room, source);
                if (containerPos) {
                    plan.sourceContainers.set(source.id, containerPos);
                }
            }
            // Phase 2: Extensions (haulers bring energy from containers)
            plan.extensions = this.planExtensions(room, spawn, 5); // RCL 2 unlocks 5 extensions
            // Phase 4: Controller container (last)
            if (controller) {
                const controllerContainer = this.planControllerContainer(room, controller, spawn);
                if (controllerContainer) {
                    plan.destContainers.controller = controllerContainer;
                }
            }
            // Phase 3: Road network connecting everything
            plan.roads = this.planRoadNetwork(room, spawn, sources, controller, plan);
            // Clean up faulty construction sites that don't match the plan
            this.cleanupFaultySites(room, plan);
            // If we removed sites, they need to be replaced with correct ones
            // This will be handled by executePlan in the same tick
        }
        return plan;
    }
    /**
     * Execute a construction plan (place construction sites)
     */
    static executePlan(room, plan) {
        const existingSites = room.find(FIND_CONSTRUCTION_SITES);
        const maxSites = 100; // Game limit
        // Prioritize construction: Containers > Extensions > Roads
        const placementQueue = [];
        // 1. Source containers (highest priority - enable drop mining and hauler logistics)
        for (const pos of plan.sourceContainers.values()) {
            if (!this.hasStructureAt(room, pos, STRUCTURE_CONTAINER)) {
                placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
            }
        }
        // 2. Extensions (second priority - increase energy capacity for stationary harvesters)
        for (const pos of plan.extensions) {
            if (!this.hasStructureAt(room, pos, STRUCTURE_EXTENSION)) {
                placementQueue.push({ pos, type: STRUCTURE_EXTENSION });
            }
        }
        // 3. Roads (third priority - improve logistics)
        for (const pos of plan.roads) {
            if (!this.hasStructureAt(room, pos, STRUCTURE_ROAD) && !this.hasStructureAt(room, pos, STRUCTURE_SPAWN)) {
                placementQueue.push({ pos, type: STRUCTURE_ROAD });
            }
        }
        // 4. Controller container (lowest priority - final polish)
        if (plan.destContainers.controller) {
            const pos = plan.destContainers.controller;
            if (!this.hasStructureAt(room, pos, STRUCTURE_CONTAINER)) {
                placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
            }
        }
        // Place construction sites (respecting game limit)
        let placed = 0;
        for (const { pos, type } of placementQueue) {
            if (existingSites.length + placed >= maxSites) {
                console.log(`⚠️ Architect: Hit construction site limit (${maxSites})`);
                break;
            }
            const result = room.createConstructionSite(pos, type);
            if (result === OK) {
                placed++;
                console.log(`✅ Architect: Placed ${type} at ${pos}`);
            }
        }
        if (placed > 0) {
            console.log(`📐 Architect: Placed ${placed} construction sites in ${room.name}`);
        }
    }
    /**
     * Plan extension positions in a crescent around spawn
     */
    static planExtensions(room, spawn, count) {
        const positions = [];
        const spawnPos = spawn.pos;
        // Crescent pattern: Positions around spawn, prioritizing front/sides
        const crescentOffsets = [
            // Front arc (3 positions)
            { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
            // Side positions (2 positions)
            { x: -2, y: 0 }, { x: 2, y: 0 }
            // Can extend to full circle if needed:
            // { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
        ];
        for (const offset of crescentOffsets) {
            if (positions.length >= count)
                break;
            const pos = new RoomPosition(spawnPos.x + offset.x, spawnPos.y + offset.y, room.name);
            // Validate position (buildable terrain)
            // NOTE: Don't filter out positions with existing structures here!
            // Let executePlan() handle that - otherwise replan will delete all sites
            if (this.isValidBuildPosition(room, pos)) {
                positions.push(pos);
            }
        }
        return positions;
    }
    /**
     * Plan source container position (adjacent to source, optimal for harvesting)
     */
    static planSourceContainer(room, source) {
        const sourcePos = source.pos;
        // Find the best adjacent position:
        // 1. Walkable terrain
        // 2. Not blocking pathfinding to other areas
        // 3. Ideally not on a road (but can be)
        const adjacentPositions = this.getAdjacentPositions(room, sourcePos);
        // Score positions based on accessibility and terrain
        let bestPos = null;
        let bestScore = -Infinity;
        for (const pos of adjacentPositions) {
            if (!this.isValidBuildPosition(room, pos))
                continue;
            let score = 0;
            // Prefer positions with more open adjacent tiles (easier access)
            const openNeighbors = this.getAdjacentPositions(room, pos)
                .filter(p => this.isWalkable(room, p))
                .length;
            score += openNeighbors * 10;
            // Prefer plain terrain over swamp (cheaper roads later)
            const terrain = room.getTerrain().get(pos.x, pos.y);
            if (terrain === 0)
                score += 5; // Plain
            if (terrain === TERRAIN_MASK_SWAMP)
                score -= 5; // Swamp
            if (score > bestScore) {
                bestScore = score;
                bestPos = pos;
            }
        }
        return bestPos;
    }
    /**
     * Plan controller container position (near controller, accessible to upgraders)
     */
    static planControllerContainer(room, controller, spawn) {
        const controllerPos = controller.pos;
        // Find position adjacent to controller that's on the path from spawn
        // This ensures upgraders can easily access it
        const path = Traveler.findTravelPath(spawn.pos, controllerPos);
        if (!path || path.path.length === 0) {
            console.log(`⚠️ Architect: No path found from spawn to controller`);
            return null;
        }
        // Find the last path position that's adjacent to the controller
        for (let i = path.path.length - 1; i >= 0; i--) {
            const pathPos = path.path[i];
            if (this.isAdjacentTo(pathPos, controllerPos)) {
                // Check if this position is valid for a container
                if (this.isValidBuildPosition(room, pathPos)) {
                    return new RoomPosition(pathPos.x, pathPos.y, room.name);
                }
            }
        }
        // Fallback: Just find any valid adjacent position
        const adjacentPositions = this.getAdjacentPositions(room, controllerPos);
        for (const pos of adjacentPositions) {
            if (this.isValidBuildPosition(room, pos)) {
                return pos;
            }
        }
        return null;
    }
    /**
     * Plan road network connecting spawn, sources, and controller
     * Uses terrain-agnostic pathfinding (swamps = plains since roads will be built)
     */
    static planRoadNetwork(room, spawn, sources, controller, plan) {
        const roadPositions = new Set();
        const spawnPos = spawn.pos;
        // Helper to add path to road set with terrain-agnostic pathfinding
        const addPathToRoads = (fromPos, toPos) => {
            // Custom roomCallback to treat swamps and plains equally (we're building roads!)
            const roomCallback = (roomName) => {
                if (roomName !== room.name)
                    return false;
                const costs = new PathFinder.CostMatrix();
                const terrain = room.getTerrain();
                // Set costs: plains = 1, swamps = 1 (same!), walls = 255
                for (let x = 0; x < 50; x++) {
                    for (let y = 0; y < 50; y++) {
                        const tile = terrain.get(x, y);
                        if (tile === TERRAIN_MASK_WALL) {
                            costs.set(x, y, 255); // Impassable
                        }
                        else {
                            costs.set(x, y, 1); // Both plains and swamps cost 1
                        }
                    }
                }
                // Avoid existing structures (except roads/containers)
                const structures = room.find(FIND_STRUCTURES);
                for (const structure of structures) {
                    if (structure.structureType !== STRUCTURE_ROAD &&
                        structure.structureType !== STRUCTURE_CONTAINER &&
                        structure.structureType !== STRUCTURE_RAMPART) {
                        costs.set(structure.pos.x, structure.pos.y, 255);
                    }
                }
                return costs;
            };
            const path = Traveler.findTravelPath(fromPos, toPos, {
                roomCallback: roomCallback,
                ignoreCreeps: true,
                maxOps: 4000
            });
            if (path && path.path.length > 0) {
                for (const step of path.path) {
                    const posKey = `${step.x},${step.y}`;
                    roadPositions.add(posKey);
                }
            }
        };
        // Roads from spawn to each source container
        for (const [sourceId, containerPos] of plan.sourceContainers) {
            addPathToRoads(spawnPos, containerPos);
        }
        // Road from spawn to controller container (if exists)
        if (plan.destContainers.controller) {
            addPathToRoads(spawnPos, plan.destContainers.controller);
        }
        // Convert set back to RoomPosition array
        const roads = [];
        for (const posKey of roadPositions) {
            const [x, y] = posKey.split(',').map(Number);
            roads.push(new RoomPosition(x, y, room.name));
        }
        return roads;
    }
    /**
     * Check if a position is valid for building
     */
    static isValidBuildPosition(room, pos) {
        // Check bounds
        if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48)
            return false;
        // Check terrain (not wall)
        const terrain = room.getTerrain().get(pos.x, pos.y);
        if (terrain === TERRAIN_MASK_WALL)
            return false;
        // Check no existing structures (except roads, which can be built over)
        const structures = pos.lookFor(LOOK_STRUCTURES);
        for (const structure of structures) {
            if (structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if a structure exists at a position
     */
    static hasStructureAt(room, pos, structureType) {
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        return (structures.some(s => s.structureType === structureType) ||
            sites.some(s => s.structureType === structureType));
    }
    /**
     * Check if position is walkable
     */
    static isWalkable(room, pos) {
        const terrain = room.getTerrain().get(pos.x, pos.y);
        return terrain !== TERRAIN_MASK_WALL;
    }
    /**
     * Get adjacent positions (8 directions)
     */
    static getAdjacentPositions(room, pos) {
        const positions = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue; // Skip center
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                    positions.push(new RoomPosition(x, y, room.name));
                }
            }
        }
        return positions;
    }
    /**
     * Check if two positions are adjacent
     */
    static isAdjacentTo(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) <= 1 && Math.abs(pos1.y - pos2.y) <= 1;
    }
    /**
     * Clean up faulty construction sites that don't match the current plan
     * Removes misplaced sites so they can be rebuilt correctly
     * Returns number of sites removed
     */
    static cleanupFaultySites(room, plan) {
        const allSites = room.find(FIND_CONSTRUCTION_SITES);
        let removed = 0;
        // Build sets of planned positions for quick lookup
        const plannedExtensions = new Set(plan.extensions.map(pos => `${pos.x},${pos.y}`));
        const plannedContainers = new Set([
            ...Array.from(plan.sourceContainers.values()).map(pos => `${pos.x},${pos.y}`),
            plan.destContainers.controller ? `${plan.destContainers.controller.x},${plan.destContainers.controller.y}` : null
        ].filter(Boolean));
        const plannedRoads = new Set(plan.roads.map(pos => `${pos.x},${pos.y}`));
        for (const site of allSites) {
            const posKey = `${site.pos.x},${site.pos.y}`;
            let shouldRemove = false;
            // Check if this site matches the plan
            switch (site.structureType) {
                case STRUCTURE_EXTENSION:
                    if (!plannedExtensions.has(posKey)) {
                        shouldRemove = true;
                        console.log(`🗑️ Architect: Removing misplaced extension at ${site.pos}`);
                    }
                    break;
                case STRUCTURE_CONTAINER:
                    if (!plannedContainers.has(posKey)) {
                        shouldRemove = true;
                        console.log(`🗑️ Architect: Removing misplaced container at ${site.pos}`);
                    }
                    break;
                case STRUCTURE_ROAD:
                    if (!plannedRoads.has(posKey)) {
                        shouldRemove = true;
                        console.log(`🗑️ Architect: Removing misplaced road at ${site.pos}`);
                    }
                    break;
            }
            if (shouldRemove) {
                site.remove();
                removed++;
            }
        }
        if (removed > 0) {
            console.log(`🧹 Architect: Cleaned up ${removed} faulty construction site(s) in ${room.name}`);
        }
        return removed;
    }
    /**
     * Display plan in room visual (for debugging)
     */
    static visualizePlan(room, plan) {
        const visual = room.visual;
        // Extensions (green circles)
        for (const pos of plan.extensions) {
            visual.circle(pos, { fill: 'green', radius: 0.4, opacity: 0.5 });
        }
        // Source containers (yellow squares)
        for (const pos of plan.sourceContainers.values()) {
            visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: 'yellow', opacity: 0.5 });
        }
        // Controller container (blue square)
        if (plan.destContainers.controller) {
            const pos = plan.destContainers.controller;
            visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: 'blue', opacity: 0.5 });
        }
        // Roads (gray lines)
        for (const pos of plan.roads) {
            visual.circle(pos, { fill: 'gray', radius: 0.2, opacity: 0.3 });
        }
    }
}

/**
 * Progression Manager - Intelligent Phase Detection
 *
 * Detects room progression state and triggers appropriate transitions
 * Enables fully autonomous progression from RCL 1 → RCL 6+
 *
 * Phase detection is data-driven based on actual room state:
 * - Structure completion
 * - Container operational status
 * - Creep composition readiness
 *
 * RCL 2 Progression Plan (OPTIMIZED):
 * Phase 1: Build source containers (mobile harvesters with drop mining, fast build)
 * Phase 2: Build extensions (haulers bring energy from containers, no walk time)
 * Phase 3: Build road network (stationary harvesters + full logistics)
 * Phase 4: Build controller container (convert builders to upgraders)
 */
var RCL2Phase;
(function (RCL2Phase) {
    RCL2Phase["PHASE_1_CONTAINERS"] = "phase1_containers";
    RCL2Phase["PHASE_2_EXTENSIONS"] = "phase2_extensions";
    RCL2Phase["PHASE_3_ROADS"] = "phase3_roads";
    RCL2Phase["PHASE_4_CONTROLLER"] = "phase4_controller";
    RCL2Phase["COMPLETE"] = "complete"; // RCL 2 progression complete
})(RCL2Phase || (RCL2Phase = {}));
class ProgressionManager {
    /**
     * Convert upgraders to builders when construction is needed
     * NO UPGRADERS during Phase 1-3 to prevent source traffic congestion
     * Returns number of creeps converted
     */
    static convertUpgradersToBuilders(room) {
        // Find all upgraders in the room
        const upgraders = room.find(FIND_MY_CREEPS, {
            filter: c => c.memory.role === "upgrader"
        });
        if (upgraders.length === 0) {
            return 0; // No upgraders to convert
        }
        // CRITICAL: Always keep at least 1 upgrader to prevent controller downgrade!
        if (upgraders.length === 1) {
            return 0; // Don't convert the last upgrader
        }
        // Convert all upgraders EXCEPT ONE to builders
        let converted = 0;
        for (let i = 0; i < upgraders.length - 1; i++) {
            const creep = upgraders[i];
            creep.memory.role = "builder";
            converted++;
        }
        if (converted > 0) {
            console.log(`🔄 Converted ${converted} upgrader(s) to builders (kept 1 to prevent downgrade)`);
        }
        return converted;
    }
    /**
     * Convert builders back to upgraders when infrastructure is complete (Phase 4)
     * Returns number of creeps converted
     */
    static convertBuildersToUpgraders(room) {
        // Only convert if there are no construction sites
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length > 0) {
            return 0; // Still building
        }
        // Find all builders in the room
        const builders = room.find(FIND_MY_CREEPS, {
            filter: c => c.memory.role === "builder"
        });
        if (builders.length === 0) {
            return 0; // No builders to convert
        }
        // Convert all builders to upgraders
        let converted = 0;
        for (const creep of builders) {
            creep.memory.role = "upgrader";
            converted++;
        }
        if (converted > 0) {
            console.log(`🔄 Converted ${converted} builder(s) to upgraders (infrastructure complete)`);
        }
        return converted;
    }
    /**
     * Detect current progression state for RCL 2
     */
    static detectRCL2State(room) {
        const state = {
            phase: RCL2Phase.PHASE_1_CONTAINERS,
            containersOperational: false,
            extensionsComplete: false,
            sourceContainersBuilt: 0,
            controllerContainerBuilt: false,
            roadsComplete: false,
            useStationaryHarvesters: false,
            useHaulers: false,
            allowRCL1Bodies: true
        };
        // Count infrastructure
        const extensions = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        });
        const containers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        const roads = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        });
        const roadSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        });
        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        // Check extension completion (RCL 2 = 5 extensions)
        state.extensionsComplete = extensions.length >= 5;
        // Check source containers
        for (const source of sources) {
            const nearbyContainers = source.pos.findInRange(containers, 1);
            if (nearbyContainers.length > 0) {
                state.sourceContainersBuilt++;
            }
        }
        // Check controller container
        if (controller) {
            const nearbyContainers = controller.pos.findInRange(containers, 3);
            state.controllerContainerBuilt = nearbyContainers.length > 0;
        }
        // Check if roads are complete (no road construction sites remaining)
        state.roadsComplete = roadSites.length === 0 && roads.length > 0;
        // Determine if containers are operational (at least 1 source container built)
        state.containersOperational = state.sourceContainersBuilt > 0;
        // Phase detection logic (NEW ORDER: Containers → Extensions → Roads → Controller)
        if (state.sourceContainersBuilt < sources.length) {
            // Phase 1: Building source containers
            // - Mobile harvesters: [WORK, WORK, MOVE] = 250 energy (drop mining)
            // - Drop energy near container sites for builders
            // - NO upgraders (prevent source congestion)
            // - NO haulers yet (nothing to haul from)
            state.phase = RCL2Phase.PHASE_1_CONTAINERS;
            state.useStationaryHarvesters = false;
            state.useHaulers = false;
            state.allowRCL1Bodies = false; // Use [WORK, WORK, MOVE] not [WORK, CARRY, MOVE]
        }
        else if (!state.extensionsComplete) {
            // Phase 2: Building extensions
            // - Source containers complete → spawn haulers
            // - Haulers bring energy from containers → spawn
            // - Builders withdraw from spawn (no walking to sources)
            // - Keep mobile harvesters until extensions complete
            state.phase = RCL2Phase.PHASE_2_EXTENSIONS;
            state.useStationaryHarvesters = false; // Can't afford [WORK×5, MOVE] yet (need 550 energy)
            state.useHaulers = true; // Containers operational
            state.allowRCL1Bodies = false;
        }
        else if (!state.roadsComplete) {
            // Phase 3: Building road network
            // - All 5 extensions complete → 550 energy available
            // - NOW spawn stationary harvesters [WORK×5, MOVE]
            // - Full hauler logistics operational
            // - Build road network
            state.phase = RCL2Phase.PHASE_3_ROADS;
            state.useStationaryHarvesters = true; // Extensions complete = 550 energy available
            state.useHaulers = true;
            state.allowRCL1Bodies = false;
        }
        else if (!state.controllerContainerBuilt) {
            // Phase 4: Building controller container
            // - Road network complete
            // - Building controller container
            state.phase = RCL2Phase.PHASE_4_CONTROLLER;
            state.useStationaryHarvesters = true;
            state.useHaulers = true;
            state.allowRCL1Bodies = false;
        }
        else {
            // Complete: All infrastructure built
            state.phase = RCL2Phase.COMPLETE;
            state.useStationaryHarvesters = true;
            state.useHaulers = true;
            state.containersOperational = true;
            state.allowRCL1Bodies = false;
        }
        return state;
    }
    /**
     * Check if at least one extension is built (triggers harvester filling)
     */
    static hasAnyExtensions(room) {
        const extensions = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        });
        return extensions.length > 0;
    }
    /**
     * Get container under construction sites for stationary harvester targeting
     */
    static getContainerConstructionSites(room) {
        return room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
    }
    /**
     * Find the next source container construction site to work on
     * Prioritizes sources closest to spawn
     */
    static getNextSourceContainerSite(room) {
        var _a;
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn)
            return null;
        const containerSites = this.getContainerConstructionSites(room);
        const sources = room.find(FIND_SOURCES);
        // Find container sites near sources
        const sourceContainerSites = [];
        for (const site of containerSites) {
            for (const source of sources) {
                if (site.pos.inRangeTo(source.pos, 1)) {
                    const distance = spawn.pos.getRangeTo(site.pos);
                    sourceContainerSites.push({ site, distance });
                    break;
                }
            }
        }
        // Sort by distance from spawn (closest first)
        sourceContainerSites.sort((a, b) => a.distance - b.distance);
        return ((_a = sourceContainerSites[0]) === null || _a === void 0 ? void 0 : _a.site) || null;
    }
    /**
     * Display progression status
     */
    static displayStatus(room, state) {
        console.log(`\n╔═════════════════════════════════════════╗`);
        console.log(`║ RCL 2 Progression Status                ║`);
        console.log(`╠═════════════════════════════════════════╣`);
        console.log(`║ Phase: ${state.phase.padEnd(32)} ║`);
        console.log(`║ Extensions: ${state.extensionsComplete ? '✅ Complete (5/5)' : '⏳ Building'.padEnd(21)} ║`);
        console.log(`║ Source Containers: ${state.sourceContainersBuilt}/2 ${state.sourceContainersBuilt === 2 ? '✅' : '⏳'}           ║`);
        console.log(`║ Roads: ${state.roadsComplete ? '✅ Complete' : '⏳ Building'.padEnd(29)} ║`);
        console.log(`║ Controller Container: ${state.controllerContainerBuilt ? '✅' : '❌'}          ║`);
        console.log(`║ Stationary Harvesters: ${state.useStationaryHarvesters ? '✅ Enabled ' : '❌ Disabled'}       ║`);
        console.log(`║ Hauler Logistics: ${state.useHaulers ? '✅ Enabled ' : '❌ Disabled'}           ║`);
        console.log(`║ RCL1 Bodies: ${state.allowRCL1Bodies ? '✅ Allowed ' : '🛑 Die Off'.padEnd(14)}           ║`);
        console.log(`╚═════════════════════════════════════════╝`);
    }
}

/**
 * Stats Tracker - Records progression metrics for analysis
 *
 * Tracks:
 * - Phase transitions and durations
 * - Milestone achievements (first extension, first hauler, etc.)
 * - Periodic snapshots of room state
 * - Performance metrics
 */
class StatsTracker {
    /**
     * Initialize stats tracking for a room
     */
    static initializeRoom(roomName) {
        if (!Memory.progressionStats) {
            Memory.progressionStats = {};
        }
        if (!Memory.progressionStats[roomName]) {
            Memory.progressionStats[roomName] = {
                startTime: Game.time,
                currentPhase: RCL2Phase.PHASE_1_EXTENSIONS,
                phaseStartTime: Game.time,
                phaseHistory: [],
                milestones: {},
                snapshots: []
            };
            console.log(`📊 Stats tracking initialized for ${roomName} at tick ${Game.time}`);
        }
    }
    /**
     * Record phase transition
     */
    static recordPhaseTransition(roomName, newPhase) {
        this.initializeRoom(roomName);
        const stats = Memory.progressionStats[roomName];
        // Close out previous phase
        if (stats.currentPhase !== newPhase) {
            const previousPhase = stats.currentPhase;
            const duration = Game.time - stats.phaseStartTime;
            stats.phaseHistory.push({
                phase: previousPhase,
                startTick: stats.phaseStartTime,
                endTick: Game.time,
                duration: duration
            });
            // Start new phase
            stats.currentPhase = newPhase;
            stats.phaseStartTime = Game.time;
            console.log(`📈 Phase Transition: ${previousPhase} → ${newPhase} (${duration} ticks)`);
        }
    }
    /**
     * Record milestones
     */
    static recordMilestones(room, progressionState) {
        this.initializeRoom(room.name);
        const stats = Memory.progressionStats[room.name];
        // First extension
        if (!stats.milestones.firstExtension) {
            const extensions = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_EXTENSION
            });
            if (extensions.length > 0) {
                stats.milestones.firstExtension = Game.time;
                console.log(`🎯 MILESTONE: First extension complete at tick ${Game.time}`);
            }
        }
        // All extensions complete
        if (!stats.milestones.allExtensionsComplete && progressionState.extensionsComplete) {
            stats.milestones.allExtensionsComplete = Game.time;
            const duration = Game.time - stats.startTime;
            console.log(`🎯 MILESTONE: All extensions complete at tick ${Game.time} (${duration} ticks from start)`);
        }
        // First container
        if (!stats.milestones.firstContainer) {
            const containers = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (containers.length > 0) {
                stats.milestones.firstContainer = Game.time;
                console.log(`🎯 MILESTONE: First container complete at tick ${Game.time}`);
            }
        }
        // All containers complete
        if (!stats.milestones.allContainersComplete) {
            const sources = room.find(FIND_SOURCES);
            if (progressionState.sourceContainersBuilt === sources.length && progressionState.controllerContainerBuilt) {
                stats.milestones.allContainersComplete = Game.time;
                console.log(`🎯 MILESTONE: All containers complete at tick ${Game.time}`);
            }
        }
        // First stationary harvester
        if (!stats.milestones.firstStationaryHarvester && progressionState.useStationaryHarvesters) {
            const creeps = room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === "harvester" && c.body.filter(p => p.type === WORK).length >= 5
            });
            if (creeps.length > 0) {
                stats.milestones.firstStationaryHarvester = Game.time;
                console.log(`🎯 MILESTONE: First stationary harvester spawned at tick ${Game.time}`);
            }
        }
        // First hauler
        if (!stats.milestones.firstHauler) {
            const haulers = room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === "hauler"
            });
            if (haulers.length > 0) {
                stats.milestones.firstHauler = Game.time;
                console.log(`🎯 MILESTONE: First hauler spawned at tick ${Game.time}`);
            }
        }
        // RCL 2 Complete
        if (!stats.milestones.rcl2Complete && progressionState.phase === RCL2Phase.COMPLETE) {
            stats.milestones.rcl2Complete = Game.time;
            const duration = Game.time - stats.startTime;
            console.log(`🎯 MILESTONE: RCL 2 progression complete at tick ${Game.time} (${duration} ticks total)`);
        }
    }
    /**
     * Take periodic snapshots of room state
     */
    static takeSnapshot(room, progressionState) {
        var _a;
        this.initializeRoom(room.name);
        const stats = Memory.progressionStats[room.name];
        // Take snapshots every 50 ticks
        if (Game.time % 50 === 0) {
            const extensions = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_EXTENSION
            }).length;
            const containers = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            }).length;
            const creeps = room.find(FIND_MY_CREEPS).length;
            stats.snapshots.push({
                tick: Game.time,
                phase: progressionState.phase,
                creepCount: creeps,
                energy: room.energyAvailable,
                energyCapacity: room.energyCapacityAvailable,
                controllerProgress: ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.progress) || 0,
                extensions: extensions,
                containers: containers
            });
            // Limit snapshot history to last 100 entries (5000 ticks)
            if (stats.snapshots.length > 100) {
                stats.snapshots.shift();
            }
        }
    }
    /**
     * Display comprehensive stats report
     */
    static displayReport(roomName) {
        var _a;
        const stats = (_a = Memory.progressionStats) === null || _a === void 0 ? void 0 : _a[roomName];
        if (!stats) {
            console.log(`No stats available for ${roomName}`);
            return;
        }
        const totalDuration = Game.time - stats.startTime;
        console.log(`\n╔════════════════════════════════════════════════════════╗`);
        console.log(`║         PROGRESSION STATS - ${roomName.padEnd(20)}       ║`);
        console.log(`╚════════════════════════════════════════════════════════╝`);
        console.log(`\n📊 Overview:`);
        console.log(`  Start Time: ${stats.startTime}`);
        console.log(`  Current Tick: ${Game.time}`);
        console.log(`  Total Duration: ${totalDuration} ticks`);
        console.log(`  Current Phase: ${stats.currentPhase}`);
        console.log(`\n🎯 Milestones:`);
        if (stats.milestones.firstExtension) {
            console.log(`  First Extension: Tick ${stats.milestones.firstExtension} (+${stats.milestones.firstExtension - stats.startTime})`);
        }
        if (stats.milestones.allExtensionsComplete) {
            console.log(`  All Extensions: Tick ${stats.milestones.allExtensionsComplete} (+${stats.milestones.allExtensionsComplete - stats.startTime})`);
        }
        if (stats.milestones.firstContainer) {
            console.log(`  First Container: Tick ${stats.milestones.firstContainer} (+${stats.milestones.firstContainer - stats.startTime})`);
        }
        if (stats.milestones.allContainersComplete) {
            console.log(`  All Containers: Tick ${stats.milestones.allContainersComplete} (+${stats.milestones.allContainersComplete - stats.startTime})`);
        }
        if (stats.milestones.firstStationaryHarvester) {
            console.log(`  First Stationary Harvester: Tick ${stats.milestones.firstStationaryHarvester} (+${stats.milestones.firstStationaryHarvester - stats.startTime})`);
        }
        if (stats.milestones.firstHauler) {
            console.log(`  First Hauler: Tick ${stats.milestones.firstHauler} (+${stats.milestones.firstHauler - stats.startTime})`);
        }
        if (stats.milestones.rcl2Complete) {
            console.log(`  RCL 2 Complete: Tick ${stats.milestones.rcl2Complete} (+${stats.milestones.rcl2Complete - stats.startTime})`);
        }
        console.log(`\n📈 Phase History:`);
        for (const phase of stats.phaseHistory) {
            console.log(`  ${phase.phase}: ${phase.duration} ticks (${phase.startTick} → ${phase.endTick})`);
        }
        console.log(`\n📸 Recent Snapshots (last 5):`);
        const recentSnapshots = stats.snapshots.slice(-5);
        for (const snap of recentSnapshots) {
            console.log(`  Tick ${snap.tick}: ${snap.phase} | Creeps: ${snap.creepCount} | Energy: ${snap.energy}/${snap.energyCapacity} | Ext: ${snap.extensions} | Con: ${snap.containers}`);
        }
        console.log(`\n`);
    }
}

/**
 * Room State Manager - RCL-based state machine
 * Orchestrates all room-level managers based on RCL configuration
 */
class RoomStateManager {
    /**
     * Main state machine - runs all managers for a room
     */
    static run(room) {
        var _a;
        if (!room.controller || !room.controller.my)
            return;
        const config = this.getConfigForRoom(room);
        if (!config) {
            console.log(`⚠️ No config available for room ${room.name}`);
            return;
        }
        // Cache config for creeps to access
        this.roomConfigs.set(room.name, config);
        // Detect and cache progression state (RCL 2+)
        const rcl = room.controller.level;
        let progressionState;
        if (rcl >= 2) {
            progressionState = ProgressionManager.detectRCL2State(room);
            this.progressionStates.set(room.name, progressionState);
            // Initialize stats tracking on first run
            StatsTracker.initializeRoom(room.name);
            // Track phase transitions
            const stats = (_a = Memory.progressionStats) === null || _a === void 0 ? void 0 : _a[room.name];
            if (stats && stats.currentPhase !== progressionState.phase) {
                StatsTracker.recordPhaseTransition(room.name, progressionState.phase);
            }
            // Record milestones and take snapshots
            StatsTracker.recordMilestones(room, progressionState);
            StatsTracker.takeSnapshot(room, progressionState);
            // Convert upgraders to builders during Phase 1-3 (prevent source congestion)
            if (progressionState.phase === RCL2Phase.PHASE_1_EXTENSIONS ||
                progressionState.phase === RCL2Phase.PHASE_2_CONTAINERS ||
                progressionState.phase === RCL2Phase.PHASE_3_ROADS) {
                ProgressionManager.convertUpgradersToBuilders(room);
            }
            // Convert builders back to upgraders in Phase 4+ (infrastructure complete)
            if (progressionState.phase === RCL2Phase.COMPLETE) {
                ProgressionManager.convertBuildersToUpgraders(room);
            }
        }
        // Get primary spawn
        const spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0)
            return;
        const spawn = spawns[0];
        // Run spawn manager (demand-based, no config needed)
        SpawnManager.run(spawn);
        // Run assignment manager
        AssignmentManager.run(room, config);
        // Run architect (automatic infrastructure planning)
        Architect.run(room);
        // Display status periodically
        if (Game.time % 50 === 0) {
            this.displayRoomStatus(room, config);
            // Display progression status for RCL 2+
            if (progressionState) {
                ProgressionManager.displayStatus(room, progressionState);
            }
        }
    }
    /**
     * Get cached progression state for a room
     */
    static getProgressionState(roomName) {
        return this.progressionStates.get(roomName) || null;
    }
    /**
     * Get config for a room based on its RCL
     */
    static getConfigForRoom(room) {
        if (!room.controller)
            return null;
        return this.getConfigForRCL(room.controller.level);
    }
    /**
     * Get cached config for a creep's room
     */
    static getConfigForCreep(creep) {
        return this.roomConfigs.get(creep.room.name) || null;
    }
    /**
     * Get config for a specific RCL, with fallback to highest available RCL config
     */
    static getConfigForRCL(rcl) {
        // Try exact RCL match first
        if (this.RCL_CONFIGS[rcl]) {
            return this.RCL_CONFIGS[rcl];
        }
        // Fallback: Find highest available config that's less than or equal to current RCL
        const availableRCLs = Object.keys(this.RCL_CONFIGS)
            .map(Number)
            .filter(configRcl => configRcl <= rcl)
            .sort((a, b) => b - a); // Sort descending
        if (availableRCLs.length > 0) {
            const fallbackRCL = availableRCLs[0];
            if (Game.time % 100 === 0) {
                console.log(`ℹ️ Room ${Game.rooms[Object.keys(Game.rooms)[0]].name}: Using RCL ${fallbackRCL} config for RCL ${rcl} (fallback)`);
            }
            return this.RCL_CONFIGS[fallbackRCL];
        }
        return null;
    }
    /**
     * Display consolidated room status
     */
    static displayRoomStatus(room, config) {
        var _a, _b, _c;
        console.log(`\n╔═══════════════════════════════════════════╗`);
        console.log(`║ Room Status: ${room.name.padEnd(28)} ║`);
        console.log(`╠═══════════════════════════════════════════╣`);
        console.log(`║ RCL: ${((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0} | Progress: ${(_b = room.controller) === null || _b === void 0 ? void 0 : _b.progress}/${(_c = room.controller) === null || _c === void 0 ? void 0 : _c.progressTotal}`.padEnd(44) + '║');
        console.log(`║ Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`.padEnd(44) + '║');
        console.log(`╚═══════════════════════════════════════════╝`);
        AssignmentManager.displayAssignments(room, config);
    }
}
// Map of RCL configs (centralized here instead of SpawnManager)
RoomStateManager.RCL_CONFIGS = {
    1: RCL1Config,
    2: RCL2Config
    // TODO: Add RCL 3-8 configs as we progress
};
// Cache configs by room name for creep access
RoomStateManager.roomConfigs = new Map();
// Cache progression states for each room
RoomStateManager.progressionStates = new Map();

class RoleBuilder {
    static run(creep, config) {
        // Get role config for this role
        const roleConfig = config.roles.builder;
        if (!roleConfig) {
            console.log(`⚠️ No builder config found for ${creep.name}`);
            return;
        }
        // CRITICAL: State transitions only happen when COMPLETELY full or COMPLETELY empty
        // This prevents builders from wandering around half-full
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
            delete creep.memory.energySourceId; // Clear locked source when empty
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
            delete creep.memory.energySourceId; // Clear locked source when full
        }
        if (creep.memory.working) {
            // Intelligent construction prioritization
            const target = this.findBestConstructionTarget(creep);
            if (target) {
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, target);
                }
            }
            else {
                // If no construction sites, upgrade controller
                if (creep.room.controller) {
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, creep.room.controller);
                    }
                }
            }
        }
        else {
            // Energy collection priority with TARGET LOCKING
            // Lock onto ONE energy source and stick with it until COMPLETELY FULL
            // This prevents wandering between ruins, spawns, drops, sources mid-gathering
            // If we have a locked target, try to use it first
            if (creep.memory.energySourceId) {
                const lockedTarget = Game.getObjectById(creep.memory.energySourceId);
                // Validate locked target still has energy
                let targetValid = false;
                if (lockedTarget) {
                    if (lockedTarget instanceof Resource) {
                        targetValid = lockedTarget.amount > 0;
                    }
                    else if (lockedTarget instanceof Source) {
                        targetValid = lockedTarget.energy > 0;
                    }
                    else if (lockedTarget.store) {
                        targetValid = lockedTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
                    }
                }
                // If locked target is still valid, use it
                if (targetValid) {
                    if (lockedTarget instanceof Resource) {
                        if (creep.pickup(lockedTarget) === ERR_NOT_IN_RANGE) {
                            Traveler.travelTo(creep, lockedTarget);
                        }
                    }
                    else if (lockedTarget instanceof Source) {
                        if (creep.harvest(lockedTarget) === ERR_NOT_IN_RANGE) {
                            Traveler.travelTo(creep, lockedTarget);
                        }
                    }
                    else {
                        if (creep.withdraw(lockedTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            Traveler.travelTo(creep, lockedTarget);
                        }
                    }
                    return; // Stick with locked target
                }
                else {
                    // Locked target exhausted - clear lock and find new target
                    delete creep.memory.energySourceId;
                }
            }
            // No locked target - find and LOCK onto new energy source
            // Priority:
            // 1. Dropped energy near construction site (free energy at the worksite!)
            // 2. Ruins (free energy from dead structures)
            // 3. Spawn/Extensions (if surplus)
            // 4. Dropped energy anywhere
            // 5. Harvest source (crisis mode)
            // FIRST: Check for dropped energy near our construction target (super efficient!)
            const constructionTarget = this.findBestConstructionTarget(creep);
            if (constructionTarget) {
                const nearbyDropped = constructionTarget.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                });
                if (nearbyDropped.length > 0) {
                    // Sort by amount (grab biggest pile first)
                    nearbyDropped.sort((a, b) => b.amount - a.amount);
                    const dropped = nearbyDropped[0];
                    creep.memory.energySourceId = dropped.id; // LOCK IT
                    if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, dropped);
                    }
                    return;
                }
            }
            // SECOND PRIORITY: Loot ruins (common with captured rooms)
            const ruins = creep.room.find(FIND_RUINS);
            const ruinWithEnergy = ruins.find(r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
            if (ruinWithEnergy) {
                creep.memory.energySourceId = ruinWithEnergy.id; // LOCK IT
                if (creep.withdraw(ruinWithEnergy, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, ruinWithEnergy);
                }
                return;
            }
            // THIRD PRIORITY: Withdraw from spawn/extensions
            // SMART LOGIC: Check if there are pending spawn requests
            // If no pending requests, spawn energy is "free" for builders!
            const pendingRequests = SpawnRequestGenerator.generateRequests(creep.room);
            const hasPendingSpawns = pendingRequests && pendingRequests.length > 0;
            // Allow withdrawal if:
            // 1. No pending spawn requests (energy is free!), OR
            // 2. Room has surplus energy (>200 minimum)
            const canWithdrawFromSpawn = !hasPendingSpawns || creep.room.energyAvailable >= 200;
            if (canWithdrawFromSpawn) {
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN) &&
                            structure.store &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
                    }
                });
                if (target) {
                    creep.memory.energySourceId = target.id; // LOCK IT
                    if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, target);
                    }
                    return;
                }
            }
            // Energy reserved for spawning OR no energy in spawn/extensions
            // Help bootstrap economy: pickup dropped energy or harvest from sources
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: resource => resource.resourceType === RESOURCE_ENERGY
            });
            if (droppedEnergy) {
                creep.memory.energySourceId = droppedEnergy.id; // LOCK IT
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, droppedEnergy);
                }
            }
            else {
                // CRISIS MODE: Harvest directly from source
                const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    creep.memory.energySourceId = source.id; // LOCK IT
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        Traveler.travelTo(creep, source);
                    }
                }
            }
        }
    }
    /**
     * Find the best construction target using progression-aware intelligent prioritization
     *
     * Priority order:
     * 1. CURRENT PHASE PRIORITY: Build structures needed for current phase progression
     * 2. FINISH STARTED: Continue building partially-built structures
     * 3. FALLBACK PRIORITY: Extensions > Containers > Roads
     */
    static findBestConstructionTarget(creep) {
        const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0)
            return null;
        // Get current progression state
        const progressionState = RoomStateManager.getProgressionState(creep.room.name);
        // Determine phase-priority structure type
        let phasePriorityType = null;
        if (progressionState) {
            switch (progressionState.phase) {
                case RCL2Phase.PHASE_1_EXTENSIONS:
                    phasePriorityType = STRUCTURE_EXTENSION;
                    break;
                case RCL2Phase.PHASE_2_CONTAINERS:
                    phasePriorityType = STRUCTURE_CONTAINER;
                    break;
                case RCL2Phase.PHASE_3_ROADS:
                    phasePriorityType = STRUCTURE_ROAD;
                    break;
                case RCL2Phase.PHASE_4_CONTROLLER:
                    phasePriorityType = STRUCTURE_CONTAINER;
                    break;
            }
        }
        // 1. HIGHEST PRIORITY: Build phase-appropriate structures FIRST
        if (phasePriorityType) {
            const phaseSites = sites.filter(site => site.structureType === phasePriorityType);
            if (phaseSites.length > 0) {
                // If any are partially built, finish those first
                const partiallyBuilt = phaseSites.filter(site => site.progress > 0);
                if (partiallyBuilt.length > 0) {
                    // Sort by most progress (closest to completion)
                    partiallyBuilt.sort((a, b) => {
                        const aProgress = a.progress / a.progressTotal;
                        const bProgress = b.progress / b.progressTotal;
                        return bProgress - aProgress;
                    });
                    return partiallyBuilt[0];
                }
                // Otherwise, start building any phase-priority structure
                return creep.pos.findClosestByPath(phaseSites) || phaseSites[0];
            }
        }
        // 2. SECONDARY PRIORITY: Finish any partially-built structures (even if not phase priority)
        const partiallyBuilt = sites.filter(site => site.progress > 0);
        if (partiallyBuilt.length > 0) {
            // Sort by most progress (closest to completion)
            partiallyBuilt.sort((a, b) => {
                const aProgress = a.progress / a.progressTotal;
                const bProgress = b.progress / b.progressTotal;
                return bProgress - aProgress;
            });
            return partiallyBuilt[0];
        }
        // 3. FALLBACK: Use standard priority order for new construction
        const priorityOrder = [
            STRUCTURE_EXTENSION,
            STRUCTURE_CONTAINER,
            STRUCTURE_ROAD
        ];
        for (const structureType of priorityOrder) {
            const sitesOfType = sites.filter(site => site.structureType === structureType);
            if (sitesOfType.length > 0) {
                return creep.pos.findClosestByPath(sitesOfType) || sitesOfType[0];
            }
        }
        // 4. LAST RESORT: Any remaining construction site
        return creep.pos.findClosestByPath(sites);
    }
}

class RoleHauler {
    static run(creep, config) {
        var _a;
        // Toggle working state
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
        }
        if (creep.memory.working) {
            // Deliver to spawn/extensions
            const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN) &&
                        structure.store &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                }
            });
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, target);
                }
            }
            else {
                // If spawn/extensions full, deliver to controller container
                const controllerContainer = (_a = creep.room.controller) === null || _a === void 0 ? void 0 : _a.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })[0];
                if (controllerContainer === null || controllerContainer === void 0 ? void 0 : controllerContainer.store) {
                    const freeCapacity = controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY);
                    if (freeCapacity && freeCapacity > 0) {
                        if (creep.transfer(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            Traveler.travelTo(creep, controllerContainer);
                        }
                    }
                }
            }
        }
        else {
            // Collect energy - prioritize dropped energy, then containers
            // 1. Dropped energy (from stationary harvesters during Phase 2)
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, droppedEnergy);
                }
                return;
            }
            // 2. Source containers
            const sourceContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => {
                    var _a;
                    if (s.structureType !== STRUCTURE_CONTAINER)
                        return false;
                    const container = s;
                    const energy = (_a = container.store) === null || _a === void 0 ? void 0 : _a.getUsedCapacity(RESOURCE_ENERGY);
                    return energy !== null && energy !== undefined && energy > 0;
                }
            });
            if (sourceContainer) {
                if (creep.withdraw(sourceContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Traveler.travelTo(creep, sourceContainer);
                }
                return;
            }
            // 3. No energy available - idle off road network
            // Haulers have no WORK parts, so they can't harvest
            // Track idle time for spawn management metrics
            const controller = creep.room.controller;
            if (controller) {
                // Move to controller area (typically off main roads)
                if (creep.pos.getRangeTo(controller) > 3) {
                    Traveler.travelTo(creep, controller, { range: 3 });
                }
            }
        }
    }
}

/**
 * Stats Collector - Tracks performance and room metrics
 * Stores data in Memory.stats with automatic cleanup of old data
 */
class StatsCollector {
    /**
     * Collect stats for current tick
     */
    static collect() {
        const tick = Game.time;
        // Initialize stats structure if needed
        if (!Memory.stats) {
            Memory.stats = {};
        }
        const stats = {
            time: tick,
            cpu: {
                used: Game.cpu.getUsed(),
                limit: Game.cpu.limit,
                bucket: Game.cpu.bucket
            },
            memory: {
                used: RawMemory.get().length
            },
            gcl: {
                level: Game.gcl.level,
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal
            },
            rooms: {}
        };
        // Collect room stats
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my)
                continue;
            stats.rooms[roomName] = this.collectRoomStats(room);
        }
        // Store stats for this tick
        Memory.stats[tick] = stats;
        // Clean up old stats
        this.cleanup();
    }
    /**
     * Collect stats for a single room
     */
    static collectRoomStats(room) {
        var _a, _b, _c, _d;
        // Count creeps by role
        const creepCounts = {};
        const creeps = room.find(FIND_MY_CREEPS);
        for (const creep of creeps) {
            const role = creep.memory.role;
            creepCounts[role] = (creepCounts[role] || 0) + 1;
        }
        // Count spawns
        const spawns = room.find(FIND_MY_SPAWNS);
        const spawningCount = spawns.filter(s => s.spawning).length;
        // Source stats
        const sources = room.find(FIND_SOURCES);
        let totalEnergy = 0;
        let totalCapacity = 0;
        let assignedWorkParts = 0;
        for (const source of sources) {
            totalEnergy += source.energy;
            totalCapacity += source.energyCapacity;
            // Count assigned work parts
            const assignedCreeps = Object.values(Game.creeps).filter(c => c.memory.assignedSource === source.id);
            assignedWorkParts += assignedCreeps.reduce((total, creep) => {
                return total + creep.body.filter(part => part.type === WORK).length;
            }, 0);
        }
        return {
            rcl: ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0,
            controller: {
                progress: ((_b = room.controller) === null || _b === void 0 ? void 0 : _b.progress) || 0,
                progressTotal: ((_c = room.controller) === null || _c === void 0 ? void 0 : _c.progressTotal) || 0,
                ticksToDowngrade: ((_d = room.controller) === null || _d === void 0 ? void 0 : _d.ticksToDowngrade) || 0
            },
            energy: {
                available: room.energyAvailable,
                capacity: room.energyCapacityAvailable
            },
            creeps: creepCounts,
            spawns: {
                total: spawns.length,
                spawning: spawningCount
            },
            sources: {
                total: sources.length,
                energyAvailable: totalEnergy,
                energyCapacity: totalCapacity,
                assignedWorkParts: assignedWorkParts,
                maxWorkParts: sources.length * 5 // 5 work parts per source max
            }
        };
    }
    /**
     * Clean up old stats to prevent Memory bloat
     */
    static cleanup() {
        if (!Memory.stats)
            return;
        const ticks = Object.keys(Memory.stats).map(Number).sort((a, b) => b - a);
        // Keep only the most recent ticks
        if (ticks.length > this.MAX_TICKS_STORED) {
            const ticksToRemove = ticks.slice(this.MAX_TICKS_STORED);
            for (const tick of ticksToRemove) {
                delete Memory.stats[tick];
            }
        }
    }
    /**
     * Get stats for a specific tick
     */
    static getStats(tick) {
        if (!Memory.stats || !Memory.stats[tick])
            return null;
        return Memory.stats[tick];
    }
    /**
     * Get all stored stats
     */
    static getAllStats() {
        return Memory.stats || {};
    }
    /**
     * Clear all stats (useful for debugging)
     */
    static clear() {
        Memory.stats = {};
    }
    /**
     * Display stats summary in console
     */
    static displaySummary() {
        if (!Memory.stats) {
            console.log("No stats collected yet");
            return;
        }
        const ticks = Object.keys(Memory.stats).map(Number).sort((a, b) => b - a);
        if (ticks.length === 0) {
            console.log("No stats collected yet");
            return;
        }
        const latestTick = ticks[0];
        const stats = Memory.stats[latestTick];
        console.log(`\n╔════════════════════════════════════════════╗`);
        console.log(`║ Stats Summary (Tick ${latestTick})`.padEnd(45) + '║');
        console.log(`╠════════════════════════════════════════════╣`);
        console.log(`║ CPU: ${stats.cpu.used.toFixed(2)}/${stats.cpu.limit} | Bucket: ${stats.cpu.bucket}`.padEnd(45) + '║');
        console.log(`║ Memory: ${(stats.memory.used / 1024).toFixed(1)} KB`.padEnd(45) + '║');
        console.log(`║ GCL: ${stats.gcl.level} (${stats.gcl.progress}/${stats.gcl.progressTotal})`.padEnd(45) + '║');
        console.log(`╠════════════════════════════════════════════╣`);
        for (const roomName in stats.rooms) {
            const room = stats.rooms[roomName];
            const creepCounts = Object.values(room.creeps);
            const totalCreeps = creepCounts.reduce((a, b) => a + b, 0);
            console.log(`║ Room: ${roomName}`.padEnd(45) + '║');
            console.log(`║   RCL: ${room.rcl} | Energy: ${room.energy.available}/${room.energy.capacity}`.padEnd(45) + '║');
            console.log(`║   Creeps: ${totalCreeps}`.padEnd(45) + '║');
            for (const role in room.creeps) {
                console.log(`║     ${role}: ${room.creeps[role]}`.padEnd(45) + '║');
            }
        }
        console.log(`╚════════════════════════════════════════════╝`);
        console.log(`Stored ticks: ${ticks.length}/${this.MAX_TICKS_STORED}`);
    }
}
StatsCollector.MAX_TICKS_STORED = 20; // Keep last 20 ticks of stats

/**
 * Distance Transform Test
 *
 * Tests the Distance Transform algorithm for optimal structure placement.
 * This uses a two-pass algorithm to calculate the distance of each tile from the nearest wall.
 * The result is used to find the best "anchor" position for compact base layouts.
 *
 * Usage: Run `testDistanceTransform('W1N1')` from the console
 */
class DistanceTransformTest {
    /**
     * Run the Distance Transform test for a room
     * Visualizes the results in the game
     */
    static run(roomName) {
        console.log(`\n╔═══════════════════════════════════════════╗`);
        console.log(`║ Distance Transform Test                   ║`);
        console.log(`║ Room: ${roomName.padEnd(36)} ║`);
        console.log(`╚═══════════════════════════════════════════╝\n`);
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`❌ Room ${roomName} not visible. Cannot run test.`);
            return;
        }
        // Step 1: Calculate Distance Transform
        console.log(`⏳ Calculating Distance Transform...`);
        const distanceMatrix = this.calculateDistanceTransform(room);
        console.log(`✅ Distance Transform complete`);
        // Step 2: Find best anchor point
        console.log(`⏳ Finding optimal anchor position...`);
        const anchorPos = this.findBestAnchor(room, distanceMatrix);
        if (!anchorPos) {
            console.log(`❌ Could not find valid anchor position`);
            return;
        }
        console.log(`✅ Anchor found at (${anchorPos.x}, ${anchorPos.y}) with distance value ${distanceMatrix.get(anchorPos.x, anchorPos.y)}`);
        // Step 3: Generate spiral structure positions
        console.log(`⏳ Generating spiral structure positions...`);
        const structureCount = 11; // 5 extensions + 6 for testing
        const structurePositions = this.generateSpiralPositions(room, anchorPos, structureCount);
        console.log(`✅ Generated ${structurePositions.length} structure positions`);
        // Step 4: Visualize everything
        console.log(`⏳ Rendering visualization...`);
        this.visualize(room, distanceMatrix, anchorPos, structurePositions);
        console.log(`✅ Visualization complete`);
        console.log(`\n✅ Distance Transform test complete!`);
        console.log(`   Check room ${roomName} for visual results.`);
    }
    /**
     * Two-pass Distance Transform algorithm
     * Returns a CostMatrix where each tile's value is its distance from the nearest wall
     */
    static calculateDistanceTransform(room) {
        const terrain = room.getTerrain();
        const matrix = new PathFinder.CostMatrix();
        // Initialize: Walls = 0, All other tiles = 255 (max distance)
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    matrix.set(x, y, 0);
                }
                else {
                    matrix.set(x, y, 255);
                }
            }
        }
        // First pass: Top-left to bottom-right
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (matrix.get(x, y) === 0)
                    continue; // Skip walls
                let minDist = matrix.get(x, y);
                // Check top neighbor
                if (y > 0) {
                    minDist = Math.min(minDist, matrix.get(x, y - 1) + 1);
                }
                // Check left neighbor
                if (x > 0) {
                    minDist = Math.min(minDist, matrix.get(x - 1, y) + 1);
                }
                // Check top-left diagonal
                if (x > 0 && y > 0) {
                    minDist = Math.min(minDist, matrix.get(x - 1, y - 1) + 1);
                }
                // Check top-right diagonal
                if (x < 49 && y > 0) {
                    minDist = Math.min(minDist, matrix.get(x + 1, y - 1) + 1);
                }
                matrix.set(x, y, minDist);
            }
        }
        // Second pass: Bottom-right to top-left
        for (let y = 49; y >= 0; y--) {
            for (let x = 49; x >= 0; x--) {
                if (matrix.get(x, y) === 0)
                    continue; // Skip walls
                let minDist = matrix.get(x, y);
                // Check bottom neighbor
                if (y < 49) {
                    minDist = Math.min(minDist, matrix.get(x, y + 1) + 1);
                }
                // Check right neighbor
                if (x < 49) {
                    minDist = Math.min(minDist, matrix.get(x + 1, y) + 1);
                }
                // Check bottom-right diagonal
                if (x < 49 && y < 49) {
                    minDist = Math.min(minDist, matrix.get(x + 1, y + 1) + 1);
                }
                // Check bottom-left diagonal
                if (x > 0 && y < 49) {
                    minDist = Math.min(minDist, matrix.get(x - 1, y + 1) + 1);
                }
                matrix.set(x, y, minDist);
            }
        }
        return matrix;
    }
    /**
     * Find the best anchor point (tile with highest distance value)
     * This is the most "open" spot in the room
     */
    static findBestAnchor(room, distanceMatrix) {
        let maxDistance = 0;
        let bestPos = null;
        // Avoid edges (3 tiles from border)
        for (let y = 3; y < 47; y++) {
            for (let x = 3; x < 47; x++) {
                const distance = distanceMatrix.get(x, y);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    bestPos = { x, y };
                }
            }
        }
        if (!bestPos)
            return null;
        return new RoomPosition(bestPos.x, bestPos.y, room.name);
    }
    /**
     * Generate structure positions in a spiral pattern around the anchor
     * Uses checkerboard pattern to ensure spacing between structures
     */
    static generateSpiralPositions(room, anchor, count) {
        const positions = [];
        const terrain = room.getTerrain();
        // Spiral outward from anchor
        let radius = 0;
        const maxRadius = 10; // Don't spiral too far
        while (positions.length < count && radius < maxRadius) {
            // Check all tiles in the current ring
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip tiles not on the edge of the current ring
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }
                    const x = anchor.x + dx;
                    const y = anchor.y + dy;
                    // Bounds check
                    if (x < 1 || x > 48 || y < 1 || y > 48)
                        continue;
                    // Checkerboard pattern: Only place on tiles where (x + y) is even
                    if ((x + y) % 2 !== 0)
                        continue;
                    // Skip walls
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL)
                        continue;
                    // Valid position!
                    positions.push(new RoomPosition(x, y, room.name));
                    if (positions.length >= count)
                        break;
                }
                if (positions.length >= count)
                    break;
            }
            radius++;
        }
        return positions;
    }
    /**
     * Visualize the Distance Transform results
     */
    static visualize(room, distanceMatrix, anchor, structurePositions) {
        const visual = room.visual;
        // Clear previous visuals
        visual.clear();
        // Draw distance values (color-coded)
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                const distance = distanceMatrix.get(x, y);
                // Skip walls (distance 0)
                if (distance === 0)
                    continue;
                // Color gradient: Blue (low distance) to Red (high distance)
                const normalizedDist = Math.min(distance / 10, 1); // Cap at 10 for color
                const red = Math.floor(normalizedDist * 255);
                const blue = Math.floor((1 - normalizedDist) * 255);
                const color = `#${red.toString(16).padStart(2, '0')}00${blue.toString(16).padStart(2, '0')}`;
                // Draw text showing distance value
                visual.text(distance.toString(), x, y + 0.25, {
                    color: color,
                    font: 0.4,
                    opacity: 0.6
                });
                // Draw background circle for better visibility
                visual.circle(x, y, {
                    radius: 0.35,
                    fill: color,
                    opacity: 0.1
                });
            }
        }
        // Draw anchor point (large green circle)
        visual.circle(anchor.x, anchor.y, {
            radius: 0.8,
            fill: '#00ff00',
            opacity: 0.5,
            stroke: '#00ff00',
            strokeWidth: 0.2
        });
        visual.text('ANCHOR', anchor.x, anchor.y - 1, {
            color: '#00ff00',
            font: 0.6,
            align: 'center'
        });
        // Draw structure positions (yellow circles)
        for (const pos of structurePositions) {
            visual.circle(pos.x, pos.y, {
                radius: 0.5,
                fill: '#ffff00',
                opacity: 0.4,
                stroke: '#ffff00',
                strokeWidth: 0.15
            });
        }
        // Draw legend
        visual.text('Distance Transform Test', 1, 1, {
            color: '#ffffff',
            font: 0.8,
            align: 'left',
            backgroundColor: '#000000',
            backgroundPadding: 0.2
        });
        visual.text(`Anchor: (${anchor.x}, ${anchor.y})`, 1, 2.5, {
            color: '#00ff00',
            font: 0.6,
            align: 'left'
        });
        visual.text(`Structures: ${structurePositions.length} planned`, 1, 3.5, {
            color: '#ffff00',
            font: 0.6,
            align: 'left'
        });
        visual.text('Blue = Near walls, Red = Open space', 1, 4.5, {
            color: '#ffffff',
            font: 0.5,
            align: 'left'
        });
    }
}

/**
 * Console commands for manual spawn control
 * Usage: Call these functions from the Screeps console
 */
class ConsoleCommands {
    /**
     * Spawn a creep with specified role and body parts
     * Usage: spawnCreep('harvester', [WORK, CARRY, MOVE])
     * Usage: spawnCreep('harvester', [WORK, CARRY, MOVE], 'Spawn1')
     */
    static spawnCreep(role, body, spawnName) {
        const spawn = spawnName ? Game.spawns[spawnName] : Object.values(Game.spawns)[0];
        if (!spawn) {
            return `❌ Spawn ${spawnName || "default"} not found!`;
        }
        const name = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
        const result = spawn.spawnCreep(body, name, {
            memory: { role, room: spawn.room.name, working: false }
        });
        if (result === OK) {
            return `✅ Spawning ${role} "${name}" with body: [${body.join(", ")}]`;
        }
        else {
            return `❌ Failed to spawn ${role}: ${this.getErrorName(result)}`;
        }
    }
    /**
     * Spawn a harvester (quick command)
     * Usage: spawnHarvester()
     * Usage: spawnHarvester([WORK, WORK, CARRY, MOVE])
     */
    static spawnHarvester(body) {
        return this.spawnCreep("harvester", body || [WORK, CARRY, MOVE]);
    }
    /**
     * Spawn a builder (quick command)
     * Usage: spawnBuilder()
     * Usage: spawnBuilder([WORK, WORK, CARRY, MOVE])
     */
    static spawnBuilder(body) {
        return this.spawnCreep("builder", body || [WORK, CARRY, MOVE]);
    }
    /**
     * Spawn an upgrader (quick command)
     * Usage: spawnUpgrader()
     * Usage: spawnUpgrader([WORK, WORK, CARRY, MOVE])
     */
    static spawnUpgrader(body) {
        return this.spawnCreep("upgrader", body || [WORK, CARRY, MOVE]);
    }
    /**
     * Get creep count by role
     * Usage: getCreepCount()
     * Usage: getCreepCount('harvester')
     */
    static getCreepCount(role) {
        if (role) {
            const count = Object.values(Game.creeps).filter(c => c.memory.role === role).length;
            return `${role}: ${count}`;
        }
        const counts = {};
        for (const creep of Object.values(Game.creeps)) {
            counts[creep.memory.role] = (counts[creep.memory.role] || 0) + 1;
        }
        let result = "🤖 Creep counts:\n";
        for (const [r, count] of Object.entries(counts)) {
            result += `  ${r}: ${count}\n`;
        }
        result += `  Total: ${Object.values(Game.creeps).length}`;
        return result;
    }
    /**
     * Kill a creep by name
     * Usage: killCreep('Harvester123')
     */
    static killCreep(name) {
        const creep = Game.creeps[name];
        if (!creep) {
            return `❌ Creep "${name}" not found!`;
        }
        creep.suicide();
        return `💀 Killed ${creep.memory.role} "${name}"`;
    }
    /**
     * Kill all creeps of a specific role
     * Usage: killRole('harvester')
     */
    static killRole(role) {
        const creeps = Object.values(Game.creeps).filter(c => c.memory.role === role);
        if (creeps.length === 0) {
            return `❌ No ${role}s found!`;
        }
        creeps.forEach(c => c.suicide());
        return `💀 Killed ${creeps.length} ${role}(s)`;
    }
    /**
     * Calculate body cost
     * Usage: bodyCost([WORK, WORK, CARRY, MOVE])
     */
    static bodyCost(body) {
        const cost = body.reduce((total, part) => total + BODYPART_COST[part], 0);
        return `Body cost: ${cost} energy\nParts: [${body.join(", ")}]`;
    }
    /**
     * Generate an optimal body based on energy available
     * Usage: optimalBody('harvester', 300)
     */
    static optimalBody(role, energy) {
        const parts = [];
        let remaining = energy;
        if (role === "harvester") {
            // Prioritize: 2 WORK, 1 CARRY, 1 MOVE as base, then scale
            const base = [WORK, WORK, CARRY, MOVE];
            const baseCost = this.calculateCost(base);
            if (remaining >= baseCost) {
                parts.push(...base);
                remaining -= baseCost;
                // Add more sets if possible
                while (remaining >= baseCost) {
                    parts.push(...base);
                    remaining -= baseCost;
                }
            }
        }
        else if (role === "upgrader" || role === "builder") {
            // Balanced WORK, CARRY, MOVE
            while (remaining >= 200) {
                parts.push(WORK, CARRY, MOVE);
                remaining -= 200;
            }
        }
        if (parts.length === 0) {
            return `❌ Not enough energy (${energy}) for ${role}`;
        }
        return `Optimal ${role} body (${energy} energy):\n[${parts.join(", ")}]\nCost: ${this.calculateCost(parts)} energy`;
    }
    /**
     * List all spawns and their status
     * Usage: listSpawns()
     */
    static listSpawns() {
        let result = "🏭 Spawns:\n";
        for (const [name, spawn] of Object.entries(Game.spawns)) {
            result += `  ${name} - Room: ${spawn.room.name}\n`;
            result += `    Energy: ${spawn.room.energyAvailable}/${spawn.room.energyCapacityAvailable}\n`;
            if (spawn.spawning) {
                const spawningCreep = Game.creeps[spawn.spawning.name];
                result += `    Spawning: ${spawningCreep.memory.role} (${spawn.spawning.remainingTime} ticks)\n`;
            }
            else {
                result += `    Status: Idle\n`;
            }
        }
        return result;
    }
    /**
     * Display stats summary
     * Usage: stats()
     */
    static showStats() {
        StatsCollector.displaySummary();
    }
    /**
     * Clear all collected stats
     * Usage: clearStats()
     */
    static clearStats() {
        StatsCollector.clear();
        return "✅ Stats cleared";
    }
    /**
     * Test Distance Transform algorithm
     * Usage: testDistanceTransform('W1N1')
     */
    static testDistanceTransform(roomName) {
        DistanceTransformTest.run(roomName);
    }
    // Helper methods
    static calculateCost(body) {
        return body.reduce((total, part) => total + BODYPART_COST[part], 0);
    }
    static getErrorName(code) {
        const errors = {
            [ERR_NOT_OWNER]: "ERR_NOT_OWNER",
            [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS",
            [ERR_BUSY]: "ERR_BUSY",
            [ERR_NOT_ENOUGH_ENERGY]: "ERR_NOT_ENOUGH_ENERGY",
            [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS",
            [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH"
        };
        return errors[code] || `Error code: ${code}`;
    }
}
// Expose commands to global scope for console use
global.spawn = ConsoleCommands.spawnCreep.bind(ConsoleCommands);
global.spawnHarvester = ConsoleCommands.spawnHarvester.bind(ConsoleCommands);
global.spawnBuilder = ConsoleCommands.spawnBuilder.bind(ConsoleCommands);
global.spawnUpgrader = ConsoleCommands.spawnUpgrader.bind(ConsoleCommands);
global.creeps = ConsoleCommands.getCreepCount.bind(ConsoleCommands);
global.killCreep = ConsoleCommands.killCreep.bind(ConsoleCommands);
global.killRole = ConsoleCommands.killRole.bind(ConsoleCommands);
global.bodyCost = ConsoleCommands.bodyCost.bind(ConsoleCommands);
global.optimalBody = ConsoleCommands.optimalBody.bind(ConsoleCommands);
global.spawns = ConsoleCommands.listSpawns.bind(ConsoleCommands);
global.stats = ConsoleCommands.showStats.bind(ConsoleCommands);
global.clearStats = ConsoleCommands.clearStats.bind(ConsoleCommands);
global.testDistanceTransform = ConsoleCommands.testDistanceTransform.bind(ConsoleCommands);

/// <reference types="screeps" />
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = ErrorMapper.wrapLoop(() => {
    // Export to global for console access
    global.StatsTracker = StatsTracker;
    global.Architect = Architect;
    // Clean up memory of dead creeps
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            const creep = Memory.creeps[name];
            console.log(`💀 Cleaning up memory for ${name} (${creep.role})`);
            delete Memory.creeps[name];
        }
    }
    // Clean up invalid Memory keys (run once every 1000 ticks)
    if (Game.time % 1000 === 0) {
        const validKeys = ['creeps', 'rooms', 'uuid', 'log', 'stats', 'progressionStats', 'architectPlans'];
        let cleaned = 0;
        for (const key in Memory) {
            if (!validKeys.includes(key)) {
                delete Memory[key];
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} invalid Memory keys`);
        }
    }
    // Run RCL-specific logic for each owned room
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        // Only manage rooms we own
        if (!room.controller || !room.controller.my)
            continue;
        // Run room state manager (handles all room-level logic)
        RoomStateManager.run(room);
    }
    // Run creep roles
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        // Get config for this creep's room
        const config = RoomStateManager.getConfigForCreep(creep);
        if (!config) {
            console.log(`⚠️ No config available for ${creep.name} in room ${creep.room.name}`);
            continue;
        }
        // Execute role behavior with config
        if (creep.memory.role === "harvester") {
            RoleHarvester.run(creep, config);
        }
        else if (creep.memory.role === "upgrader") {
            RoleUpgrader.run(creep, config);
        }
        else if (creep.memory.role === "builder") {
            RoleBuilder.run(creep, config);
        }
        else if (creep.memory.role === "hauler") {
            RoleHauler.run(creep, config);
        }
    }
    // Collect stats at the end of each tick
    StatsCollector.collect();
});

exports.loop = loop;
//# sourceMappingURL=main.js.map
