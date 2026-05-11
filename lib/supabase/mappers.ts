export type DbRow = Record<string, unknown>

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

export function fromDb<T>(row: DbRow): T {
  const result: DbRow = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'user_id') continue
    result[snakeToCamel(key)] = value
  }
  return result as T
}

export function toDbInsert(obj: object, userId: string): DbRow {
  const result: DbRow = { user_id: userId }
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value
  }
  return result
}

export function toDbPatch(patch: object): DbRow {
  const result: DbRow = { updated_at: new Date().toISOString() }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue
    result[camelToSnake(key)] = value
  }
  return result
}
