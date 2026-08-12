"use client";

import { useEffect, useState } from "react";

import { BattleDialog } from "./battle-dialog";
import { Board } from "./board";
import { BrandonAvatar } from "./brandon-avatar";
import { DifficultySelector } from "./difficulty-selector";
import {
  chooseBrandonColumn,
  createBoard,
  dropPiece,
  getAvailableColumns,
  getWinningCells,
  type BoardState,
  type Coordinate,
  type Difficulty,
  type Player,
} from "./game";
import { StatusPanel } from "./status-panel";
import styles from "./connect-four.module.css";

type Phase = "player" | "brandon" | "finished";
type Result = Player | "draw" | null;
type LastMove = Coordinate & { sequence: number };

export function ConnectFourGame() {
  const [board, setBoard] = useState<BoardState>(createBoard);
  const [phase, setPhase] = useState<Phase>("player");
  const [result, setResult] = useState<Result>(null);
  const [winningCells, setWinningCells] = useState<Coordinate[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [moveSequence, setMoveSequence] = useState(0);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("rival");
  const [dialog, setDialog] = useState<{ speaker: "ANNOUNCER" | "BRANDON"; message: string }>({
    speaker: "ANNOUNCER",
    message: "Your move!",
  });

  useEffect(() => {
    if (phase !== "brandon") return;

    const timer = window.setTimeout(() => {
      const column = chooseBrandonColumn(board, difficulty);
      if (column === null) {
        setPhase("finished");
        setResult("draw");
        setDialog({ speaker: "BRANDON", message: "Run it back." });
        return;
      }

      const move = dropPiece(board, column, "brandon");
      if (!move) return;

      const nextSequence = moveSequence + 1;
      const win = getWinningCells(move.board, "brandon");
      setBoard(move.board);
      setLastMove({ row: move.row, column, sequence: nextSequence });
      setMoveSequence(nextSequence);

      if (win.length > 0) {
        setWinningCells(win);
        setResult("brandon");
        setPhase("finished");
        setDialog({ speaker: "BRANDON", message: "Too easy." });
      } else if (getAvailableColumns(move.board).length === 0) {
        setResult("draw");
        setPhase("finished");
        setDialog({ speaker: "BRANDON", message: "Run it back." });
      } else {
        setPhase("player");
        setDialog({ speaker: "ANNOUNCER", message: "Your move!" });
      }
    }, 720);

    return () => window.clearTimeout(timer);
  }, [board, difficulty, moveSequence, phase]);

  function handlePlayerMove(column: number) {
    if (phase !== "player") return;
    const move = dropPiece(board, column, "player");
    if (!move) return;

    const nextSequence = moveSequence + 1;
    const win = getWinningCells(move.board, "player");
    setBoard(move.board);
    setLastMove({ row: move.row, column, sequence: nextSequence });
    setMoveSequence(nextSequence);
    setHoveredColumn(null);

    if (win.length > 0) {
      setWinningCells(win);
      setResult("player");
      setPhase("finished");
      setDialog({ speaker: "ANNOUNCER", message: "Connect Four Champion." });
    } else if (getAvailableColumns(move.board).length === 0) {
      setResult("draw");
      setPhase("finished");
      setDialog({ speaker: "BRANDON", message: "Run it back." });
    } else {
      setPhase("brandon");
      setDialog({
        speaker: "BRANDON",
        message: nextSequence % 4 === 1 ? "Nice move." : "You sure about that, bro?",
      });
    }
  }

  function resetGame() {
    setBoard(createBoard());
    setPhase("player");
    setResult(null);
    setWinningCells([]);
    setLastMove(null);
    setMoveSequence(0);
    setHoveredColumn(null);
    setDialog({ speaker: "ANNOUNCER", message: "Your move!" });
  }

  function changeDifficulty(nextDifficulty: Difficulty) {
    if (nextDifficulty === difficulty || phase === "brandon") return;
    setDifficulty(nextDifficulty);
    resetGame();
  }

  const resultLabel = result === "player" ? "YOU WIN" : result === "brandon" ? "BRANDON WINS" : result === "draw" ? "DRAW GAME" : null;
  const brandonAvatarState = result === "brandon" ? "winning" : result === "player" ? "losing" : phase === "brandon" ? "thinking" : "neutral";

  return (
    <main id="main-content" className={styles.gamePage}>
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.ambientOrbOne} aria-hidden="true" />
      <div className={styles.ambientOrbTwo} aria-hidden="true" />

      <div className={styles.gameShell}>
        <header className={styles.gameHeader}>
          <div className={styles.headerRule}><span>ARCADE // MATCH 01</span><i /><b>LOCAL BATTLE</b></div>
          <p className={styles.kicker}>Brandon Jamez presents</p>
          <h1>CONNECT FOUR <em>VS</em> BRANDON</h1>
          <p className={styles.subtitle}>Four in a row takes the crown. No excuses.</p>
        </header>

        <DifficultySelector
          value={difficulty}
          disabled={phase === "brandon"}
          onChange={changeDifficulty}
        />

        <section className={styles.battleGrid} aria-label="Connect Four match">
          <StatusPanel
            name="PLAYER 1"
            label="CHALLENGER"
            side="playerSide"
            active={phase === "player"}
            winner={result === "player"}
            avatar={<div className={styles.playerAvatar} aria-hidden="true"><span>YOU</span></div>}
          />

          <Board
            board={board}
            disabled={phase !== "player"}
            hoveredColumn={hoveredColumn}
            lastMove={lastMove}
            winningCells={winningCells}
            onColumnHover={setHoveredColumn}
            onDrop={handlePlayerMove}
          />

          <StatusPanel
            name="BRANDON"
            label="HOUSE CHAMP"
            side="brandonSide"
            active={phase === "brandon"}
            winner={result === "brandon"}
            avatar={<BrandonAvatar state={brandonAvatarState} />}
          />
        </section>

        <div className={styles.battleFooter}>
          <BattleDialog speaker={dialog.speaker} message={dialog.message} />
          <div className={styles.matchActions}>
            {resultLabel ? <strong>{resultLabel}</strong> : <span>{phase === "brandon" ? "BRANDON IS THINKING" : "FIRST TO CONNECT FOUR"}</span>}
            <button type="button" onClick={resetGame}>{result ? "RUN IT BACK" : "RESET MATCH"}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
