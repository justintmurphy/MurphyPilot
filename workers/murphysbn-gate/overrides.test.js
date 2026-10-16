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
  assert.equal(ids.indexOf("household-health"), -1);
  assert.ok(ids.indexOf("pets") >= 0);
  assert.equal(doc.categories.some(function (row) { return row.merged_into; }), false);
  const shop = doc.categories.filter(function (row) { return row.id === "shopping"; })[0];
  assert.equal(shop.budget, 2);
  const groceries = doc.categories.filter(function (row) { return row.id === "groceries"; })[0];
  assert.equal(groceries.budget, 1);
  assert.equal(doc.category_rules.cafe, "groceries");
  assert.equal(doc.category_rules.market, "groceries");
  assert.equal(doc.category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(doc.category_rules["auto policy two"], "car-insurance-loans");
  assert.equal(doc.category_tx["h:abcdabcdabcdabcdabcdabcdabcdabcd"], "shopping");
  const newer = JSON.parse(JSON.stringify(kv));
  newer.updated_at = "2026-10-16T18:00:00Z";
  newer.categories.forEach(function (row) { if (row.id === "groceries") row.budget = 7; });
  newer.categories.push({ id: "tv", name: "TV", tier: "wants", budget: 4 });
  const kept = gate.applyTiersGet(newer, budget);
  const keptIds = kept.categories.map(function (row) { return row.id; });
  assert.equal(keptIds.indexOf("tv"), -1);
  assert.ok(keptIds.indexOf("pets") >= 0);
  assert.equal(kept.categories.filter(function (row) { return row.id === "groceries"; })[0].budget, 1);
  assert.equal(kept.categories.filter(function (row) { return row.id === "shopping"; })[0].budget, 2);
  assert.equal(kept.category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(kept.category_rules.cafe, "groceries");
  newer.budgets_updated_at = { groceries: "2026-10-16T18:00:00Z" };
  const stamped = gate.applyTiersGet(newer, budget);
  assert.equal(stamped.categories.filter(function (row) { return row.id === "groceries"; })[0].budget, 7);
  assert.equal(stamped.categories.filter(function (row) { return row.id === "shopping"; })[0].budget, 2);
  assert.equal(stamped.budgets_updated_at.groceries, "2026-10-16T18:00:00Z");
  newer.budgets_updated_at = { groceries: "2026-10-01T00:00:00Z" };
  newer.categories.forEach(function (row) { if (row.id === "groceries") row.budget = 0; });
  const zero = gate.applyTiersGet(newer, budget);
  assert.equal(zero.categories.filter(function (row) { return row.id === "groceries"; })[0].budget, 0);
  assert.equal(zero.budgets_updated_at.groceries, "2026-10-01T00:00:00Z");
});

test("tiers GET returns the active rows when merged rows are on the overlay", function () {
  const categories = [];
  for (let i = 0; i < 26; i++) categories.push({ id: "c" + i, name: "Cat " + i, tier: "wants", budget: 1 });
  for (let j = 0; j < 7; j++) categories.push({ id: "m" + j, name: "Old " + j, tier: "wants", budget: 1, merged_into: "c0" });
  const budget = {
    category_merge_ids: { m0: "c0", m1: "c0", m2: "c0", m3: "c0", m4: "c0", m5: "c0", m6: "c0" },
    category_deleted_ids: ["gone"],
    tiers_overlay: {
      updated_at: "2026-10-15T12:00:00Z",
      tiers: { categories: categories.concat([{ id: "gone", name: "Gone", tier: "wants", budget: 1 }]) }
    }
  };
  const kv = { updated_at: "2026-10-16T18:00:00Z", categories: [{ id: "tv", name: "TV", tier: "wants", budget: 9 }] };
  const doc = gate.applyTiersGet(kv, budget);
  assert.equal(doc.categories.length, 26);
  assert.equal(doc.categories.some(function (row) { return row.merged_into || row.id === "gone" || row.id === "tv"; }), false);
});

test("tiers POST remaps a merged id and rejects a deleted id", function () {
  const budget = {
    category_merge_ids: { "household-health": "shopping" },
    category_deleted_ids: ["other"]
  };
  const kv = { categories: [], budgets_updated_at: { dining: "2026-10-01T00:00:00Z" } };
  const posted = gate.applyTiersPost(kv, {
    updated_at: "2026-10-16T18:00:00Z",
    categories: [
      { id: "shopping", name: "Shopping", tier: "wants", budget: 2 },
      { id: "household-health", name: "Household & Health", tier: "needs", budget: 4, merged_into: "shopping" },
      { id: "groceries", name: "Groceries", tier: "needs", budget: 7 }
    ],
    category_rules: { cafe: "household-health" },
    category_tx: { "h:abcdabcdabcdabcdabcdabcdabcdabcd": "shopping" },
    budgets_updated_at: { groceries: "2026-10-16T18:00:00Z" }
  }, budget);
  assert.equal(posted.ok, true);
  assert.equal(posted.doc.categories.length, 2);
  assert.equal(posted.doc.categories.some(function (row) { return row.id === "household-health"; }), false);
  assert.equal(posted.doc.category_rules.cafe, "shopping");
  assert.equal(posted.doc.budgets_updated_at.groceries, "2026-10-16T18:00:00Z");
  assert.equal(posted.doc.budgets_updated_at.dining, "2026-10-01T00:00:00Z");
  const rejected = gate.applyTiersPost(kv, {
    categories: [
      { id: "shopping", name: "Shopping", tier: "wants", budget: 2 },
      { id: "other", name: "Other", tier: "wants", budget: 1 }
    ]
  }, budget);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "unknown_category");
  const badRule = gate.applyTiersPost(kv, {
    categories: [{ id: "shopping", name: "Shopping", tier: "wants", budget: 2 }],
    category_rules: { cafe: "other" }
  }, budget);
  assert.equal(badRule.ok, false);
  assert.equal(badRule.code, "unknown_category");
});
