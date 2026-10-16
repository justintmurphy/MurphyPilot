"use strict";

/* Canonical override rules for the murphysbn-gate Worker.
   The live worker is not in this repo. Copy these into applyOverridesToTxRows
   and the override write handler, then deploy murphysbn-gate before the next pull.
   Lookup order: tx_id, replaced_alert, legacy date|id|amount|desc, then tx_key.
   A legacy hit is copied onto tx_id. The legacy entry stays. */

function part(v) {
  if (v == null) return "";
  return String(v);
}

function legacyKey(row) {
  row = row || {};
  return [part(row.date), part(row.id), part(row.amount), part(row.desc)].join("|");
}

function pushKey(keys, v) {
  if (v == null) return;
  var k = String(v).trim();
  if (!k || keys.indexOf(k) >= 0) return;
  keys.push(k);
}

function lookupKeys(row) {
  row = row || {};
  var keys = [];
  pushKey(keys, row.tx_id);
  var replaced = row.replaced_alert;
  if (replaced && typeof replaced === "object") replaced = replaced.tx_key || replaced.key || replaced.pending_tx_key || "";
  pushKey(keys, replaced);
  pushKey(keys, legacyKey(row));
  pushKey(keys, row.tx_key);
  return keys;
}

function clip(name) {
  if (name == null) return "";
  var n = String(name).trim();
  if (!n) return "";
  if (n.length > 48) n = n.slice(0, 48).trim();
  return n;
}

function readHit(map, row) {
  if (!map || typeof map !== "object") return null;
  var keys = lookupKeys(row);
  var i;
  for (i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(map, keys[i])) continue;
    var v = map[keys[i]];
    if (v == null || String(v).trim() === "") continue;
    return v;
  }
  return null;
}

/* Copy legacy-key hits onto tx_id. Keep every existing entry. */
function migrateOverrideKeys(rows, overrides) {
  var next = {};
  var src = overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {};
  Object.keys(src).forEach(function (k) { next[k] = src[k]; });
  (rows || []).forEach(function (row) {
    if (!row || row.tx_id == null || String(row.tx_id).trim() === "") return;
    var id = String(row.tx_id).trim();
    if (next[id] != null && String(next[id]).trim() !== "") return;
    var keys = lookupKeys(row);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] === id) continue;
      if (!Object.prototype.hasOwnProperty.call(next, keys[i])) continue;
      var v = next[keys[i]];
      if (v == null || String(v).trim() === "") continue;
      next[id] = v;
      return;
    }
  });
  return next;
}

function asBag(overrides) {
  var src = overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {};
  if (src.category_overrides || src.tier_overrides) {
    return {
      category_overrides: src.category_overrides || {},
      tier_overrides: src.tier_overrides || {}
    };
  }
  return { category_overrides: src, tier_overrides: {} };
}

function applyOverridesToTxRows(rows, overrides) {
  var bags = asBag(overrides);
  var cats = migrateOverrideKeys(rows, bags.category_overrides);
  var tiers = migrateOverrideKeys(rows, bags.tier_overrides);
  return (rows || []).map(function (row) {
    var out = {};
    var src = row || {};
    Object.keys(src).forEach(function (k) { out[k] = src[k]; });
    var cat = readHit(cats, src);
    if (typeof cat === "string" && cat.trim()) out.category = cat.trim();
    else if (cat && typeof cat === "object" && cat.category) out.category = String(cat.category).trim();
    var tier = readHit(tiers, src);
    if (typeof tier === "string" && tier.trim()) out.tier = tier.trim();
    else if (tier && typeof tier === "object" && tier.tier) out.tier = String(tier.tier).trim();
    else if (cat && typeof cat === "object" && cat.tier) out.tier = String(cat.tier).trim();
    return out;
  });
}

/* Write endpoint. Prefer tx_id. Also keep body.key so an older reader still hits. */
function writeOverride(store, body) {
  var bags = asBag(store);
  var cats = {};
  var tiers = {};
  Object.keys(bags.category_overrides || {}).forEach(function (k) { cats[k] = bags.category_overrides[k]; });
  Object.keys(bags.tier_overrides || {}).forEach(function (k) { tiers[k] = bags.tier_overrides[k]; });
  body = body || {};
  var id = body.tx_id == null ? "" : String(body.tx_id).trim();
  var key = body.key == null ? "" : String(body.key).trim();
  var primary = id || key;
  if (!primary) return { category_overrides: cats, tier_overrides: tiers };
  if (body.category != null && String(body.category).trim()) {
    var cat = String(body.category).trim();
    cats[primary] = cat;
    if (key && key !== primary) cats[key] = cat;
  }
  if (body.tier != null && String(body.tier).trim()) {
    var tier = String(body.tier).trim();
    tiers[primary] = tier;
    if (key && key !== primary) tiers[key] = tier;
  }
  return { category_overrides: cats, tier_overrides: tiers };
}

function mergeBoxCategories(custom, box) {
  var seen = {};
  var names = [];
  function add(name) {
    var n = clip(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    names.push(n);
  }
  (Array.isArray(custom) ? custom : []).forEach(add);
  var hidden = {};
  var merged = {};
  function hide(name) {
    var n = clip(name);
    if (n) hidden[n] = true;
  }
  function link(src, dest) {
    var a = clip(src);
    var b = clip(dest);
    if (!a || !b || a === b) return;
    merged[a] = b;
    hidden[a] = true;
  }
  if (box && typeof box === "object") {
    var list = Array.isArray(box) ? box : (Array.isArray(box.categories) ? box.categories : []);
    var map = !Array.isArray(box) && box.merged_into && typeof box.merged_into === "object" ? box.merged_into : null;
    var deleted = null;
    if (!Array.isArray(box)) {
      if (Array.isArray(box.deleted)) deleted = box.deleted;
      else if (box.deleted && typeof box.deleted === "object") deleted = Object.keys(box.deleted);
    }
    if (map) Object.keys(map).forEach(function (oldName) { link(oldName, map[oldName]); });
    if (deleted) deleted.forEach(hide);
    list.forEach(function (item) {
      if (item == null) return;
      if (typeof item === "string" || typeof item === "number") {
        add(item);
        return;
      }
      var n = clip(item.name || item.category || item.label);
      if (!n) return;
      if (item.merged_into) link(n, item.merged_into);
      if (item.deleted || item.merged || item.hidden) {
        hide(n);
        return;
      }
      add(n);
    });
  }
  function resolve(name) {
    var n = clip(name);
    var seenHop = {};
    var guard = 0;
    while (n && merged[n] && !seenHop[n] && guard < 12) {
      seenHop[n] = true;
      n = merged[n];
      guard += 1;
    }
    return n;
  }
  var out = [];
  var outSeen = {};
  names.forEach(function (name) {
    var n = resolve(name);
    if (!n || hidden[n] || outSeen[n]) return;
    outSeen[n] = true;
    out.push(n);
  });
  return { categories: out, merged_into: merged };
}

module.exports = {
  legacyKey: legacyKey,
  lookupKeys: lookupKeys,
  migrateOverrideKeys: migrateOverrideKeys,
  applyOverridesToTxRows: applyOverridesToTxRows,
  writeOverride: writeOverride,
  mergeBoxCategories: mergeBoxCategories
};
