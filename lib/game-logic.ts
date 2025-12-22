// Core game logic for 4-in-a-Row
export type Player = 1 | 2
export type Cell = Player | null
export type Board = Cell[][]

export interface GameState {
  board: Board
  currentPlayer: Player
  winner: Player | null
  isDraw: boolean
  lastMove: { row: number; col: number } | null
}

export class GameLogic {
  private static readonly ROWS = 6
  private static readonly COLS = 7
  private static readonly WIN_LENGTH = 4

  static createEmptyBoard(): Board {
    return Array(this.ROWS)
      .fill(null)
      .map(() => Array(this.COLS).fill(null))
  }

  static createInitialState(): GameState {
    return {
      board: this.createEmptyBoard(),
      currentPlayer: 1,
      winner: null,
      isDraw: false,
      lastMove: null,
    }
  }

  static dropDisc(board: Board, col: number, player: Player): { row: number; col: number } | null {
    if (col < 0 || col >= this.COLS) return null

    // Find the lowest available row in the column
    for (let row = this.ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        board[row][col] = player
        return { row, col }
      }
    }

    return null // Column is full
  }

  static checkWin(board: Board, lastMove: { row: number; col: number }): boolean {
    const { row, col } = lastMove
    const player = board[row][col]

    if (!player) return false

    // Check horizontal
    if (this.checkDirection(board, row, col, 0, 1, player)) return true

    // Check vertical
    if (this.checkDirection(board, row, col, 1, 0, player)) return true

    // Check diagonal (top-left to bottom-right)
    if (this.checkDirection(board, row, col, 1, 1, player)) return true

    // Check diagonal (bottom-left to top-right)
    if (this.checkDirection(board, row, col, -1, 1, player)) return true

    return false
  }

  private static checkDirection(
    board: Board,
    row: number,
    col: number,
    dRow: number,
    dCol: number,
    player: Player,
  ): boolean {
    let count = 1

    // Check in positive direction
    count += this.countInDirection(board, row, col, dRow, dCol, player)

    // Check in negative direction
    count += this.countInDirection(board, row, col, -dRow, -dCol, player)

    return count >= this.WIN_LENGTH
  }

  private static countInDirection(
    board: Board,
    row: number,
    col: number,
    dRow: number,
    dCol: number,
    player: Player,
  ): number {
    let count = 0
    let r = row + dRow
    let c = col + dCol

    while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
      count++
      r += dRow
      c += dCol
    }

    return count
  }

  static checkDraw(board: Board): boolean {
    return board[0].every((cell) => cell !== null)
  }

  static getValidMoves(board: Board): number[] {
    const validMoves: number[] = []
    for (let col = 0; col < this.COLS; col++) {
      if (board[0][col] === null) {
        validMoves.push(col)
      }
    }
    return validMoves
  }
}
