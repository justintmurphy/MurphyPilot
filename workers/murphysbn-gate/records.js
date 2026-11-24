"use strict";

/* Month and year archives for the Historical tab.
   The live murphysbn-gate worker and its Wrangler config are not in this repo.
   Wrap the existing fetch handler. Do not deploy this file as its own worker.

   Reads use the same login gate as GET /data/banking.json. This wrapper probes
   that route with the caller's headers and only then reads OTP_KV.
   Writes are POST /admin/banking/records with Bearer BANKING_WRITE_TOKEN,
   the same secret as snapshot publish. The token is never logged or returned.

   KV keys, all in OTP_KV:
     banking:record:index
     banking:month:YYYY-MM
     banking:year:YYYY

   hooks.readBearer(env) optional. Otherwise env.BANKING_WRITE_TOKEN.
   hooks.kv optional { get(key), put(key, text) }. Otherwise env.OTP_KV. */

var INDEX_PATH = "/data/banking/records/index.json";
var WRITE_PATH = "/admin/banking/records";
var SNAPSHOT_PATH = "/data/banking.json";
var INDEX_KEY = "banking:record:index";
var MONTH_PATH = /^\/data\/banking\/months\/(\d{4}-\d{2})\.json$/;
var YEAR_PATH = /^\/data\/banking\/years\/(\d{4})\.json$/;
var MAX_BODY = 1048576;
var MAX_MONTHS = 240;
var MAX_YEARS = 40;

var MONTH_STATUS = { closed: 1, in_progress: 1 };
var MONTH_COMPLETE = { full: 1, in_progress: 1, partial: 1, aggregates_only: 1 };
var YEAR_STATUS = { provisional_ytd: 1, closed: 1 };

function monthKey(ym) {
  return "banking:month:" + ym;
}

function yearKey(y) {
  return "banking:year:" + y;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function textResponse(status, text) {
  return new Response(text, {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function pathnameOf(request) {
  return new URL(request.url).pathname;
}

function configured(secret) {
  return typeof secret === "string" && secret.length > 0;
}

function parseBearer(request) {
  var header = request.headers.get("authorization");
  if (!header) return null;
  var match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return null;
  return match[1];
}

async function sha256(text) {
  var encoded = new TextEncoder().encode(text);
  return crypto.subtle.digest("SHA-256", encoded);
}

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

function audit(result, method, path, keys) {
  var shown = String(path || "");
  if (shown.length > 128) shown = shown.slice(0, 128);
  console.log(JSON.stringify({
    event: "banking_records",
    result: result,
    method: method,
    path: shown,
    keys: keys || []
  }));
}

function isPlain(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function monthOk(ym) {
  var m = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
  if (!m) return "";
  var month = Number(m[2]);
  if (month < 1 || month > 12) return "";
  return m[1] + "-" + m[2];
}

function yearOk(y) {
  var s = String(y == null ? "" : y);
  return /^\d{4}$/.test(s) ? s : "";
}

function ownList(value) {
  if (Array.isArray(value)) return value;
  return null;
}

async function readJson(request) {
  var declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_BODY) return { error: "too_large" };
  var text = await request.text();
  if (text.length > MAX_BODY) return { error: "too_large" };
  try {
    return { body: JSON.parse(text) };
  } catch (e) {
    return { error: "bad_json" };
  }
}

function unwrap(body) {
  if (!isPlain(body)) return null;
  if (body.schema === "banking-record-index/v1" && !body.index && !body.months && !body.years) {
    return { index: body };
  }
  if (body.schema === "banking-month-archive/v1" && !body.months) return { months: [body] };
  if (body.schema === "banking-year-archive/v1" && !body.years) return { years: [body] };
  return body;
}

function checkMonthEntry(row) {
  if (!isPlain(row)) return "bad_record";
  if (!monthOk(row.month)) return "bad_record";
  if (!MONTH_STATUS[row.status]) return "bad_record";
  if (!MONTH_COMPLETE[row.completeness]) return "bad_record";
  return "";
}

function checkYearEntry(row) {
  if (typeof row === "string") return yearOk(row) ? "" : "bad_record";
  if (!isPlain(row)) return "bad_record";
  if (!yearOk(row.year)) return "bad_record";
  if (row.status != null && row.status !== "" && !YEAR_STATUS[row.status]) return "bad_record";
  return "";
}

function checkIndex(doc) {
  if (!isPlain(doc) || doc.schema !== "banking-record-index/v1") return "bad_record";
  var months = ownList(doc.months);
  var years = ownList(doc.years);
  if (!months || !years) return "bad_record";
  if (months.length > MAX_MONTHS || years.length > MAX_YEARS) return "bad_record";
  var i;
  for (i = 0; i < months.length; i++) {
    if (checkMonthEntry(months[i])) return "bad_record";
  }
  for (i = 0; i < years.length; i++) {
    if (checkYearEntry(years[i])) return "bad_record";
  }
  return "";
}

function monthDocs(raw) {
  var out = [];
  if (Array.isArray(raw)) {
    raw.forEach(function (doc) { out.push({ key: "", doc: doc }); });
    return out;
  }
  if (!isPlain(raw)) return null;
  Object.keys(raw).forEach(function (key) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return;
    out.push({ key: key, doc: raw[key] });
  });
  return out;
}

function checkMonthDoc(hint, doc) {
  if (!isPlain(doc) || doc.schema !== "banking-month-archive/v1") return "";
  var ym = monthOk(doc.month);
  if (!ym) return "";
  if (hint && hint !== ym) return "";
  if (!MONTH_STATUS[doc.status] || !MONTH_COMPLETE[doc.completeness]) return "";
  return ym;
}

function checkYearDoc(hint, doc) {
  if (!isPlain(doc) || doc.schema !== "banking-year-archive/v1") return "";
  var y = yearOk(doc.year);
  if (!y) return "";
  if (hint && hint !== y) return "";
  if (!YEAR_STATUS[doc.status]) return "";
  return y;
}

function collect(body) {
  var plan = { index: null, months: [], years: [] };
  if (body.index != null) {
    if (checkIndex(body.index)) return { error: "bad_record" };
    plan.index = body.index;
  }
  if (body.months != null) {
    var months = monthDocs(body.months);
    if (!months) return { error: "bad_record" };
    if (months.length > MAX_MONTHS) return { error: "bad_record" };
    var seenM = {};
    var i;
    for (i = 0; i < months.length; i++) {
      var ym = checkMonthDoc(months[i].key, months[i].doc);
      if (!ym || seenM[ym]) return { error: "bad_record" };
      seenM[ym] = 1;
      plan.months.push({ key: monthKey(ym), doc: months[i].doc });
    }
  }
  if (body.years != null) {
    var years = monthDocs(body.years);
    if (!years) return { error: "bad_record" };
    if (years.length > MAX_YEARS) return { error: "bad_record" };
    var seenY = {};
    for (i = 0; i < years.length; i++) {
      var y = checkYearDoc(years[i].key, years[i].doc);
      if (!y || seenY[y]) return { error: "bad_record" };
      seenY[y] = 1;
      plan.years.push({ key: yearKey(y), doc: years[i].doc });
    }
  }
  if (!plan.index && !plan.months.length && !plan.years.length) return { error: "nothing_to_write" };
  return { plan: plan };
}

function kvOf(env, hooks) {
  if (hooks && hooks.kv && typeof hooks.kv.get === "function" && typeof hooks.kv.put === "function") return hooks.kv;
  if (env && env.OTP_KV && typeof env.OTP_KV.get === "function" && typeof env.OTP_KV.put === "function") return env.OTP_KV;
  return null;
}

async function readSecret(env, hooks) {
  if (hooks && typeof hooks.readBearer === "function") return hooks.readBearer(env);
  return env && env.BANKING_WRITE_TOKEN;
}

async function authorizeRead(handler, request, env, ctx) {
  var url = new URL(request.url);
  url.pathname = SNAPSHOT_PATH;
  url.search = "";
  var headers = new Headers(request.headers);
  headers.delete("content-length");
  var probe = new Request(url.toString(), { method: "GET", headers: headers, redirect: "manual" });
  var res = await handler(probe, env, ctx);
  if (!res) return jsonResponse(401, { error: "unauthorized" });
  var status = Number(res.status);
  if (status === 401 || status === 403 || (status >= 300 && status < 400)) {
    return jsonResponse(status === 403 ? 403 : 401, { error: status === 403 ? "forbidden" : "unauthorized" });
  }
  return null;
}

async function readRoute(handler, request, env, ctx, hooks, key) {
  var allowed;
  try {
    allowed = await authorizeRead(handler, request, env, ctx);
  } catch (e) {
    audit("unavailable", request.method, pathnameOf(request), []);
    return jsonResponse(500, { error: "unavailable" });
  }
  if (allowed) return allowed;
  var kv = kvOf(env, hooks);
  if (!kv) return jsonResponse(500, { error: "unavailable" });
  var text = "";
  try {
    text = await kv.get(key);
  } catch (e) {
    audit("unavailable", request.method, pathnameOf(request), [key]);
    return jsonResponse(500, { error: "unavailable" });
  }
  if (text == null || text === "") return jsonResponse(404, { error: "missing" });
  return textResponse(200, String(text));
}

async function writeRoute(request, env, hooks) {
  var path = "";
  try { path = pathnameOf(request); } catch (e) { return jsonResponse(400, { error: "bad_json" }); }
  var secret = "";
  try { secret = await readSecret(env, hooks); } catch (e2) { secret = ""; }
  if (!configured(secret)) {
    audit("unavailable", request.method, path, []);
    return jsonResponse(503, { error: "unavailable" });
  }
  var presented = parseBearer(request);
  var match = false;
  try { match = await tokenEquals(presented, secret); } catch (e3) { match = false; }
  if (!match) {
    audit("unauthorized", request.method, path, []);
    return jsonResponse(401, { error: "unauthorized" });
  }
  var parsed;
  try { parsed = await readJson(request); } catch (e4) { parsed = { error: "bad_json" }; }
  if (parsed.error === "too_large") {
    audit("rejected", request.method, path, []);
    return jsonResponse(413, { error: "too_large" });
  }
  if (parsed.error) {
    audit("rejected", request.method, path, []);
    return jsonResponse(400, { error: parsed.error });
  }
  var body = unwrap(parsed.body);
  if (!body) {
    audit("rejected", request.method, path, []);
    return jsonResponse(400, { error: "bad_json" });
  }
  var built = collect(body);
  if (built.error) {
    audit("rejected", request.method, path, []);
    return jsonResponse(400, { error: built.error });
  }
  var kv = kvOf(env, hooks);
  if (!kv) {
    audit("unavailable", request.method, path, []);
    return jsonResponse(500, { error: "unavailable" });
  }
  var wrote = [];
  try {
    if (built.plan.index) {
      await kv.put(INDEX_KEY, JSON.stringify(built.plan.index));
      wrote.push(INDEX_KEY);
    }
    var i;
    for (i = 0; i < built.plan.months.length; i++) {
      await kv.put(built.plan.months[i].key, JSON.stringify(built.plan.months[i].doc));
      wrote.push(built.plan.months[i].key);
    }
    for (i = 0; i < built.plan.years.length; i++) {
      await kv.put(built.plan.years[i].key, JSON.stringify(built.plan.years[i].doc));
      wrote.push(built.plan.years[i].key);
    }
  } catch (e5) {
    audit("unavailable", request.method, path, wrote);
    return jsonResponse(500, { error: "unavailable" });
  }
  audit("saved", request.method, path, wrote);
  return jsonResponse(200, { ok: true, wrote: wrote });
}

function routeKey(pathname) {
  if (pathname === INDEX_PATH) return INDEX_KEY;
  var month = MONTH_PATH.exec(pathname);
  if (month) {
    var ym = monthOk(month[1]);
    return ym ? monthKey(ym) : "";
  }
  var year = YEAR_PATH.exec(pathname);
  if (year) {
    var y = yearOk(year[1]);
    return y ? yearKey(y) : "";
  }
  return "";
}

function withBankingRecords(handler, hooks) {
  if (typeof handler !== "function") throw new Error("handler required");
  hooks = hooks || {};
  return async function (request, env, ctx) {
    env = env || {};
    var path = "";
    try { path = pathnameOf(request); } catch (e) { return jsonResponse(400, { error: "bad_json" }); }
    if (request.method === "POST" && path === WRITE_PATH) return writeRoute(request, env, hooks);
    if (request.method === "GET" || request.method === "HEAD") {
      var key = routeKey(path);
      if (key) return readRoute(handler, request, env, ctx, hooks, key);
    }
    return handler(request, env, ctx);
  };
}

module.exports = {
  INDEX_PATH: INDEX_PATH,
  WRITE_PATH: WRITE_PATH,
  INDEX_KEY: INDEX_KEY,
  monthKey: monthKey,
  yearKey: yearKey,
  withBankingRecords: withBankingRecords
};
