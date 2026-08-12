import styles from "./connect-four.module.css";

type BattleDialogProps = {
  speaker: "ANNOUNCER" | "BRANDON";
  message: string;
};

export function BattleDialog({ speaker, message }: BattleDialogProps) {
  return (
    <div className={styles.dialog} role="status" aria-live="polite" aria-atomic="true">
      <span>{speaker}</span>
      <p>{message}</p>
      <i aria-hidden="true">▾</i>
    </div>
  );
}
