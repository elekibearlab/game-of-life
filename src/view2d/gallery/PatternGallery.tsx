import { useRef } from 'react';
import { PATTERN_CATEGORIES, PATTERNS, type Pattern } from '@/data/patterns';
import { Button } from '@/ui';
import { t } from '@/shared/i18n';
import { usePatternPreview } from './usePatternPreview';
import styles from './styles.module.css';

type Props = {
  /** id of the pattern on the board now. It is marked in the list */
  currentId: string;
  onPick: (pattern: Pattern) => void;
  onClose: () => void;
};

/**
 * A list of all patterns by group. Each one runs on its own small board.
 * It opens on top of the canvas. Click a card to put that pattern on the main board and close the list.
 *
 * @param props.currentId The pattern on the board now
 * @param props.onPick    Called when a pattern is picked
 * @param props.onClose   Called to close the list
 */
export function PatternGallery({ currentId, onPick, onClose }: Props) {
  return (
    <div className={styles.gallery}>
      <div className={styles.galleryHeader}>
        <h2>
          {t({ ja: `図形の一覧（${PATTERNS.length}種）`, en: `All patterns (${PATTERNS.length})` })}
        </h2>
        <p>
          {t({
            ja: '押すと盤面の中央に置きます',
            en: 'Click one to place it in the centre of the board',
          })}
        </p>
        <Button onClick={onClose} title="L / Esc">
          {t({ ja: '× 閉じる', en: '× Close' })}
        </Button>
      </div>
      {PATTERN_CATEGORIES.map((category) => (
        <section key={category.id}>
          <h3 className={styles.galleryCategory}>{t(category.name)}</h3>
          <div className={styles.galleryGrid}>
            {PATTERNS.filter((pattern) => pattern.category === category.id).map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                current={pattern.id === currentId}
                onPick={onPick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * One card in the list. It shows a small board that loops the pattern, with its name, period and description.
 *
 * @param props.pattern Pattern to show
 * @param props.current Whether this pattern is on the board now
 * @param props.onPick  Called when clicked
 */
function PatternCard({
  pattern,
  current,
  onPick,
}: {
  pattern: Pattern;
  current: boolean;
  onPick: (pattern: Pattern) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  usePatternPreview(canvasRef, pattern);
  const cells = pattern.rows.join('').split('O').length - 1;

  return (
    <button
      type="button"
      className={current ? `${styles.card} ${styles.currentCard}` : styles.card}
      onClick={() => onPick(pattern)}
    >
      <canvas ref={canvasRef} className={styles.preview} width={320} height={180} />
      <span className={styles.cardName}>{t(pattern.name)}</span>
      <span className={styles.cardMeta}>
        {t({ ja: `${cells} セル`, en: `${cells} cells` })}
        {pattern.period && pattern.period > 1
          ? ` · ${t({ ja: '周期', en: 'period' })} ${pattern.period}`
          : ''}
      </span>
      <span className={styles.cardDescription}>{t(pattern.description)}</span>
    </button>
  );
}
