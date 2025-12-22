"use client"

import { cn } from "@/lib/utils"

type Player = 1 | 2
type Board = (Player | null)[][]

interface GameBoardProps {
  board: Board
  onColumnClick: (column: number) => void
  disabled: boolean
  yourPlayer: Player
}

export function GameBoard({ board, onColumnClick, disabled, yourPlayer }: GameBoardProps) {
  const handleColumnClick = (column: number) => {
    if (disabled) return

    // Check if column is full
    if (board[0][column] !== null) return

    onColumnClick(column)
  }

  return (
    <div className="inline-block bg-primary/10 p-6 rounded-xl border-2 border-primary/20">
      <div className="grid grid-cols-7 gap-3">
        {board[0].map((_, colIndex) => (
          <button
            key={colIndex}
            onClick={() => handleColumnClick(colIndex)}
            disabled={disabled || board[0][colIndex] !== null}
            className={cn(
              "w-12 h-12 rounded-lg transition-all duration-200 hover:bg-primary/20",
              disabled || board[0][colIndex] !== null
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:scale-105",
            )}
          >
            {!disabled && board[0][colIndex] === null && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3 mt-3">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                "w-12 h-12 rounded-full border-4 transition-all duration-300 flex items-center justify-center",
                cell === null && "bg-card border-border",
                cell === yourPlayer && "bg-destructive border-destructive/20 shadow-lg",
                cell !== null && cell !== yourPlayer && "bg-accent border-accent/20 shadow-lg",
              )}
            >
              {cell !== null && <div className="w-8 h-8 rounded-full bg-white shadow-inner" />}
            </div>
          )),
        )}
      </div>
    </div>
  )
}
