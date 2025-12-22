"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"

interface LeaderboardEntry {
  username: string
  wins: number
  rank: number
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/leaderboard`)
        const data = await response.json()
        setLeaderboard(data)
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-accent" />
      case 2:
        return <Medal className="w-5 h-5 text-muted-foreground" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <span className="text-muted-foreground font-mono">#{rank}</span>
    }
  }

  return (
    <Card className="border-2 shadow-lg sticky top-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <CardTitle>Leaderboard</CardTitle>
        </div>
        <CardDescription>Top players by wins</CardDescription>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No games played yet</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.username}
                className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-muted/50 transition-colors border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center justify-center">{getRankIcon(entry.rank)}</div>
                  <span className="font-medium">{entry.username}</span>
                </div>
                <span className="font-bold text-primary">{entry.wins}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
