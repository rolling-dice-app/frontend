/** 結構化深比對（object / array / 原始值）；不處理 Map / Set / Date 等特殊型別。 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (Array.isArray(b)) return false
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const ak = Object.keys(ao)
  const bk = Object.keys(bo)
  if (ak.length !== bk.length) return false
  return ak.every((k) => k in bo && deepEqual(ao[k], bo[k]))
}
