"use strict";

/* Canonical override rules for the murphysbn-gate Worker.
   The live worker is not in this repo. Copy these into applyOverridesToTxRows,
   the override write handler, and the tiers GET, then deploy murphysbn-gate.
   Lookup order: tx_id, replaced_alert, legacy date|id|amount|desc, then tx_key.
   A legacy hit is copied onto tx_id. The legacy entry stays.
   GET /data/banking/tiers.json should return applyTiersGet(kvDoc, snapshot.budget)
   and must not write the KV tiers doc. The snapshot field budget.tiers_overlay
   supplies the cleaned list. A KV updated_at newer than overlay.updated_at keeps
   the saved categories. category_rules merge per key: overlay wins, and a KV key
   the overlay lacks stays. category_merges, category_merge_ids, and category_deleted
   hide a deleted row and point a merged id at its target. */

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

var SPEND_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function stampOf(value) {
  if (typeof value === "number" && isFinite(value)) return value;
  var n = Date.parse(value == null ? "" : String(value));
  return isFinite(n) ? n : 0;
}

function tiersOverlay(budget) {
  var overlay = budget && budget.tiers_overlay;
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return null;
  return overlay;
}

function overlayWinsKv(kvDoc, overlay) {
  if (!overlay) return false;
  var kv = stampOf(kvDoc && kvDoc.updated_at);
  var over = stampOf(overlay.updated_at);
  if (!kv) return true;
  if (!over) return false;
  return kv <= over;
}

function overlayCategoryRows(overlay) {
  if (!overlay) return null;
  var tiers = overlay.tiers;
  if (Array.isArray(tiers)) return tiers;
  if (tiers && typeof tiers === "object" && !Array.isArray(tiers)) {
    if (Array.isArray(tiers.categories)) return tiers.categories;
    return null;
  }
  if (Array.isArray(overlay.categories)) return overlay.categories;
  return null;
}

function overlayRuleBag(overlay, field) {
  if (!overlay) return null;
  if (overlay[field] && typeof overlay[field] === "object" && !Array.isArray(overlay[field])) return overlay[field];
  var tiers = overlay.tiers;
  if (tiers && typeof tiers === "object" && !Array.isArray(tiers) && tiers[field] && typeof tiers[field] === "object") return tiers[field];
  return null;
}

function redactedRuleKeys(overlay) {
  var bag = {};
  var raw = overlay && overlay.privacy_redacted;
  var list = null;
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") list = raw.category_rules || raw.rules || raw.keys;
  if (!Array.isArray(list)) return bag;
  list.forEach(function (key) {
    if (key != null && String(key).trim()) bag[String(key).trim()] = true;
  });
  return bag;
}

function mergeRuleBag(kvBag, overlayBag, overlay) {
  var out = {};
  var kv = kvBag && typeof kvBag === "object" && !Array.isArray(kvBag) ? kvBag : {};
  var over = overlayBag && typeof overlayBag === "object" && !Array.isArray(overlayBag) ? overlayBag : {};
  Object.keys(kv).forEach(function (k) {
    if (kv[k] == null || kv[k] === "") return;
    out[k] = kv[k];
  });
  var redacted = redactedRuleKeys(overlay);
  Object.keys(over).forEach(function (k) {
    if (redacted[k]) return;
    if (over[k] == null || over[k] === "") return;
    out[k] = over[k];
  });
  return out;
}

function addMergeMap(merges, map) {
  if (!map) return;
  if (Array.isArray(map)) {
    map.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var from = item.from || item.id || item.old || item.source;
      var to = item.to || item.into || item.merged_into || item.target || item.new;
      if (from == null || to == null) return;
      var key = String(from).trim();
      var dest = String(to).trim();
      if (key && dest) merges[key] = dest;
    });
    return;
  }
  if (typeof map !== "object") return;
  Object.keys(map).forEach(function (k) {
    var v = map[k];
    if (v && typeof v === "object") v = v.id || v.to || v.into || v.merged_into || v.target;
    if (v == null) return;
    var key = String(k).trim();
    var dest = String(v).trim();
    if (key && dest) merges[key] = dest;
  });
}

function addDeletedIds(deleted, bag) {
  if (!bag) return;
  if (Array.isArray(bag)) {
    bag.forEach(function (id) {
      if (id != null && String(id).trim()) deleted[String(id).trim()] = true;
    });
    return;
  }
  if (typeof bag === "object") Object.keys(bag).forEach(function (k) { if (bag[k]) deleted[String(k).trim()] = true; });
}

function spendSlug(name, rows) {
  var slug = String(name || "").trim().toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug || !/^[a-z0-9]/.test(slug)) slug = slug ? ("c-" + slug) : "category";
  if (slug.length > 40) slug = slug.slice(0, 40).replace(/-+$/, "");
  var id = slug || "category";
  var n = 2;
  function taken(candidate) {
    var hit = false;
    (rows || []).forEach(function (row) { if (row && row.id === candidate) hit = true; });
    return hit;
  }
  while (taken(id) && n < 100) {
    var suffix = "-" + n;
    id = slug.slice(0, 40 - suffix.length) + suffix;
    n += 1;
  }
  return SPEND_ID.test(id) ? id : "";
}

function matchToken(rows, token) {
  var t = String(token || "").trim();
  if (!t) return "";
  var byId = "";
  var byName = "";
  var low = t.toLowerCase();
  (rows || []).forEach(function (row) {
    if (!row) return;
    if (!byId && row.id === t) byId = row.id;
    if (!byName && String(row.name || "").trim().toLowerCase() === low) byName = row.id;
  });
  if (byId) return byId;
  if (byName) return byName;
  return SPEND_ID.test(t) ? t : "";
}

function normalizeSpendRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  var id = String(raw.id == null ? "" : raw.id).trim();
  if (!SPEND_ID.test(id)) return null;
  var name = String(raw.name == null ? "" : raw.name).trim() || id;
  if (name.length > 40) name = name.slice(0, 40);
  var tier = raw.tier === "required" || raw.tier === "needs" || raw.tier === "wants" ? raw.tier : "wants";
  var budget = 0;
  if (typeof raw.budget === "number" && isFinite(raw.budget) && raw.budget >= 0) budget = raw.budget;
  var merged = raw.merged_into == null || raw.merged_into === "" ? "" : String(raw.merged_into);
  return { id: id, name: name, tier: tier, budget: budget, merged_into: merged };
}

function categoryMergeSpec(budget) {
  budget = budget || {};
  var overlay = tiersOverlay(budget);
  var merges = {};
  var deleted = {};
  addMergeMap(merges, budget.category_merge_ids);
  addMergeMap(merges, budget.category_merges);
  addDeletedIds(deleted, budget.category_deleted);
  if (overlay) {
    addMergeMap(merges, overlay.category_merge_ids);
    addMergeMap(merges, overlay.category_merges);
    addDeletedIds(deleted, overlay.category_deleted);
  }
  var box = budget.box_categories;
  var names = [];
  if (Array.isArray(box)) {
    box.forEach(function (item) {
      if (typeof item === "string" || typeof item === "number") names.push(String(item));
    });
  } else if (box && typeof box === "object") {
    addMergeMap(merges, box.merged_into);
    addDeletedIds(deleted, box.deleted);
    var list = Array.isArray(box.categories) ? box.categories : [];
    list.forEach(function (item) {
      if (item == null) return;
      if (typeof item === "string" || typeof item === "number") {
        names.push(String(item));
        return;
      }
      var n = clip(item.name || item.category || item.label);
      if (!n) return;
      if (item.merged_into) merges[n] = clip(item.merged_into) || String(item.merged_into);
      if (item.deleted || item.merged || item.hidden) {
        if (!item.merged_into) deleted[n] = true;
        return;
      }
      names.push(n);
    });
  }
  return { merges: merges, deleted: deleted, boxNames: names };
}

function cleanCategoryRows(rows, budget, structural) {
  var out = [];
  var seen = {};
  (rows || []).forEach(function (raw) {
    var row = normalizeSpendRow(raw);
    if (!row || seen[row.id]) return;
    seen[row.id] = true;
    out.push(row);
  });
  if (!structural) return out;
  var spec = categoryMergeSpec(budget);
  (spec.boxNames || []).forEach(function (name) {
    var label = clip(name);
    if (!label || spec.deleted[label]) return;
    var exists = false;
    out.forEach(function (row) {
      if (row.id === label || String(row.name || "").toLowerCase() === label.toLowerCase()) exists = true;
    });
    if (exists) return;
    var id = spendSlug(label, out);
    if (!id || seen[id]) return;
    seen[id] = true;
    out.push({ id: id, name: label, tier: "wants", budget: 0, merged_into: "" });
  });
  out.forEach(function (row) {
    var target = spec.merges[row.id] || spec.merges[row.name];
    if (!target) return;
    var resolved = matchToken(out, target);
    if (resolved && resolved !== row.id) row.merged_into = resolved;
  });
  return out.filter(function (row) {
    if (row.merged_into) return true;
    return !(spec.deleted[row.id] || spec.deleted[row.name]);
  });
}

function remapToken(token, spec, rows) {
  var cur = String(token == null ? "" : token).trim();
  if (!cur) return "";
  var seen = {};
  var guard = 0;
  while (cur && !seen[cur] && guard < 12) {
    seen[cur] = true;
    var next = spec.merges[cur];
    if (!next) break;
    var resolved = matchToken(rows, next) || String(next).trim();
    if (!resolved || resolved === cur) break;
    cur = resolved;
    guard += 1;
  }
  if (spec.deleted[cur]) return "";
  return cur;
}

function remapRuleValues(bag, spec, rows) {
  var out = {};
  Object.keys(bag || {}).forEach(function (k) {
    if (bag[k] == null || bag[k] === "") return;
    var next = remapToken(bag[k], spec, rows);
    if (next) out[k] = next;
  });
  return out;
}

/* Tiers GET. Does not write KV. */
function applyTiersGet(kvDoc, budget) {
  var kv = kvDoc && typeof kvDoc === "object" && !Array.isArray(kvDoc) ? kvDoc : {};
  var overlay = tiersOverlay(budget);
  var wins = !!(overlay && overlayWinsKv(kv, overlay));
  var doc = {};
  Object.keys(kv).forEach(function (k) { doc[k] = kv[k]; });
  if (wins) {
    var rows = overlayCategoryRows(overlay);
    if (rows) doc.categories = rows;
  }
  if (Array.isArray(doc.categories)) doc.categories = cleanCategoryRows(doc.categories, budget, !overlay || wins);
  var spec = categoryMergeSpec(budget);
  doc.category_rules = remapRuleValues(mergeRuleBag(kv.category_rules, overlay ? overlayRuleBag(overlay, "category_rules") : null, overlay), spec, doc.categories || []);
  doc.category_tx = remapRuleValues(mergeRuleBag(kv.category_tx, overlay ? overlayRuleBag(overlay, "category_tx") : null, overlay), spec, doc.categories || []);
  return doc;
}

module.exports = {
  legacyKey: legacyKey,
  lookupKeys: lookupKeys,
  migrateOverrideKeys: migrateOverrideKeys,
  applyOverridesToTxRows: applyOverridesToTxRows,
  writeOverride: writeOverride,
  mergeBoxCategories: mergeBoxCategories,
  applyTiersGet: applyTiersGet
};
