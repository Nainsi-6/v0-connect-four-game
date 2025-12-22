import { type Board, type Player, GameLogic } from "./game-logic"

export class BotAI {
  private static readonly ROWS = 6
  private static readonly COLS = 7

  static getBestMove(board: Board, botPlayer: Player): number {
    const opponent: Player = botPlayer === 1 ? 2 : 1

    // Priority 1: Check if bot can win in next move
    const winningMove = this.findWinningMove(board, botPlayer)
    if (winningMove !== null) return winningMove

    // Priority 2: Block opponent from winning
    const blockingMove = this.findWinningMove(board, opponent)
    if (blockingMove !== null) return blockingMove

    // Priority 3: Try to create opportunities - prefer center columns
    const strategicMove = this.findStrategicMove(board, botPlayer)
    if (strategicMove !== null) return strategicMove

    // Fallback: Return any valid move (shouldn't reach here)
    const validMoves = GameLogic.getValidMoves(board)
    return validMoves[0]
  }

  private static findWinningMove(board: Board, player: Player): number | null {
    const validMoves = GameLogic.getValidMoves(board)

    for (const col of validMoves) {
      // Simulate the move
      const boardCopy = board.map((row) => [...row])
      const move = GameLogic.dropDisc(boardCopy, col, player)

      if (move && GameLogic.checkWin(boardCopy, move)) {
        return col
      }
    }

    return null
  }

  private static findStrategicMove(board: Board, player: Player): number | null {
    const validMoves = GameLogic.getValidMoves(board)

    // Score each move based on strategic value
    const moveScores = validMoves.map((col) => ({
      col,
      score: this.evaluateMove(board, col, player),
    }))

    // Sort by score descending
    moveScores.sort((a, b) => b.score - a.score)

    return moveScores[0]?.col ?? null
  }

  private static evaluateMove(board: Board, col: number, player: Player): number {
    let score = 0

    // Prefer center columns
    const centerCol = Math.floor(this.COLS / 2)
    score += (7 - Math.abs(col - centerCol)) * 10

    // Simulate move and check for potential connections
    const boardCopy = board.map((row) => [...row])
    const move = GameLogic.dropDisc(boardCopy, col, player)

    if (!move) return -1000

    const { row } = move

    // Check how many pieces this move connects with
    score += this.countConnections(boardCopy, row, col, player) * 50

    // Avoid moves that allow opponent to win on next turn
    const opponent: Player = player === 1 ? 2 : 1
    if (row > 0) {
      // Check if opponent can win by placing on top of this move
      const testBoard = boardCopy.map((r) => [...r])
      const testMove = GameLogic.dropDisc(testBoard, col, opponent)
      if (testMove && GameLogic.checkWin(testBoard, testMove)) {
        score -= 1000 // Heavily penalize this move
      }
    }

    return score
  }

  private static countConnections(board: Board, row: number, col: number, player: Player): number {
    let connections = 0
    const directions = [
      { dr: 0, dc: 1 }, // horizontal
      { dr: 1, dc: 0 }, // vertical
      { dr: 1, dc: 1 }, // diagonal \
      { dr: 1, dc: -1 }, // diagonal /
    ]

    for (const { dr, dc } of directions) {
      let count = 1 // Current piece

      // Count in positive direction
      let r = row + dr
      let c = col + dc
      while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
        count++
        r += dr
        c += dc
      }

      // Count in negative direction
      r = row - dr
      c = col - dc
      while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
        count++
        r -= dr
        c -= dc
      }

      if (count >= 2) {
        connections += count
      }
    }

    return connections
  }
}
