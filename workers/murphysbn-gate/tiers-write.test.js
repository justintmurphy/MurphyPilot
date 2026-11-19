"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const gate = require("./tiers-write.js");
const overrides = require("./overrides.js");

const READ = "publish-bearer-example";
const WRITE = "assistant-write-example";
const NOW = "2026-11-19T03:00:00.000Z";

function envWith(writeSecret, readSecret) {
  const env = { PUBLISH_BEARER: readSecret == null ? READ : readSecret };
  if (writeSecret !== undefined) env[gate.ASSISTANT_WRITE_SECRET] = writeSecret;
  return env;
}

function seed() {
  return {
    doc: {
      categories: [{ id: "groceries", name: "Groceries", tier: "needs", budget: 1 }]
    },
    budget: {
      category_merge_ids: { "household-health": "shopping" },
      category_deleted_ids: ["other"]
    },
    saves: 0,
    loads: 0
  };
}

/* Stand-in for the live worker. Cookie names here are test roles, not sessions. */
function install(store, options) {
  const seen = [];
  options = options || {};
  async function existingFetch(request) {
    const path = new URL(request.url).pathname;
    const method = request.method;
    seen.push(method + " " + path);
    const header = request.headers.get("authorization") || "";
    const bearer = /^Bearer\s+(\S+)\s*$/i.exec(header);
    const token = bearer ? bearer[1] : "";
    if (token && token === (options.readSecret == null ? READ : options.readSecret)) {
      if (method === "GET" || method === "HEAD") return json(200, { via: "bearer", path: path });
      return json(403, { error: "bearer_read_only" });
    }
    if (token) return json(401, { error: "unauthorized" });
    const seat = (request.headers.get("cookie") || "").match(/(?:^|;\s*)mp_seat=([^;]+)/);
    const role = seat ? seat[1] : "";
    if (!role) return json(401, { error: "unauthorized" });
    const owner = role === "owner";
    if (method === "GET" || method === "HEAD") return json(200, { via: "cookie", owner: owner, path: path });
    if (!owner) return json(403, { error: "read_only" });
    if ((method === "POST" || method === "PUT") && path === gate.TIERS_PATH) {
      const body = JSON.parse(await request.text());
      const result = overrides.applyTiersPost(store.doc, body, store.budget);
      if (!result.ok) return json(400, { error: result.code });
      store.doc = result.doc;
      store.ownerSaves = (store.ownerSaves || 0) + 1;
      return json(200, result.doc);
    }
    return json(200, { via: "owner-other", path: path });
  }
  const handler = gate.withAssistantTiersWrite(existingFetch, {
    readBearer: function (env) { return env.PUBLISH_BEARER; },
    loadTiers: async function () {
      store.loads += 1;
      return { doc: store.doc, budget: store.budget };
    },
    saveTiers: async function (_env, doc) {
      store.saves += 1;
      store.doc = doc;
    },
    now: function () { return NOW; },
    validate: options.validate
  });
  return { handler: handler, seen: seen };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "content-type": "application/json" }
  });
}

function call(handler, method, path, opts) {
  opts = opts || {};
  const headers = new Headers(opts.headers || {});
  const init = { method: method, headers: headers };
  if (opts.body != null) init.body = JSON.stringify(opts.body);
  const request = new Request("https://desk.example" + path, init);
  return handler(request, opts.env || envWith(WRITE, READ), {});
}

async function bodyOf(res) {
  return JSON.parse(await res.text());
}

const valid = {
  categories: [
    { id: "shopping", name: "Shopping", tier: "wants", budget: 2 },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 4, merged_into: "shopping" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 7 }
  ],
  bill_autopay: { power: true, rent: false },
  last_writer: "owner"
};

test("the wrangler secret name is ASSISTANT_TIERS_WRITE", function () {
  assert.equal(gate.ASSISTANT_WRITE_SECRET, "ASSISTANT_TIERS_WRITE");
});

test("owner cookie POST still saves through the existing handler", async function () {
  const store = seed();
  const gateFetch = install(store);
  const before = JSON.stringify(store.doc);
  const res = await call(gateFetch.handler, "POST", gate.TIERS_PATH, {
    headers: { cookie: "mp_seat=owner" },
    body: {
      categories: [{ id: "groceries", name: "Groceries", tier: "needs", budget: 4 }]
    }
  });
  const doc = await bodyOf(res);
  assert.equal(res.status, 200);
  assert.equal(doc.categories[0].budget, 4);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "last_writer"), false);
  assert.equal(store.ownerSaves, 1);
  assert.equal(store.saves, 0);
  assert.equal(store.loads, 0);
  assert.deepEqual(gateFetch.seen, ["POST " + gate.TIERS_PATH]);
  assert.notEqual(JSON.stringify(store.doc), before);
});

test("owner cookie POST keeps a prior assistant stamp and still rejects a deleted category", async function () {
  const store = seed();
  store.doc.last_writer = "assistant";
  store.doc.last_write_at = "2026-11-01T00:00:00.000Z";
  const gateFetch = install(store);
  const kept = await call(gateFetch.handler, "POST", gate.TIERS_PATH, {
    headers: { cookie: "mp_seat=owner" },
    body: {
      categories: [{ id: "groceries", name: "Groceries", tier: "needs", budget: 3 }]
    }
  });
  const doc = await bodyOf(kept);
  assert.equal(kept.status, 200);
  assert.equal(doc.last_writer, "assistant");
  assert.equal(doc.last_write_at, "2026-11-01T00:00:00.000Z");
  assert.equal(doc.categories[0].budget, 3);

  const snapshot = JSON.stringify(store.doc);
  const denied = await call(gateFetch.handler, "POST", gate.TIERS_PATH, {
    headers: { cookie: "mp_seat=owner" },
    body: {
      categories: [
        { id: "groceries", name: "Groceries", tier: "needs", budget: 3 },
        { id: "other", name: "Other", tier: "wants", budget: 1 }
      ]
    }
  });
  assert.equal(denied.status, 400);
  assert.equal((await bodyOf(denied)).error, "unknown_category");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
});

test("a desk seat cookie stays read-only on PUT and POST", async function () {
  const store = seed();
  const gateFetch = install(store);
  const snapshot = JSON.stringify(store.doc);
  const put = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { cookie: "mp_seat=desk" },
    body: valid
  });
  const post = await call(gateFetch.handler, "POST", gate.TIERS_PATH, {
    headers: { cookie: "mp_seat=desk" },
    body: valid
  });
  assert.equal(put.status, 403);
  assert.equal((await bodyOf(put)).error, "read_only");
  assert.equal(post.status, 403);
  assert.equal((await bodyOf(post)).error, "read_only");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
  assert.deepEqual(gateFetch.seen, ["PUT " + gate.TIERS_PATH, "POST " + gate.TIERS_PATH]);
});

test("owner cookie GET still reaches the existing handler", async function () {
  const store = seed();
  const gateFetch = install(store);
  const res = await call(gateFetch.handler, "GET", "/data/banking.json", {
    headers: { cookie: "mp_seat=owner" }
  });
  assert.equal(res.status, 200);
  assert.equal((await bodyOf(res)).via, "cookie");
  assert.deepEqual(gateFetch.seen, ["GET /data/banking.json"]);
});

test("the publish bearer still gets bearer_read_only on PUT and can GET", async function () {
  const store = seed();
  const gateFetch = install(store);
  const snapshot = JSON.stringify(store.doc);
  const put = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + READ, cookie: "mp_seat=owner" },
    body: valid
  });
  const post = await call(gateFetch.handler, "POST", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + READ },
    body: valid
  });
  const get = await call(gateFetch.handler, "GET", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + READ }
  });
  const head = await call(gateFetch.handler, "HEAD", "/data/banking.json", {
    headers: { authorization: "Bearer " + READ }
  });
  assert.equal(put.status, 403);
  assert.equal((await bodyOf(put)).error, "bearer_read_only");
  assert.equal(post.status, 403);
  assert.equal((await bodyOf(post)).error, "bearer_read_only");
  assert.equal(get.status, 200);
  assert.equal((await bodyOf(get)).via, "bearer");
  assert.equal(head.status, 200);
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
  assert.equal(store.loads, 0);
  assert.equal(gateFetch.seen.length, 4);
});

test("the assistant secret can PUT the tiers doc and stamps the writer", async function () {
  const store = seed();
  store.doc.bill_autopay = { rent: false };
  const gateFetch = install(store);
  const logs = [];
  const orig = console.log;
  console.log = function (line) { logs.push(String(line)); };
  try {
    const res = await call(gateFetch.handler, "PUT", gate.TIERS_PATH + "?v=1", {
      headers: { authorization: "bearer " + WRITE, cookie: "mp_seat=desk" },
      body: valid
    });
    const doc = await bodyOf(res);
    assert.equal(res.status, 200);
    assert.equal(doc.last_writer, "assistant");
    assert.equal(doc.last_write_at, NOW);
    assert.equal(doc.categories.length, 2);
    assert.equal(doc.categories.some(function (row) { return row.id === "household-health"; }), false);
    assert.equal(doc.categories.filter(function (row) { return row.id === "groceries"; })[0].budget, 7);
    assert.equal(doc.bill_autopay.power, true);
    assert.equal(doc.bill_autopay.rent, false);
    assert.equal(store.saves, 1);
    assert.equal(store.loads, 1);
    assert.deepEqual(gateFetch.seen, []);
    assert.equal(logs.length, 1);
    const line = JSON.parse(logs[0]);
    assert.equal(line.event, "assistant_tiers_write");
    assert.equal(line.result, "saved");
    assert.equal(line.path, gate.TIERS_PATH);
    assert.equal(logs[0].indexOf(WRITE), -1);
    assert.equal(logs[0].indexOf(READ), -1);
  } finally {
    console.log = orig;
  }
});

test("the assistant secret uses tiers validation and does not write a rejected doc", async function () {
  const store = seed();
  const gateFetch = install(store);
  const snapshot = JSON.stringify(store.doc);
  const rejected = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: {
      categories: [
        { id: "groceries", name: "Groceries", tier: "needs", budget: 1 },
        { id: "other", name: "Other", tier: "wants", budget: 1 }
      ]
    }
  });
  assert.equal(rejected.status, 400);
  assert.equal((await bodyOf(rejected)).error, "unknown_category");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);

  const partial = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: { bill_autopay: { power: true } }
  });
  assert.equal(partial.status, 400);
  assert.equal((await bodyOf(partial)).error, "bad_category");
  assert.equal(JSON.stringify(store.doc), snapshot);

  const raw = await gateFetch.handler(new Request("https://desk.example" + gate.TIERS_PATH, {
    method: "PUT",
    headers: { authorization: "Bearer " + WRITE },
    body: "{not json"
  }), envWith(WRITE, READ), {});
  assert.equal(raw.status, 400);
  assert.equal((await bodyOf(raw)).error, "bad_json");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.deepEqual(gateFetch.seen, []);
});

test("a shared validator hook rejects before save", async function () {
  const store = seed();
  const gateFetch = install(store, {
    validate: function () { return { ok: false, code: "bad_month" }; }
  });
  const snapshot = JSON.stringify(store.doc);
  const res = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: valid
  });
  assert.equal(res.status, 400);
  assert.equal((await bodyOf(res)).error, "bad_month");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
  assert.deepEqual(gateFetch.seen, []);
});

test("the assistant secret is rejected on other routes and methods", async function () {
  const store = seed();
  const gateFetch = install(store);
  const snapshot = JSON.stringify(store.doc);
  const attempts = [
    ["POST", gate.TIERS_PATH],
    ["GET", gate.TIERS_PATH],
    ["HEAD", gate.TIERS_PATH],
    ["DELETE", gate.TIERS_PATH],
    ["PUT", "/data/banking.json"],
    ["PUT", "/admin/banking"],
    ["PUT", "/data/house/truthifi-snapshot.json"],
    ["PUT", "/data/banking/tiers.json/extra"]
  ];
  var i;
  for (i = 0; i < attempts.length; i++) {
    const method = attempts[i][0];
    const path = attempts[i][1];
    const init = {
      method: method,
      headers: { authorization: "Bearer " + WRITE }
    };
    if (method !== "GET" && method !== "HEAD") init.body = JSON.stringify(valid);
    const res = await gateFetch.handler(new Request("https://desk.example" + path, init), envWith(WRITE, READ), {});
    const payload = await bodyOf(res);
    assert.equal(res.status, 403, method + " " + path);
    assert.equal(payload.error, "assistant_write_scope", method + " " + path);
    assert.equal(JSON.stringify(payload).indexOf("Groceries"), -1);
  }
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
  assert.equal(store.loads, 0);
  assert.deepEqual(gateFetch.seen, []);
});

test("a wrong bearer, a query token, and an unset secret do not write", async function () {
  const store = seed();
  const gateFetch = install(store);
  const snapshot = JSON.stringify(store.doc);
  const wrong = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE + "-nope" },
    body: valid
  });
  assert.equal(wrong.status, 401);
  assert.equal(gateFetch.seen.length, 1);

  const query = await call(gateFetch.handler, "PUT", gate.TIERS_PATH + "?token=" + WRITE, {
    body: valid
  });
  assert.equal(query.status, 401);

  const basic = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Basic " + WRITE },
    body: valid
  });
  assert.equal(basic.status, 401);

  const unset = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: valid,
    env: envWith(undefined, READ)
  });
  assert.equal(unset.status, 401);
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
});

test("a write secret copied from the publish bearer stays read-only", async function () {
  const store = seed();
  const gateFetch = install(store, { readSecret: "shared-example" });
  const snapshot = JSON.stringify(store.doc);
  const res = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer shared-example" },
    body: valid,
    env: envWith("shared-example", "shared-example")
  });
  assert.equal(res.status, 403);
  assert.equal((await bodyOf(res)).error, "bearer_read_only");
  assert.equal(JSON.stringify(store.doc), snapshot);
  assert.equal(store.saves, 0);
  assert.equal(store.loads, 0);
  assert.deepEqual(gateFetch.seen, ["PUT " + gate.TIERS_PATH]);
});

const MARK = { status: "complete", at: "2026-11-19T03:00:00.000Z", by: "justin" };

test("applyCompletions merges a month mark and leaves the rest of the doc", function () {
  const doc = {
    categories: [{ id: "yard", name: "Yard", tier: "needs", budget: 4 }],
    completions: {
      "2026-10": { "pond-fee": { status: "skipped", at: "2026-10-02T00:00:00.000Z", by: "assistant" } }
    }
  };
  const result = gate.applyCompletions(doc, {
    "2026-11": { "yard-gas": MARK }
  });
  assert.equal(result.ok, true);
  assert.equal(result.doc.categories[0].id, "yard");
  assert.equal(result.doc.completions["2026-10"]["pond-fee"].status, "skipped");
  assert.deepEqual(result.doc.completions["2026-11"]["yard-gas"], MARK);
  assert.equal(doc.completions["2026-11"], undefined);
});

test("applyCompletions deletes one id when the patch value is null", function () {
  const doc = {
    completions: {
      "2026-11": {
        "yard-gas": MARK,
        "pond-fee": { status: "skipped", at: "2026-11-02T00:00:00.000Z", by: "justin" }
      }
    }
  };
  const result = gate.applyCompletions(doc, { "2026-11": { "yard-gas": null } });
  assert.equal(result.ok, true);
  assert.equal(result.doc.completions["2026-11"]["yard-gas"], undefined);
  assert.equal(result.doc.completions["2026-11"]["pond-fee"].status, "skipped");
  const cleared = gate.applyCompletions(result.doc, { "2026-11": { "pond-fee": null } });
  assert.equal(cleared.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(cleared.doc, "completions"), false);
});

test("applyCompletions rejects a bad month, status, id, at, or by", function () {
  const doc = { completions: { "2026-11": { "yard-gas": MARK } } };
  const before = JSON.stringify(doc);
  function reject(patch) {
    const result = gate.applyCompletions(doc, patch);
    assert.equal(result.ok, false);
    assert.equal(result.code, "bad_completion");
  }
  reject({ "2026-13": { "yard-gas": MARK } });
  reject({ "November": { "yard-gas": MARK } });
  reject({ "2026-11": { "": MARK } });
  reject({ "2026-11": { "yard gas!": MARK } });
  reject({ "2026-11": { "yard-gas": { status: "paid", at: MARK.at, by: "justin" } } });
  reject({ "2026-11": { "yard-gas": { status: "complete", at: "yesterday", by: "justin" } } });
  reject({ "2026-11": { "yard-gas": { status: "complete", at: MARK.at, by: "owner" } } });
  reject({ "2026-11": { "yard-gas": { status: "skipped", at: MARK.at, by: "assistant", note: "no" } } });
  reject(null);
  reject(["2026-11"]);
  assert.equal(JSON.stringify(doc), before);
});

test("an assistant tiers write can store and clear a completion", async function () {
  const store = seed();
  const gateFetch = install(store);
  const saved = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: {
      categories: valid.categories,
      completions: { "2026-11": { "yard-gas": { status: "skipped", at: NOW, by: "assistant" } } }
    }
  });
  const doc = await bodyOf(saved);
  assert.equal(saved.status, 200);
  assert.equal(doc.completions["2026-11"]["yard-gas"].status, "skipped");
  assert.equal(doc.completions["2026-11"]["yard-gas"].by, "assistant");
  assert.equal(doc.last_writer, "assistant");

  const cleared = await call(gateFetch.handler, "PUT", gate.TIERS_PATH, {
    headers: { authorization: "Bearer " + WRITE },
    body: {
      categories: valid.categories,
      completions: { "2026-11": { "yard-gas": null } }
    }
  });
  const next = await bodyOf(cleared);
  assert.equal(cleared.status, 200);
  assert.equal(Object.prototype.hasOwnProperty.call(next, "completions"), false);
});
