import type { CSSProperties } from "react";

import type { Player } from "./game";
import styles from "./connect-four.module.css";

type GamePieceProps = {
  player: Player;
  isNew: boolean;
  isWinner: boolean;
  dropRows: number;
};

export function GamePiece({ player, isNew, isWinner, dropRows }: GamePieceProps) {
  const style = { "--drop-rows": dropRows } as CSSProperties;
  const className = [
    styles.piece,
    styles[player],
    isNew ? styles.dropping : "",
    isWinner ? styles.winningPiece : "",
  ].filter(Boolean).join(" ");

  return <span className={className} style={style} aria-hidden="true"><i /></span>;
}
