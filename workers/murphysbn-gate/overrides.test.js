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

test("tiers GET applies the merge map and keeps redacted rules", function () {
  const kv = {
    updated_at: "2026-10-01T12:00:00Z",
    categories: [
      { id: "household-health", name: "Household & Health", tier: "needs", budget: 4 },
      { id: "shopping", name: "Shopping", tier: "wants", budget: 10 },
      { id: "other", name: "Other", tier: "wants", budget: 3 },
      { id: "groceries", name: "Groceries", tier: "needs", budget: 1 }
    ],
    category_rules: {
      "auto policy one": "car-insurance-loans",
      "auto policy two": "car-insurance-loans",
      cafe: "dining"
    },
    category_tx: { "h:abcdabcdabcdabcdabcdabcdabcdabcd": "household-health" }
  };
  const budget = {
    category_merge_ids: { "household-health": "shopping" },
    category_deleted: ["other"],
    box_categories: { categories: [{ name: "Pets" }] },
    tiers_overlay: {
      schema: "banking-tiers-overlay/v1",
      updated_at: "2026-10-15T12:00:00Z",
      source: "box",
      privacy_redacted: ["auto policy one", "auto policy two"],
      tiers: {
        categories: [
          { id: "household-health", name: "Household & Health", tier: "needs", budget: 9 },
          { id: "shopping", name: "Shopping", tier: "wants", budget: 2 },
          { id: "other", name: "Other", tier: "wants", budget: 3 },
          { id: "groceries", name: "Groceries", tier: "needs", budget: 1 }
        ],
        category_rules: { cafe: "groceries", market: "groceries" }
      },
      november_budget: { pot: 90, guides: { groceries: 20 } }
    }
  };
  const doc = gate.applyTiersGet(kv, budget);
  const ids = doc.categories.map(function (row) { return row.id; });
  assert.equal(ids.indexOf("other"), -1);
  assert.ok(ids.indexOf("pets") >= 0);
  const old = doc.categories.filter(function (row) { return row.id === "household-health"; })[0];
  assert.equal(old.merged_into, "shopping");
  assert.equal(doc.category_rules.cafe, "groceries");
  assert.equal(doc.category_rules.market, "groceries");
  assert.equal(doc.category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(doc.category_rules["auto policy two"], "car-insurance-loans");
  assert.equal(doc.category_tx["h:abcdabcdabcdabcdabcdabcdabcdabcd"], "shopping");
  const newer = JSON.parse(JSON.stringify(kv));
  newer.updated_at = "2026-10-16T18:00:00Z";
  newer.categories.forEach(function (row) { if (row.id === "groceries") row.budget = 7; });
  const kept = gate.applyTiersGet(newer, budget);
  const groceries = kept.categories.filter(function (row) { return row.id === "groceries"; })[0];
  assert.equal(groceries.budget, 7);
  assert.equal(kept.category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(kept.category_rules.cafe, "groceries");
});
