// Database utility using PostgreSQL
// Supports both Neon and Supabase

let dbClient: any = null

export async function getDbClient() {
  if (dbClient) return dbClient

  // Check for database connection string
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!connectionString) {
    throw new Error("No database connection string found. Please set DATABASE_URL or POSTGRES_URL.")
  }

  // Use Neon serverless driver if available
  try {
    const { neon } = await import("@neondatabase/serverless")
    dbClient = neon(connectionString)
    console.log("[v0] Database client initialized (Neon)")
    return dbClient
  } catch (error) {
    // Fallback to standard pg client
    try {
      const { Pool } = await import("pg")
      const pool = new Pool({ connectionString })
      dbClient = pool
      console.log("[v0] Database client initialized (PostgreSQL)")
      return dbClient
    } catch (pgError) {
      console.error("[v0] Failed to initialize database client:", pgError)
      throw new Error("Database initialization failed")
    }
  }
}

export async function query(sql: string, params?: any[]) {
  const client = await getDbClient()

  try {
    if (typeof client === "function") {
      const result = await client(sql, params)
      return result
    } else {
      // pg Pool client
      const result = await client.query(sql, params)
      return result.rows
    }
  } catch (error) {
    console.error("[v0] Database query error:", error)
    throw error
  }
}

export async function insertEvent(event: any) {
  const sql = `
    INSERT INTO analytics_events (event_type, game_id, player, metadata, timestamp)
    VALUES ($1, $2, $3, $4, $5)
  `
  const params = [
    event.type,
    event.gameId || null,
    event.player || event.winner || null,
    JSON.stringify(event),
    event.timestamp || new Date().toISOString(),
  ]
  return query(sql, params)
}
