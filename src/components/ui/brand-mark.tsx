import styles from "./brand-mark.module.css";

export function BrandMark() {
  return <span className={styles.brand} aria-label="Brandon Jamez">
    <span className={styles.monogram} aria-hidden="true">
      <svg viewBox="0 0 58 40" focusable="false">
        <path className={styles.letterB} fillRule="evenodd" d="M2 3h17.5C27 3 31 6.2 31 11.2c0 3.4-1.8 5.8-5.4 7.1 4.5 1.1 6.8 4 6.8 8.3C32.4 33 27.7 37 19 37H2V3Zm9 7.2v5.4h7.2c2.8 0 4.2-.9 4.2-2.8 0-1.8-1.4-2.6-4.2-2.6H11Zm0 12.5v6.8h8c3.1 0 4.7-1.1 4.7-3.4 0-2.2-1.6-3.4-4.7-3.4h-8Z" />
        <path className={styles.letterJ} d="M35 3h21v22.1C56 33.3 51.5 38 43.4 38c-5.5 0-9.6-2.1-12.2-6.2l6.7-5.1c1.4 2.3 3 3.4 5 3.4 2.7 0 4.1-1.7 4.1-5V11h-12V3Z" />
      </svg>
    </span>
    <span className={styles.wordmark}><span>Brandon</span><strong>Jamez</strong></span>
  </span>;
}
