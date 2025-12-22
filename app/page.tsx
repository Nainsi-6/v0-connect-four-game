"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GameBoard } from "@/components/game-board"
import { Leaderboard } from "@/components/leaderboard"
import { Users, Bot, Zap } from "lucide-react"

type GameState = "lobby" | "waiting" | "playing" | "finished"
type Player = 1 | 2
type Board = (Player | null)[][]

interface GameData {
  board: Board
  currentPlayer: Player
  yourPlayer: Player
  opponentName: string
  isBot: boolean
  winner: Player | null
  isDraw: boolean
  gameId: string
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [username, setUsername] = useState("")
  const [gameState, setGameState] = useState<GameState>("lobby")
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [message, setMessage] = useState("")
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket", "polling"],
    })

    setSocket(socketInstance)

    socketInstance.on("waiting", (data: { countdown: number }) => {
      setGameState("waiting")
      setMessage("Waiting for opponent...")
      setCountdown(data.countdown)
    })

    socketInstance.on("countdown", (seconds: number) => {
      setCountdown(seconds)
    })

    socketInstance.on("gameStart", (data: GameData) => {
      setGameState("playing")
      setGameData(data)
      setMessage(data.isBot ? "Playing against Bot" : `Playing against ${data.opponentName}`)
      setCountdown(null)
    })

    socketInstance.on("gameUpdate", (data: GameData) => {
      setGameData(data)
    })

    socketInstance.on("gameOver", (data: GameData) => {
      setGameState("finished")
      setGameData(data)
      if (data.isDraw) {
        setMessage("It's a draw!")
      } else if (data.winner === data.yourPlayer) {
        setMessage("You won! 🎉")
      } else {
        setMessage("You lost. Better luck next time!")
      }
    })

    socketInstance.on("opponentDisconnected", () => {
      setMessage("Opponent disconnected. You win by default!")
      setGameState("finished")
    })

    socketInstance.on("error", (error: string) => {
      setMessage(error)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const handleJoinGame = () => {
    if (username.trim() && socket) {
      socket.emit("joinGame", { username: username.trim() })
    }
  }

  const handlePlayAgain = () => {
    setGameState("lobby")
    setGameData(null)
    setMessage("")
    setUsername("")
  }

  const handleMove = (column: number) => {
    if (socket && gameData && gameData.currentPlayer === gameData.yourPlayer) {
      socket.emit("makeMove", { column })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              4 in a Row
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Real-time multiplayer Connect Four</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Game Area */}
          <div className="lg:col-span-2">
            {gameState === "lobby" && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome to 4 in a Row</CardTitle>
                  <CardDescription>
                    Enter your username to start playing. You'll be matched with another player or our competitive bot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
                      className="text-lg h-12"
                    />
                    <Button
                      onClick={handleJoinGame}
                      disabled={!username.trim()}
                      className="w-full h-12 text-lg"
                      size="lg"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Find Match
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <Users className="w-8 h-8 text-primary mb-2" />
                        <h3 className="font-semibold mb-1">1v1 Multiplayer</h3>
                        <p className="text-sm text-muted-foreground">Play against real players</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-secondary/5 border-secondary/20">
                      <CardContent className="pt-6">
                        <Bot className="w-8 h-8 text-secondary mb-2" />
                        <h3 className="font-semibold mb-1">Smart Bot</h3>
                        <p className="text-sm text-muted-foreground">AI opponent if no match</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            {gameState === "waiting" && (
              <Card className="border-2 shadow-lg">
                <CardContent className="py-16">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{message}</h2>
                      {countdown !== null && (
                        <p className="text-muted-foreground">
                          Bot will join in{" "}
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {countdown}s
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(gameState === "playing" || gameState === "finished") && gameData && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {gameData.isBot ? (
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-secondary" />
                            vs Bot
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            vs {gameData.opponentName}
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {gameState === "playing" ? (
                          gameData.currentPlayer === gameData.yourPlayer ? (
                            <Badge className="bg-accent text-accent-foreground">Your Turn</Badge>
                          ) : (
                            <Badge variant="secondary">Opponent's Turn</Badge>
                          )
                        ) : (
                          <Badge variant="outline">{message}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center mb-1">
                          <div className="w-6 h-6 rounded-full bg-white" />
                        </div>
                        <p className="text-xs text-muted-foreground">You</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-1">
                          <div className="w-6 h-6 rounded-full bg-white" />
                        </div>
                        <p className="text-xs text-muted-foreground">Opp</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <GameBoard
                    board={gameData.board}
                    onColumnClick={handleMove}
                    disabled={gameState !== "playing" || gameData.currentPlayer !== gameData.yourPlayer}
                    yourPlayer={gameData.yourPlayer}
                  />
                  {gameState === "finished" && (
                    <Button onClick={handlePlayAgain} className="w-full mt-6" size="lg">
                      Play Again
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <div>
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  )
}
