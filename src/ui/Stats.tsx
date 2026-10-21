import { t } from '@/shared/i18n';
import styles from './styles.module.css';

type Props = {
  generation: number;
  population: number;
};

/**
 * Shows the generation and the number of live cells.
 *
 * @param props.generation Current generation
 * @param props.population Number of live cells
 */
export function Stats({ generation, population }: Props) {
  return (
    <dl className={styles.stats}>
      <dt>{t({ ja: '世代', en: 'Generation' })}</dt>
      <dd>{generation}</dd>
      <dt>{t({ ja: '生存', en: 'Alive' })}</dt>
      <dd>{population}</dd>
    </dl>
  );
}
