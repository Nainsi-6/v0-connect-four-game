import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // 1. Average game duration
    const durationResult = await sql(`
      SELECT AVG(duration_seconds) as avg_duration 
      FROM games 
      WHERE is_bot_game = false
    `)

    // 2. Most frequent winners (top 3)
    const winnersResult = await sql(`
      SELECT winner, COUNT(*) as win_count 
      FROM games 
      WHERE winner IS NOT NULL AND winner != 'AI Bot'
      GROUP BY winner 
      ORDER BY win_count DESC 
      LIMIT 3
    `)

    // 3. Games per hour (last 24 hours)
    const gamesByHour = await sql(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM games
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `)

    // 4. Total moves made (from analytics events)
    const movesResult = await sql(`
      SELECT COUNT(*) as total_moves 
      FROM analytics_events 
      WHERE event_type = 'MOVE_MADE'
    `)

    return NextResponse.json({
      averageDuration: Math.round(durationResult[0]?.avg_duration || 0),
      topWinners: winnersResult,
      hourlyActivity: gamesByHour,
      totalMoves: Number.parseInt(movesResult[0]?.total_moves || "0"),
    })
  } catch (error) {
    console.error("[v0] Metrics API Error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
