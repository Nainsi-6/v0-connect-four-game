"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Clock, Trophy, Activity } from "lucide-react"

interface AnalyticsData {
  averageDuration: number
  topWinners: { winner: string; win_count: number }[]
  totalMoves: number
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/metrics")
        if (response.ok) {
          const json = await response.json()
          setData(json)
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!data) return null

  return (
    <Card className="border-2 shadow-lg mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <CardTitle>Live Analytics</CardTitle>
        </div>
        <CardDescription>Real-time game metrics via Kafka</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Avg Game</span>
            </div>
            <p className="text-2xl font-bold text-primary">{data.averageDuration}s</p>
          </div>

          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Total Moves</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{data.totalMoves}</p>
          </div>
        </div>

        {data.topWinners.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Frequent Winners
            </h4>
            <div className="space-y-2">
              {data.topWinners.map((w, i) => (
                <div key={w.winner} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {i + 1}. {w.winner}
                  </span>
                  <span className="font-mono font-bold">{w.win_count} wins</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
