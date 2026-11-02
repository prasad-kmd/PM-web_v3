/**
 * Inline source for the Regex Architect's short-lived Blob worker.
 *
 * Kept as a string (rather than a separate public file) so the tool stays a
 * single lazy chunk with no network request. CSP already allows
 * `worker-src 'self' blob:`. The view terminates the worker on timeout; this
 * source additionally caps match count and loop iterations so a zero-length
 * global match cannot spin forever even if termination is delayed.
 */
export const REGEX_WORKER_SOURCE = String.raw`
"use strict";

var MAX_MATCHES = 500;
var MAX_ITERATIONS = 10000;

function serialize(match) {
  var groups = Array.prototype.slice.call(match, 1);
  var namedGroups;
  if (match.groups) {
    namedGroups = {};
    Object.keys(match.groups).forEach(function (key) {
      namedGroups[key] = match.groups[key];
    });
  }
  return {
    index: match.index,
    value: match[0],
    groups: groups,
    namedGroups: namedGroups
  };
}

self.onmessage = function (event) {
  var data = event.data || {};
  var pattern = data.pattern;
  var flags = data.flags;
  var text = data.text;
  var limit = Math.min(data.maxMatches || MAX_MATCHES, MAX_MATCHES);

  try {
    var regex = new RegExp(pattern, flags);
    var matches = [];
    var iterate = regex.global || regex.sticky;

    if (!iterate) {
      var once = regex.exec(text);
      if (once) matches.push(serialize(once));
    } else {
      var iterations = 0;
      var current;
      while ((current = regex.exec(text)) !== null) {
        matches.push(serialize(current));
        if (matches.length >= limit) break;
        if (current.index === regex.lastIndex) regex.lastIndex += 1;
        iterations += 1;
        if (iterations >= MAX_ITERATIONS) break;
      }
    }

    self.postMessage({
      matches: matches,
      error: null,
      timedOut: false,
      truncated: matches.length >= limit || iterations >= MAX_ITERATIONS
    });
  } catch (error) {
    self.postMessage({
      matches: [],
      error: error instanceof Error ? error.message : "Invalid regular expression",
      timedOut: false,
      truncated: false
    });
  }
};
`;
