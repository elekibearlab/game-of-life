import { useEffect, useState } from 'react';
import { t } from '@/shared/i18n';
import { useKeyboardShortcuts } from '@/shared/useKeyboardShortcuts';
import { LanguageSwitch } from '@/ui';
import { Life2D } from '@/view2d/Life2D';
import { Life3D } from '@/view3d/Life3D';
import styles from './App.module.css';

/** Screens in the menu. Saved in the URL # so a reload opens the same screen */
const MODES = [
  {
    id: '2d',
    name: '2D',
    description: { ja: '平面のライフゲーム', en: 'Game of Life on a plane' },
  },
  {
    id: '3d',
    name: '3D',
    description: { ja: '立方体に拡張したライフゲーム', en: 'Game of Life extended to a cube' },
  },
] as const;

type Mode = (typeof MODES)[number]['id'];

/** Gets the screen from the URL #. Uses 2D if the value is unknown */
function modeFromHash(): Mode {
  return location.hash === '#3d' ? '3d' : '2d';
}

export function App() {
  const [mode, setMode] = useState(modeFromHash);

  // Watch # changes, so the browser's back and forward buttons also switch screens
  useEffect(() => {
    const onHashChange = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const choose = (next: Mode) => {
    location.hash = next;
  };

  useKeyboardShortcuts({
    KeyM: () => choose(mode === '2d' ? '3d' : '2d'),
  });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Game of Life</h1>
        <nav className={styles.menu} title={t({ ja: 'M で切り替え', en: 'Press M to switch' })}>
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? `${styles.tab} ${styles.current}` : styles.tab}
              onClick={() => choose(item.id)}
            >
              <span className={styles.tabName}>{item.name}</span>
              <span className={styles.tabDescription}>{t(item.description)}</span>
            </button>
          ))}
        </nav>
        <LanguageSwitch className={styles.langs} />
      </header>
      <main className={styles.main}>{mode === '2d' ? <Life2D /> : <Life3D />}</main>
    </div>
  );
}
