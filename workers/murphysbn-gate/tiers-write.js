"use strict";

/* Assistant write for the Banking Edits doc.
   The live murphysbn-gate worker and its Wrangler config are not in this repo.
   Wrap the existing fetch handler. Do not replace it and do not deploy this
   file as its own worker.

   Secret name for `wrangler secret put`: ASSISTANT_TIERS_WRITE
   That value must not be the publish Bearer. If the two are equal, the bearer
   stays on the existing handler (GET/HEAD only, PUT/POST is bearer_read_only).

   Only PUT /data/banking/tiers.json is accepted. Every other route and method
   is 403 assistant_write_scope and does not call the existing handler.
   The body goes through the same validator as the cookie path. By default that
   is applyTiersPost, and a body without a categories array is refused so an
   empty object cannot blank the list. Pass hooks.validate to use the live
   cookie validator when that function covers more of the doc.
   A saved doc records last_writer "assistant" and last_write_at. Owner-cookie
   writes are not restamped here. They keep going to the existing handler.

   hooks.readBearer(env) must return the existing publish Bearer binding.
   hooks.loadTiers(env) returns { doc, budget } using the same KV key and
   snapshot budget the cookie path already uses.
   hooks.saveTiers(env, doc) writes that same key.
   hooks.now() optional ISO timestamp for tests. */

var overrides = require("./overrides.js");

var ASSISTANT_WRITE_SECRET = "ASSISTANT_TIERS_WRITE";
var TIERS_PATH = "/data/banking/tiers.json";
var MAX_BODY = 262144;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function parseBearer(request) {
  var header = request.headers.get("authorization");
  if (!header) return null;
  var match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return null;
  return match[1];
}

function configured(secret) {
  return typeof secret === "string" && secret.length > 0;
}

async function sha256(text) {
  var encoded = new TextEncoder().encode(text);
  return crypto.subtle.digest("SHA-256", encoded);
}

/* Compare SHA-256 hashes, not the raw secrets, so length does not leak. */
async function hashesEqual(left, right) {
  var a = new Uint8Array(left);
  var b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  if (crypto.subtle && typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(a, b);
  }
  if (typeof require === "function") {
    var nodeCrypto = require("crypto");
    if (nodeCrypto && typeof nodeCrypto.timingSafeEqual === "function") {
      return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
  }
  var diff = 0;
  var i;
  for (i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function tokenEquals(provided, expected) {
  if (!configured(expected) || typeof provided !== "string") return false;
  var hashes = await Promise.all([sha256(provided), sha256(expected)]);
  return hashesEqual(hashes[0], hashes[1]);
}

/* "read" wins when the presented bearer matches the publish token, including
   when that token was also copied into ASSISTANT_TIERS_WRITE. */
async function bearerKind(request, writeSecret, readSecret) {
  var token = parseBearer(request);
  if (token == null) return "none";
  var readMatch = await tokenEquals(token, readSecret);
  var writeMatch = await tokenEquals(token, writeSecret);
  if (readMatch) return "read";
  if (writeMatch) return "assistant";
  return "other";
}

function pathnameOf(request) {
  return new URL(request.url).pathname;
}

function audit(result, method, path) {
  var shown = String(path || "");
  if (shown.length > 128) shown = shown.slice(0, 128);
  console.log(JSON.stringify({
    event: "assistant_tiers_write",
    result: result,
    method: method,
    path: shown
  }));
}

var COMPLETION_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
var COMPLETION_ID = /^[A-Za-z0-9][A-Za-z0-9 ._:+\-]{0,79}$/;
var COMPLETION_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function completionIdOk(id) {
  return typeof id === "string" && id === id.trim() && COMPLETION_ID.test(id);
}

function completionEntryOk(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  if (entry.status !== "complete" && entry.status !== "skipped") return false;
  if (typeof entry.at !== "string" || !COMPLETION_AT.test(entry.at)) return false;
  if (entry.by !== "justin" && entry.by !== "assistant") return false;
  var extra = Object.keys(entry).some(function (key) {
    return key !== "status" && key !== "at" && key !== "by";
  });
  return !extra;
}

function copyCompletionEntry(entry) {
  return { status: entry.status, at: entry.at, by: entry.by };
}

/* Merge a completions patch into a tiers doc.
   patch is { "YYYY-MM": { "<id>": { status, at, by } | null } }.
   null deletes that id. A bad month, id, status, at, or by rejects the whole patch.
   The live GET builder must return doc.completions. The live handleTiersWrite
   whitelist must accept completions and call applyCompletions(doc, body.completions). */
function applyCompletions(doc, patch) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ok: false, code: "bad_completion" };
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ok: false, code: "bad_completion" };
  var months = Object.keys(patch);
  if (months.length > 24) return { ok: false, code: "bad_completion" };
  var next = {};
  var prev = doc.completions;
  if (prev && typeof prev === "object" && !Array.isArray(prev)) {
    Object.keys(prev).forEach(function (month) {
      if (!COMPLETION_MONTH.test(month)) return;
      var bag = prev[month];
      if (!bag || typeof bag !== "object" || Array.isArray(bag)) return;
      var copy = {};
      Object.keys(bag).forEach(function (id) {
        if (!completionIdOk(id) || !completionEntryOk(bag[id])) return;
        copy[id] = copyCompletionEntry(bag[id]);
      });
      if (Object.keys(copy).length) next[month] = copy;
    });
  }
  var bad = false;
  months.forEach(function (month) {
    if (bad) return;
    if (!COMPLETION_MONTH.test(month)) {
      bad = true;
      return;
    }
    var bag = patch[month];
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) {
      bad = true;
      return;
    }
    var ids = Object.keys(bag);
    if (ids.length > 40) {
      bad = true;
      return;
    }
    if (!next[month]) next[month] = {};
    ids.forEach(function (id) {
      if (bad) return;
      if (!completionIdOk(id)) {
        bad = true;
        return;
      }
      if (bag[id] == null) {
        delete next[month][id];
        return;
      }
      if (!completionEntryOk(bag[id])) {
        bad = true;
        return;
      }
      next[month][id] = copyCompletionEntry(bag[id]);
    });
    if (next[month] && !Object.keys(next[month]).length) delete next[month];
  });
  if (bad) return { ok: false, code: "bad_completion" };
  var total = 0;
  Object.keys(next).forEach(function (month) { total += Object.keys(next[month]).length; });
  if (total > 400) return { ok: false, code: "bad_completion" };
  var out = {};
  Object.keys(doc).forEach(function (key) { out[key] = doc[key]; });
  if (Object.keys(next).length) out.completions = next;
  else delete out.completions;
  return { ok: true, doc: out };
}

function defaultValidate(kv, body, budget) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.categories)) {
    return { ok: false, code: "bad_category" };
  }
  var result = overrides.applyTiersPost(kv, body, budget);
  if (!result || result.ok !== true || !result.doc) return result;
  if (!Object.prototype.hasOwnProperty.call(body, "completions")) return result;
  return applyCompletions(result.doc, body.completions);
}

function stamp(doc, hooks) {
  var at = "";
  if (typeof hooks.now === "function") {
    var given = hooks.now();
    if (typeof given === "string" && given) at = given;
  }
  if (!at) at = new Date().toISOString();
  doc.last_writer = "assistant";
  doc.last_write_at = at;
  return doc;
}

async function readJson(request) {
  var declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_BODY) return { error: "too_large" };
  var text = await request.text();
  if (text.length > MAX_BODY) return { error: "too_large" };
  try {
    var body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
    return { body: body };
  } catch (e) {
    return { error: "bad_json" };
  }
}

async function assistantPut(request, env, hooks) {
  var method = request.method;
  var path = "";
  try {
    path = pathnameOf(request);
  } catch (e) {
    return jsonResponse(400, { error: "bad_json" });
  }
  if (method !== "PUT" || path !== TIERS_PATH) {
    audit("rejected", method, path);
    return jsonResponse(403, { error: "assistant_write_scope" });
  }
  if (typeof hooks.loadTiers !== "function" || typeof hooks.saveTiers !== "function") {
    audit("rejected", method, path);
    return jsonResponse(500, { error: "unavailable" });
  }
  var parsed;
  try {
    parsed = await readJson(request);
  } catch (e) {
    audit("rejected", method, path);
    return jsonResponse(400, { error: "bad_json" });
  }
  if (parsed.error === "too_large") {
    audit("rejected", method, path);
    return jsonResponse(413, { error: "too_large" });
  }
  if (parsed.error) {
    audit("rejected", method, path);
    return jsonResponse(400, { error: parsed.error });
  }
  var loaded;
  try {
    loaded = await hooks.loadTiers(env);
  } catch (e) {
    audit("load_failed", method, path);
    return jsonResponse(500, { error: "unavailable" });
  }
  var kv = loaded && loaded.doc && typeof loaded.doc === "object" && !Array.isArray(loaded.doc) ? loaded.doc : {};
  var budget = loaded ? loaded.budget : undefined;
  var validate = typeof hooks.validate === "function" ? hooks.validate : defaultValidate;
  var result;
  try {
    result = validate(kv, parsed.body, budget);
  } catch (e) {
    audit("rejected", method, path);
    return jsonResponse(400, { error: "bad_category" });
  }
  if (!result || result.ok !== true || !result.doc || typeof result.doc !== "object" || Array.isArray(result.doc)) {
    audit("rejected", method, path);
    return jsonResponse(400, { error: (result && result.code) || "bad_category" });
  }
  var doc = stamp(result.doc, hooks);
  try {
    await hooks.saveTiers(env, doc);
  } catch (e) {
    audit("save_failed", method, path);
    return jsonResponse(500, { error: "unavailable" });
  }
  audit("saved", method, path);
  return jsonResponse(200, doc);
}

function withAssistantTiersWrite(handler, hooks) {
  if (typeof handler !== "function") throw new Error("handler required");
  hooks = hooks || {};
  return async function (request, env, ctx) {
    env = env || {};
    var readSecret = "";
    if (typeof hooks.readBearer === "function") readSecret = hooks.readBearer(env);
    var kind = await bearerKind(request, env[ASSISTANT_WRITE_SECRET], readSecret);
    if (kind !== "assistant") return handler(request, env, ctx);
    return assistantPut(request, env, hooks);
  };
}

module.exports = {
  ASSISTANT_WRITE_SECRET: ASSISTANT_WRITE_SECRET,
  TIERS_PATH: TIERS_PATH,
  applyCompletions: applyCompletions,
  withAssistantTiersWrite: withAssistantTiersWrite
};
