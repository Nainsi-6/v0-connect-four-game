import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Kafka consumer would POST to this endpoint
export async function POST(request: NextRequest) {
  try {
    const event = await request.json()

    await query(
      `
      INSERT INTO analytics_events (event_type, game_id, player, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [event.type, event.gameId || null, event.player || null, JSON.stringify(event), event.timestamp],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving analytics event:", error)
    return NextResponse.json({ error: "Failed to save analytics event" }, { status: 500 })
  }
}

// Get analytics data
export async function GET() {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'GAME_END') as total_games,
        COUNT(DISTINCT game_id) as unique_games,
        COUNT(DISTINCT player) as unique_players,
        AVG(CAST(metadata->>'duration' AS INTEGER)) FILTER (WHERE event_type = 'GAME_END') as avg_duration,
        COUNT(*) FILTER (WHERE event_type = 'GAME_END' AND DATE(timestamp) = CURRENT_DATE) as games_today
      FROM analytics_events
    `)

    return NextResponse.json(stats[0] || {})
  } catch (error) {
    console.error("[v0] Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
