"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const gate = require("./records.js");

const READ = "publish-bearer-example";

function memoryKv() {
  const store = Object.create(null);
  return {
    store: store,
    gets: [],
    puts: [],
    get: async function (key) {
      this.gets.push(key);
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    put: async function (key, value) {
      this.puts.push(key);
      store[key] = value;
    }
  };
}

function install(kv, options) {
  const seen = [];
  options = options || {};
  async function existingFetch(request) {
    const path = new URL(request.url).pathname;
    seen.push(request.method + " " + path);
    const header = request.headers.get("authorization") || "";
    const bearer = /^Bearer\s+(\S+)\s*$/i.exec(header);
    const token = bearer ? bearer[1] : "";
    if (token && token === READ) {
      if (request.method === "GET" || request.method === "HEAD") return json(200, { via: "bearer", path: path });
      return json(403, { error: "bearer_read_only" });
    }
    if (token) return json(401, { error: "unauthorized" });
    const seat = (request.headers.get("cookie") || "").match(/(?:^|;\s*)mp_seat=([^;]+)/);
    const role = seat ? decodeURIComponent(seat[1]) : "";
    if (!role) return json(401, { error: "unauthorized" });
    if (role !== "justin") return json(403, { error: "forbidden" });
    if (path === "/data/banking.json" && (request.method === "GET" || request.method === "HEAD")) {
      return json(200, { via: "snapshot" });
    }
    return json(404, { error: "not_found" });
  }
  const handler = gate.withBankingRecords(existingFetch, {
    readBearer: function () { return options.readSecret === undefined ? READ : options.readSecret; },
    kv: kv
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
  if (opts.body != null) init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  if (opts.rawBody != null) init.body = opts.rawBody;
  return handler(new Request("https://desk.example" + path, init), opts.env || {}, {});
}

async function bodyOf(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function indexDoc() {
  return {
    schema: "banking-record-index/v1",
    months: [
      { month: "2026-08", status: "closed", completeness: "partial" },
      { month: "2026-09", status: "closed", completeness: "full" }
    ],
    years: [{ year: "2026", status: "provisional_ytd" }]
  };
}

function monthDoc() {
  return {
    schema: "banking-month-archive/v1",
    month: "2026-09",
    status: "closed",
    completeness: "full",
    through_date: "2026-09-30",
    coverage: { note: "Sample month is complete." },
    net_cash_flow: 4,
    income: [{ date: "2026-09-15", desc: "Payroll", amount: 10, account_suffix: "1001", kind: "payroll" }],
    transactions: [{ date: "2026-09-16", desc: "Corner Market", amount: 6, account_suffix: "1001", category: "Groceries", tier: "needs" }]
  };
}

function yearDoc() {
  return {
    schema: "banking-year-archive/v1",
    year: "2026",
    status: "provisional_ytd",
    through_date: "2026-09-30",
    income_total: 20,
    outflow_total: 16,
    net_cash_flow: 4
  };
}

function captureLogs(run) {
  const logs = [];
  const orig = console.log;
  console.log = function (line) { logs.push(String(line)); };
  return Promise.resolve()
    .then(run)
    .then(function (value) {
      console.log = orig;
      return { value: value, logs: logs };
    }, function (err) {
      console.log = orig;
      throw err;
    });
}

test("archive routes use the publish bearer and OTP_KV key names", function () {
  assert.equal(gate.WRITE_PATH, "/admin/banking/records");
  assert.equal(gate.INDEX_PATH, "/data/banking/records/index.json");
  assert.equal(gate.INDEX_KEY, "banking:record:index");
  assert.equal(gate.monthKey("2026-09"), "banking:month:2026-09");
  assert.equal(gate.yearKey("2026"), "banking:year:2026");
});

test("a publish bearer writes index, month, and year without logging the token", async function () {
  const kv = memoryKv();
  const gateFetch = install(kv);
  const packed = await captureLogs(function () {
    return call(gateFetch.handler, "POST", gate.WRITE_PATH, {
      headers: { authorization: "bearer " + READ, cookie: "mp_seat=desk" },
      body: { index: indexDoc(), months: [monthDoc()], years: { 2026: yearDoc() } }
    });
  });
  const res = packed.value;
  const doc = await bodyOf(res);
  assert.equal(res.status, 200);
  assert.equal(doc.ok, true);
  assert.deepEqual(doc.wrote, [gate.INDEX_KEY, "banking:month:2026-09", "banking:year:2026"]);
  assert.equal(JSON.parse(kv.store[gate.INDEX_KEY]).months[1].completeness, "full");
  assert.equal(JSON.parse(kv.store["banking:month:2026-09"]).transactions[0].desc, "Corner Market");
  assert.equal(JSON.parse(kv.store["banking:year:2026"]).status, "provisional_ytd");
  assert.deepEqual(gateFetch.seen, []);
  const joined = packed.logs.join("\n");
  assert.equal(joined.indexOf(READ), -1);
  assert.match(joined, /"result":"saved"/);
  assert.doesNotMatch(joined, /Corner Market|Payroll/);
});

test("the Justin seat can read what was written and a desk seat cannot", async function () {
  const kv = memoryKv();
  const gateFetch = install(kv);
  const saved = await call(gateFetch.handler, "POST", gate.WRITE_PATH, {
    headers: { authorization: "Bearer " + READ },
    body: { index: indexDoc(), months: [monthDoc()], years: [yearDoc()] }
  });
  assert.equal(saved.status, 200);

  const month = await call(gateFetch.handler, "GET", "/data/banking/months/2026-09.json?v=1", {
    headers: { cookie: "mp_seat=justin" }
  });
  const year = await call(gateFetch.handler, "GET", "/data/banking/years/2026.json", {
    headers: { cookie: "mp_seat=justin" }
  });
  const index = await call(gateFetch.handler, "HEAD", gate.INDEX_PATH, {
    headers: { cookie: "mp_seat=justin" }
  });
  assert.equal(month.status, 200);
  assert.equal(month.headers.get("cache-control"), "no-store");
  assert.equal((await bodyOf(month)).month, "2026-09");
  assert.equal((await bodyOf(year)).year, "2026");
  assert.equal(index.status, 200);
  assert.ok(gateFetch.seen.indexOf("GET /data/banking.json") >= 0);

  const before = kv.gets.length;
  const desk = await call(gateFetch.handler, "GET", "/data/banking/months/2026-09.json", {
    headers: { cookie: "mp_seat=desk" }
  });
  const anon = await call(gateFetch.handler, "GET", gate.INDEX_PATH, {});
  assert.equal(desk.status, 403);
  assert.equal((await bodyOf(desk)).error, "forbidden");
  assert.equal(anon.status, 401);
  assert.equal(kv.gets.length, before);
});

test("a missing archive is 404 and a bad publish does not write", async function () {
  const kv = memoryKv();
  const gateFetch = install(kv);
  const missing = await call(gateFetch.handler, "GET", "/data/banking/months/2026-01.json", {
    headers: { cookie: "mp_seat=justin" }
  });
  assert.equal(missing.status, 404);
  assert.equal((await bodyOf(missing)).error, "missing");

  const snapshot = JSON.stringify(kv.store);
  const cases = [
    [{}, 400, "nothing_to_write"],
    [{ months: [{ schema: "banking-month-archive/v1", month: "2026-13", status: "closed", completeness: "full" }] }, 400, "bad_record"],
    [{ months: { "2026-09": Object.assign(monthDoc(), { month: "2026-08" }) } }, 400, "bad_record"],
    [{ years: [{ schema: "banking-year-archive/v1", year: "2026", status: "open" }] }, 400, "bad_record"],
    [{ index: { schema: "banking-record-index/v1", months: [], years: "2026" } }, 400, "bad_record"]
  ];
  for (const row of cases) {
    const res = await call(gateFetch.handler, "POST", gate.WRITE_PATH, {
      headers: { authorization: "Bearer " + READ },
      body: row[0]
    });
    assert.equal(res.status, row[1], JSON.stringify(row[0]));
    assert.equal((await bodyOf(res)).error, row[2]);
  }
  const junk = await call(gateFetch.handler, "POST", gate.WRITE_PATH, {
    headers: { authorization: "Bearer " + READ },
    rawBody: "not-json"
  });
  assert.equal(junk.status, 400);
  assert.equal((await bodyOf(junk)).error, "bad_json");
  const huge = await call(gateFetch.handler, "POST", gate.WRITE_PATH, {
    headers: { authorization: "Bearer " + READ, "content-length": "2000000" },
    body: { index: indexDoc() }
  });
  assert.equal(huge.status, 413);
  assert.equal(JSON.stringify(kv.store), snapshot);
});

test("writes reject a missing or wrong bearer and never echo it", async function () {
  const kv = memoryKv();
  const open = install(kv);
  const logs = [];
  const orig = console.log;
  console.log = function (line) { logs.push(String(line)); };
  try {
    const wrong = await call(open.handler, "POST", gate.WRITE_PATH, {
      headers: { authorization: "Bearer not-the-publish-token" },
      body: { index: indexDoc() }
    });
    const bare = await call(open.handler, "POST", gate.WRITE_PATH, { body: { index: indexDoc() } });
    assert.equal(wrong.status, 401);
    assert.equal(bare.status, 401);
    assert.equal((await bodyOf(wrong)).error, "unauthorized");
    assert.deepEqual(open.seen, []);
    assert.equal(kv.puts.length, 0);
    const unset = install(memoryKv(), { readSecret: "" });
    const down = await call(unset.handler, "POST", gate.WRITE_PATH, {
      headers: { authorization: "Bearer " + READ },
      body: { index: indexDoc() }
    });
    assert.equal(down.status, 503);
    assert.equal((await bodyOf(down)).error, "unavailable");
  } finally {
    console.log = orig;
  }
  const joined = logs.join("\n");
  assert.equal(joined.indexOf(READ), -1);
  assert.equal(joined.indexOf("not-the-publish-token"), -1);
});

test("other routes still reach the existing handler", async function () {
  const kv = memoryKv();
  const gateFetch = install(kv);
  const get = await call(gateFetch.handler, "GET", "/data/banking.json", {
    headers: { cookie: "mp_seat=justin" }
  });
  const post = await call(gateFetch.handler, "POST", "/admin/banking", {
    headers: { authorization: "Bearer " + READ },
    body: { index: indexDoc() }
  });
  const odd = await call(gateFetch.handler, "GET", "/data/banking/months/nope.json", {
    headers: { cookie: "mp_seat=justin" }
  });
  assert.equal(get.status, 200);
  assert.equal((await bodyOf(get)).via, "snapshot");
  assert.equal(post.status, 403);
  assert.equal((await bodyOf(post)).error, "bearer_read_only");
  assert.equal(odd.status, 404);
  assert.equal(kv.puts.length, 0);
  assert.deepEqual(gateFetch.seen, [
    "GET /data/banking.json",
    "POST /admin/banking",
    "GET /data/banking/months/nope.json"
  ]);
});

test("a single month document can be posted on its own", async function () {
  const kv = memoryKv();
  const gateFetch = install(kv);
  const res = await call(gateFetch.handler, "POST", gate.WRITE_PATH + "?v=2", {
    headers: { authorization: "Bearer " + READ },
    body: monthDoc()
  });
  assert.equal(res.status, 200);
  assert.deepEqual((await bodyOf(res)).wrote, ["banking:month:2026-09"]);
  const read = await call(gateFetch.handler, "GET", "/data/banking/months/2026-09.json", {
    headers: { authorization: "Bearer " + READ }
  });
  assert.equal(read.status, 200);
  assert.equal((await bodyOf(read)).completeness, "full");
});
