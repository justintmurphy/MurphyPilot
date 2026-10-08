"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");

function htmlFiles(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    if (ent.name === "node_modules" || ent.name === ".git") return;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) htmlFiles(abs, out);
    else if (ent.name.endsWith(".html")) out.push(abs);
  });
  return out;
}

test("a versioned asset uses one ?v= tag across html pages", function () {
  const files = htmlFiles(root, []);
  assert.ok(files.length >= 4);
  const seen = new Map();
  const re = /(?:src|href)\s*=\s*["']([^"'?#]+)\?v=([^"'#&]+)/g;
  files.forEach(function (file) {
    const html = fs.readFileSync(file, "utf8");
    re.lastIndex = 0;
    let found;
    while ((found = re.exec(html))) {
      const asset = found[1].replace(/^\//, "");
      const ver = found[2];
      const prev = seen.get(asset);
      if (!prev) seen.set(asset, { ver: ver, file: path.relative(root, file) });
      else {
        assert.equal(
          ver,
          prev.ver,
          asset + " is " + ver + " in " + path.relative(root, file) + " and " + prev.ver + " in " + prev.file
        );
      }
    }
  });
  assert.ok(seen.size >= 3, "expected versioned assets");
});
