"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const playwrightDir = "/tmp/pw-eq/node_modules";
module.paths.unshift(playwrightDir);
const { chromium } = require("playwright");

function serve(fixture) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json"
  };
  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/data/banking.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(fixture));
      return;
    }
    if (url.pathname === "/data/banking/tiers.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ schema: "banking-tiers/v1", rules: {}, plans: {} }));
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end("");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

test("edits search keeps the input while typing grocer at 390", { timeout: 30000 }, async function () {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "banking-ui.json"), "utf8"));
  const served = await serve(fixture);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("http://127.0.0.1:" + served.port + "/#edits", { waitUntil: "networkidle" });
    const input = page.locator("[data-bank-find]");
    await input.waitFor({ state: "visible" });
    await page.waitForTimeout(300);
    await input.evaluate(function (el) { el.dataset.stay = "1"; });
    await input.click();
    for (const ch of "grocer") {
      await page.keyboard.type(ch);
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(400);
    const state = await page.evaluate(function () {
      const el = document.querySelector("[data-bank-find]");
      const results = document.querySelector("[data-bank-find-results]");
      const text = results ? results.innerText.replace(/\s+/g, " ") : "";
      return {
        value: el ? el.value : "",
        active: document.activeElement === el,
        stayed: !!(el && el.dataset.stay === "1"),
        text: text
      };
    });
    assert.equal(state.value, "grocer");
    assert.equal(state.active, true);
    assert.equal(state.stayed, true);
    assert.match(state.text, /Neighborhood Grocer/);
    assert.doesNotMatch(state.text, /City Fuel/);
    assert.doesNotMatch(state.text, /Type to search/);
  } finally {
    await browser.close();
    served.server.close();
  }
});
