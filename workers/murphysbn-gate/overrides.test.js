"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const gate = require("./overrides.js");

const legacy = "2026-10-05|acct-check|12.34|Corner Market";

test("an override survives a pending row being replaced by its posted row", function () {
  const pending = {
    date: "2026-10-05",
    id: "acct-check",
    desc: "Corner Market",
    amount: 12.34,
    tx_id: "tx-100",
    category: "Groceries"
  };
  assert.equal(gate.legacyKey(pending), legacy);
  const written = gate.writeOverride({}, { key: legacy, tx_id: "tx-100", category: "Food/Drink", tier: "wants" });
  assert.equal(written.category_overrides["tx-100"], "Food/Drink");
  assert.equal(written.category_overrides[legacy], "Food/Drink");
  assert.equal(written.tier_overrides["tx-100"], "wants");
  assert.equal(written.tier_overrides[legacy], "wants");

  const posted = {
    date: "2026-10-06",
    id: "acct-check",
    desc: "Corner Market #100",
    amount: 12.34,
    tx_id: "tx-100",
    replaced_alert: legacy,
    category: "Groceries",
    tier: "needs"
  };
  const onlyLegacy = { [legacy]: "Food/Drink" };
  const migrated = gate.migrateOverrideKeys([posted], onlyLegacy);
  assert.equal(migrated["tx-100"], "Food/Drink");
  assert.equal(migrated[legacy], "Food/Drink");

  const rows = gate.applyOverridesToTxRows([posted], {
    category_overrides: onlyLegacy,
    tier_overrides: { [legacy]: "wants" }
  });
  assert.equal(rows[0].category, "Food/Drink");
  assert.equal(rows[0].tier, "wants");
  assert.equal(rows[0].tx_id, "tx-100");
  assert.notEqual(gate.legacyKey(rows[0]), legacy);
});

test("box categories join the picker list and hide deleted or merged names", function () {
  const merged = gate.mergeBoxCategories(["Household", "Old Groceries"], {
    categories: [
      { name: "Pets" },
      { name: "Old Groceries", merged_into: "Groceries", merged: true },
      { name: "Archive", deleted: true },
      "Gifts"
    ],
    deleted: ["Household"],
    merged_into: { "Corner Shop": "Groceries" }
  });
  assert.deepEqual(merged.categories, ["Groceries", "Pets", "Gifts"]);
  assert.equal(merged.merged_into["Old Groceries"], "Groceries");
  assert.equal(merged.merged_into["Corner Shop"], "Groceries");
  assert.equal(merged.categories.indexOf("Archive"), -1);
  assert.equal(merged.categories.indexOf("Household"), -1);
});
