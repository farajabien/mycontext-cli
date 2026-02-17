/**
 * Deep Merge Utility for MyContext
 * 
 * Recursively merges objects. Arrays are concatenated (with dedup by 'name' or 'id').
 * Used by ContextSyncer and PlanningMode to safely merge LLM suggestions into context.json.
 */

/**
 * Deep merge two objects. Source values override target values.
 * - Objects: recursively merged
 * - Arrays: concatenated, deduped by 'name' or 'id' field if objects
 * - Primitives: source wins
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") return source as T;

  const result = { ...target } as any;

  for (const key of Object.keys(source)) {
    const targetVal = (target as any)[key];
    const sourceVal = (source as any)[key];

    if (sourceVal === undefined) continue;
    if (sourceVal === null) {
      result[key] = null;
      continue;
    }

    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      // Merge arrays: concat + dedup by 'name' or 'id' if elements are objects
      result[key] = mergeArrays(targetVal, sourceVal);
    } else if (
      typeof targetVal === "object" &&
      !Array.isArray(targetVal) &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      // Primitives: source wins
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Merge two arrays. If elements are objects with 'name' or 'id' fields,
 * dedup by that field (source wins on conflict).
 */
function mergeArrays(target: any[], source: any[]): any[] {
  if (target.length === 0) return [...source];
  if (source.length === 0) return [...target];

  // Check if elements are objects with identity fields
  const hasIdentity = (arr: any[]) =>
    arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && ("name" in arr[0] || "id" in arr[0]);

  if (hasIdentity(target) || hasIdentity(source)) {
    const getKey = (item: any): string => item.id || item.name || JSON.stringify(item);
    const map = new Map<string, any>();
    
    for (const item of target) {
      map.set(getKey(item), item);
    }
    for (const item of source) {
      const key = getKey(item);
      if (map.has(key)) {
        // Merge existing items
        const existing = map.get(key);
        if (typeof existing === "object" && typeof item === "object") {
          map.set(key, deepMerge(existing, item));
        } else {
          map.set(key, item);
        }
      } else {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }

  // Primitives: concat and dedup
  return [...new Set([...target, ...source])];
}
