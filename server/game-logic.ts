export type Player = 1 | 2
export type Board = (Player | null)[][]

export class GameLogic {
  static createEmptyBoard(): Board {
    return Array(6)
      .fill(null)
      .map(() => Array(7).fill(null))
  }

  static dropDisc(board: Board, column: number, player: Player): Board | null {
    // Find the lowest empty row in the column
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === null) {
        const newBoard = board.map((row) => [...row])
        newBoard[row][column] = player
        return newBoard
      }
    }
    return null // Column is full
  }

  static checkWin(board: Board, lastRow: number, lastCol: number): boolean {
    const player = board[lastRow][lastCol]
    if (player === null) return false

    // Check horizontal
    let count = 1
    // Check left
    for (let c = lastCol - 1; c >= 0 && board[lastRow][c] === player; c--) count++
    // Check right
    for (let c = lastCol + 1; c < 7 && board[lastRow][c] === player; c++) count++
    if (count >= 4) return true

    // Check vertical
    count = 1
    // Check down
    for (let r = lastRow + 1; r < 6 && board[r][lastCol] === player; r++) count++
    // Check up
    for (let r = lastRow - 1; r >= 0 && board[r][lastCol] === player; r--) count++
    if (count >= 4) return true

    // Check diagonal (top-left to bottom-right)
    count = 1
    // Check up-left
    for (let r = lastRow - 1, c = lastCol - 1; r >= 0 && c >= 0 && board[r][c] === player; r--, c--) count++
    // Check down-right
    for (let r = lastRow + 1, c = lastCol + 1; r < 6 && c < 7 && board[r][c] === player; r++, c++) count++
    if (count >= 4) return true

    // Check diagonal (top-right to bottom-left)
    count = 1
    // Check up-right
    for (let r = lastRow - 1, c = lastCol + 1; r >= 0 && c < 7 && board[r][c] === player; r--, c++) count++
    // Check down-left
    for (let r = lastRow + 1, c = lastCol - 1; r < 6 && c >= 0 && board[r][c] === player; r++, c--) count++
    if (count >= 4) return true

    return false
  }

  static isDraw(board: Board): boolean {
    return board[0].every((cell) => cell !== null)
  }

  static getLowestEmptyRow(board: Board, column: number): number {
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === null) {
        return row
      }
    }
    return -1
  }

  static findBestMove(board: Board, botPlayer: Player): number {
    const opponentPlayer = botPlayer === 1 ? 2 : 1

    // Priority 1: Win if possible
    for (let col = 0; col < 7; col++) {
      const testBoard = this.dropDisc(board, col, botPlayer)
      if (testBoard) {
        const row = this.getLowestEmptyRow(board, col)
        if (this.checkWin(testBoard, row, col)) {
          return col
        }
      }
    }

    // Priority 2: Block opponent from winning
    for (let col = 0; col < 7; col++) {
      const testBoard = this.dropDisc(board, col, opponentPlayer)
      if (testBoard) {
        const row = this.getLowestEmptyRow(board, col)
        if (this.checkWin(testBoard, row, col)) {
          return col
        }
      }
    }

    // Priority 3: Prefer center columns
    const centerColumns = [3, 2, 4, 1, 5, 0, 6]
    for (const col of centerColumns) {
      if (this.getLowestEmptyRow(board, col) !== -1) {
        return col
      }
    }

    return 3 // Default to center
  }
}
