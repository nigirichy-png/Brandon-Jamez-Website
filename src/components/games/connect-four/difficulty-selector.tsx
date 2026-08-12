import type { Difficulty } from "./game";
import styles from "./connect-four.module.css";

const options: Array<{ value: Difficulty; label: string; detail: string }> = [
  { value: "rookie", label: "ROOKIE", detail: "Relaxed" },
  { value: "rival", label: "RIVAL", detail: "Tactical" },
  { value: "champion", label: "CHAMPION", detail: "Plans ahead" },
];

type DifficultySelectorProps = {
  value: Difficulty;
  disabled: boolean;
  onChange: (difficulty: Difficulty) => void;
};

export function DifficultySelector({ value, disabled, onChange }: DifficultySelectorProps) {
  return (
    <div className={styles.difficultyBar}>
      <span>CPU LEVEL</span>
      <div className={styles.difficultyOptions} role="radiogroup" aria-label="Brandon difficulty">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            className={value === option.value ? styles.selectedDifficulty : ""}
            onClick={() => onChange(option.value)}
          >
            <b>{option.label}</b>
            <small>{option.detail}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
