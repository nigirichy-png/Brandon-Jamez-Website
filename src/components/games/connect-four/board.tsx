import { COLUMNS, ROWS, type BoardState, type Coordinate } from "./game";
import { GamePiece } from "./game-piece";
import styles from "./connect-four.module.css";

type BoardProps = {
  board: BoardState;
  disabled: boolean;
  hoveredColumn: number | null;
  lastMove: (Coordinate & { sequence: number }) | null;
  winningCells: Coordinate[];
  onColumnHover: (column: number | null) => void;
  onDrop: (column: number) => void;
};

export function Board({
  board,
  disabled,
  hoveredColumn,
  lastMove,
  winningCells,
  onColumnHover,
  onDrop,
}: BoardProps) {
  const winningKeys = new Set(winningCells.map((cell) => `${cell.row}-${cell.column}`));

  return (
    <div className={styles.boardStation}>
      <div className={styles.turnIndicator} aria-hidden="true">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <span key={column} className={hoveredColumn === column && !disabled ? styles.activeArrow : ""}>▼</span>
        ))}
      </div>
      <div className={styles.boardWrap}>
        <div className={styles.boardFrame} role="grid" aria-label="Connect Four board">
          {Array.from({ length: COLUMNS }, (_, column) => (
            <button
              key={column}
              type="button"
              className={styles.columnTarget}
              style={{ gridColumn: column + 1 }}
              disabled={disabled || board[0][column] !== null}
              aria-label={`Drop chip in column ${column + 1}`}
              onClick={() => onDrop(column)}
              onFocus={() => onColumnHover(column)}
              onBlur={() => onColumnHover(null)}
              onMouseEnter={() => onColumnHover(column)}
              onMouseLeave={() => onColumnHover(null)}
            />
          ))}
          <div className={styles.cells} aria-hidden="true">
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLUMNS }, (_, column) => {
                const cell = board[row][column];
                const isNew = lastMove?.row === row && lastMove.column === column;
                return (
                  <span className={styles.cell} key={`${row}-${column}`}>
                    {cell ? (
                      <GamePiece
                        key={`${cell}-${lastMove?.sequence ?? 0}`}
                        player={cell}
                        isNew={isNew}
                        isWinner={winningKeys.has(`${row}-${column}`)}
                        dropRows={row + 1}
                      />
                    ) : null}
                  </span>
                );
              }),
            )}
          </div>
        </div>
        <div className={styles.boardFeet} aria-hidden="true"><span /><span /></div>
      </div>
      <p className={styles.boardHint}>{disabled ? "Opponent is calculating..." : "Choose a column"}</p>
    </div>
  );
}
