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

function defaultValidate(kv, body, budget) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.categories)) {
    return { ok: false, code: "bad_category" };
  }
  return overrides.applyTiersPost(kv, body, budget);
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
  withAssistantTiersWrite: withAssistantTiersWrite
};
