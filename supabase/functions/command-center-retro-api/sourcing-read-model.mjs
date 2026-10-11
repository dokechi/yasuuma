// Derive the same supplier metrics for display without persisting on GET.
export function sourcingSuppliers(signals, reviews, storedSuppliers, storedCandidates, supplierInfo) {
  const suppliers = new Map(storedSuppliers.map(row => [row.supplier_key, {...row}]));
  const candidates = new Map(storedCandidates.map(row => [String(row.signal_id), {...row}]));
  const observedSuppliers = new Set();
  const newer = (value, previous) => Number.isFinite(Date.parse(value)) && (!previous || Date.parse(value) > Date.parse(previous));
  for (const signal of signals) {
    const info = supplierInfo(signal.source_title, signal.source_url);
    const previous = suppliers.get(info.key) || {};
    if (!observedSuppliers.has(info.key)) {
      suppliers.set(info.key, {...previous, supplier_key: info.key, supplier_name: info.name,
        canonical_host: info.host || null, homepage_url: info.homepage,
        first_seen_at: previous.first_seen_at || signal.last_seen_at || null});
      observedSuppliers.add(info.key);
    }
    candidates.set(String(signal.id), {signal_id: String(signal.id), supplier_key: info.key,
      last_seen_at: signal.last_seen_at || null});
  }
  const counts = new Map();
  for (const review of reviews) {
    const count = counts.get(review.supplier_key) || {success: 0, close: 0, miss: 0, lastSuccess: null};
    if (['success', 'close', 'miss'].includes(review.verdict)) count[review.verdict]++;
    if (review.verdict === 'success' && newer(review.judged_at, count.lastSuccess)) count.lastSuccess = review.judged_at;
    counts.set(review.supplier_key, count);
  }
  const seen = new Map();
  for (const candidate of candidates.values()) {
    const count = seen.get(candidate.supplier_key) || {count: 0, lastSeen: null};
    count.count++;
    if (newer(candidate.last_seen_at, count.lastSeen)) count.lastSeen = candidate.last_seen_at;
    seen.set(candidate.supplier_key, count);
  }
  return [...suppliers.values()].map(row => {
    const review = counts.get(row.supplier_key) || {success: 0, close: 0, miss: 0, lastSuccess: null};
    const candidate = seen.get(row.supplier_key) || {count: 0, lastSeen: null};
    return {...row, last_seen_at: candidate.lastSeen || row.last_seen_at || null,
      last_success_at: review.lastSuccess, success_count: review.success, close_count: review.close,
      miss_count: review.miss, candidate_count: candidate.count,
      trust_score: Math.min(100, 50 + review.success * 15 + review.close * 3),
      priority_boost: review.success > 0 ? Math.min(10, 5 + Math.max(0, review.success - 1) * 2 + Math.min(3, review.close)) : Math.min(5, review.close)};
  }).sort((a, b) => b.priority_boost - a.priority_boost || b.success_count - a.success_count ||
    String(b.last_seen_at || '').localeCompare(String(a.last_seen_at || '')) || a.supplier_key.localeCompare(b.supplier_key));
}
