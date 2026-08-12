export const ROWS = 6;
export const COLUMNS = 7;

export type Player = "player" | "brandon";
export type Difficulty = "rookie" | "rival" | "champion";
export type Cell = Player | null;
export type BoardState = Cell[][];
export type Coordinate = { row: number; column: number };

export function createBoard(): BoardState {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(null));
}

export function getAvailableColumns(board: BoardState): number[] {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter(
    (column) => board[0][column] === null,
  );
}

export function dropPiece(
  board: BoardState,
  column: number,
  player: Player,
): { board: BoardState; row: number } | null {
  if (column < 0 || column >= COLUMNS || board[0][column] !== null) return null;

  const row = board.findLastIndex((line) => line[column] === null);
  if (row < 0) return null;

  const nextBoard = board.map((line) => [...line]);
  nextBoard[row][column] = player;
  return { board: nextBoard, row };
}

export function getWinningCells(board: BoardState, player: Player): Coordinate[] {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (board[row][column] !== player) continue;

      for (const [rowStep, columnStep] of directions) {
        const cells = Array.from({ length: 4 }, (_, index) => ({
          row: row + rowStep * index,
          column: column + columnStep * index,
        }));

        if (
          cells.every(
            (cell) =>
              cell.row >= 0 &&
              cell.row < ROWS &&
              cell.column >= 0 &&
              cell.column < COLUMNS &&
              board[cell.row][cell.column] === player,
          )
        ) {
          return cells;
        }
      }
    }
  }

  return [];
}

function immediateWinningColumn(board: BoardState, player: Player): number | null {
  for (const column of getAvailableColumns(board)) {
    const move = dropPiece(board, column, player);
    if (move && getWinningCells(move.board, player).length > 0) return column;
  }
  return null;
}

function scorePosition(board: BoardState, column: number): number {
  const move = dropPiece(board, column, "brandon");
  if (!move) return Number.NEGATIVE_INFINITY;

  let score = 12 - Math.abs(3 - column) * 3;
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  for (const [rowStep, columnStep] of directions) {
    for (let offset = -3; offset <= 0; offset += 1) {
      const window = Array.from({ length: 4 }, (_, index) => ({
        row: move.row + (offset + index) * rowStep,
        column: column + (offset + index) * columnStep,
      }));
      if (
        !window.every(
          (cell) =>
            cell.row >= 0 && cell.row < ROWS && cell.column >= 0 && cell.column < COLUMNS,
        )
      ) continue;

      const values = window.map((cell) => move.board[cell.row][cell.column]);
      if (values.includes("player")) continue;
      const brandonPieces = values.filter((value) => value === "brandon").length;
      score += brandonPieces * brandonPieces;
    }
  }

  if (immediateWinningColumn(move.board, "player") !== null) score -= 50;
  return score;
}

const CENTER_FIRST = [3, 2, 4, 1, 5, 0, 6];

function chooseRookieColumn(board: BoardState, random: () => number): number | null {
  const available = getAvailableColumns(board);
  if (available.length === 0) return null;

  const winningMove = immediateWinningColumn(board, "brandon");
  if (winningMove !== null && random() < 0.55) return winningMove;

  const blockingMove = immediateWinningColumn(board, "player");
  if (blockingMove !== null && random() < 0.35) return blockingMove;

  const weighted = CENTER_FIRST.filter((column) => available.includes(column));
  const index = Math.min(weighted.length - 1, Math.floor(random() * weighted.length));
  return weighted[index];
}

function chooseRivalColumn(board: BoardState): number | null {
  const winningMove = immediateWinningColumn(board, "brandon");
  if (winningMove !== null) return winningMove;

  const blockingMove = immediateWinningColumn(board, "player");
  if (blockingMove !== null) return blockingMove;

  const available = new Set(getAvailableColumns(board));
  let bestColumn: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const column of CENTER_FIRST) {
    if (!available.has(column)) continue;
    const score = scorePosition(board, column);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return bestColumn;
}

function scoreWindow(values: Cell[]): number {
  const brandonCount = values.filter((value) => value === "brandon").length;
  const playerCount = values.filter((value) => value === "player").length;
  const emptyCount = values.filter((value) => value === null).length;

  if (brandonCount === 4) return 100_000;
  if (playerCount === 4) return -100_000;
  if (brandonCount === 3 && emptyCount === 1) return 120;
  if (brandonCount === 2 && emptyCount === 2) return 18;
  if (playerCount === 3 && emptyCount === 1) return -145;
  if (playerCount === 2 && emptyCount === 2) return -16;
  return 0;
}

function evaluateBoard(board: BoardState): number {
  let score = 0;
  for (let row = 0; row < ROWS; row += 1) {
    if (board[row][3] === "brandon") score += 8;
    if (board[row][3] === "player") score -= 8;
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column <= COLUMNS - 4; column += 1) {
      score += scoreWindow(board[row].slice(column, column + 4));
    }
  }
  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row <= ROWS - 4; row += 1) {
      score += scoreWindow(Array.from({ length: 4 }, (_, index) => board[row + index][column]));
    }
  }
  for (let row = 0; row <= ROWS - 4; row += 1) {
    for (let column = 0; column <= COLUMNS - 4; column += 1) {
      score += scoreWindow(Array.from({ length: 4 }, (_, index) => board[row + index][column + index]));
    }
    for (let column = 3; column < COLUMNS; column += 1) {
      score += scoreWindow(Array.from({ length: 4 }, (_, index) => board[row + index][column - index]));
    }
  }
  return score;
}

function minimax(
  board: BoardState,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
): number {
  if (getWinningCells(board, "brandon").length > 0) return 1_000_000 + depth;
  if (getWinningCells(board, "player").length > 0) return -1_000_000 - depth;

  const available = CENTER_FIRST.filter((column) => board[0][column] === null);
  if (depth === 0 || available.length === 0) return evaluateBoard(board);

  if (maximizing) {
    let value = Number.NEGATIVE_INFINITY;
    for (const column of available) {
      const move = dropPiece(board, column, "brandon");
      if (!move) continue;
      value = Math.max(value, minimax(move.board, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Number.POSITIVE_INFINITY;
  for (const column of available) {
    const move = dropPiece(board, column, "player");
    if (!move) continue;
    value = Math.min(value, minimax(move.board, depth - 1, true, alpha, beta));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function chooseChampionColumn(board: BoardState): number | null {
  const winningMove = immediateWinningColumn(board, "brandon");
  if (winningMove !== null) return winningMove;
  const blockingMove = immediateWinningColumn(board, "player");
  if (blockingMove !== null) return blockingMove;

  const available = CENTER_FIRST.filter((column) => board[0][column] === null);
  let bestColumn: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const column of available) {
    const move = dropPiece(board, column, "brandon");
    if (!move) continue;
    const score = minimax(move.board, 5, false, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }
  return bestColumn;
}

export function chooseBrandonColumn(
  board: BoardState,
  difficulty: Difficulty = "rival",
  random: () => number = Math.random,
): number | null {
  if (difficulty === "rookie") return chooseRookieColumn(board, random);
  if (difficulty === "champion") return chooseChampionColumn(board);
  return chooseRivalColumn(board);
}
