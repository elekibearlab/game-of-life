# コードガイド

このサンプルに手を入れるときの決まり。いちばん大事なのは **「ライフゲームのロジックが真っ先に読める」こと**。
機能を足すより、読んで分かることを優先する。

## 構成

React は画面の組み立てと操作パネルだけを担当し、3D 描画は Three.js の API を直接書く（React Three Fiber は使わない）。

```
src/
  core/                ライフゲームのロジック。React も three も import しない。まずここを読む
    life2d.ts           2D の盤面・周りを数える・1世代進める
    life3d.ts           3D 版。life2d.ts と同じ順に並べる
    rule.ts             誕生・生存の条件（2D と 3D で共通）と 'B3/S23' の読み書き
  data/                名前の付いたデータ。ロジックと分けて、core を短く保つ
    patterns.ts         2D の図形 35 種と、盤面に置く処理
    presets.ts          3D のルールと初期配置 11 種
  view2d/              2D の画面
    Life2D.tsx          入口。UI に出す state を持ち、部品を組み立てる
    seed.ts  types.ts   初期配置と、画面の中で共有する型
    components/         React の部品（PascalCase.tsx だけ）
    scene/              Three.js の描画。useLifeScene と、React を知らない描画処理（camelCase.ts だけ）
    gallery/            図形の一覧（2D だけ。3D には対応するものがない）
  view3d/              3D の画面（gallery/ 以外は view2d と同じ並び）
  ui/                  2D と 3D の両方で使う React の部品（PascalCase.tsx と index.ts だけ）
  shared/              2D と 3D の両方で使う、部品ではない処理（言語・キーボード）
  App.tsx              タイトルと 2D / 3D のメニュー。選んだ画面を出すだけ
  main.tsx
  styles.css           色・余白・文字サイズのトークンとリセット（唯一のグローバル CSS）
tests/                 Vitest。core と data を直接テストする
```

## 依存方向

```
core  →  data  →  view2d / view3d  →  App
          ↑             ↑
        shared  ───→   ui
```

- この向きだけを許可する。**view2d と view3d は直接 import し合わない**（お互いを知らない）。
- `data/` は画面の文字の型（`LocalizedText`）だけを `shared/i18n.ts` から import する（型だけなので、実行時の依存にはならない）。
- 2D と 3D の両方で使うものは、React の部品なら `ui/`、それ以外は `shared/` に置く。片方でしか使わないものは、その view の中に置く。
- `core/life2d.ts` と `core/life3d.ts` は **同じ順**（盤面の形 → 作る → 座標と添字 → 周りを数える → 1世代進める → 数える）に並べる。横に並べたときに差分が読めるようにするため。
- `view2d/` と `view3d/` も同じフォルダ・同じファイル名・同じ役割で並べる。
- view の中は `Life2D` → `components/` → `scene/` の向き。`scene/` は React の部品を import しない（描画は React の外で回すため）。
- フォルダは役割で分け、1 つのフォルダの中でファイル名の書き方（PascalCase / camelCase）がそろうようにする。

## 動画に映っているコード

`core/life2d.ts` の `countNeighbors`・`step`、`core/life3d.ts` の `countNeighbors`、`core/rule.ts` の `CONWAY` は、
動画（2D 編・3D 編）に映っている。**処理を変えない**（変えると、動画の説明とリポジトリの動きがずれる）。
書式は他のコードと同じ決まりにそろえる。見た目の合わせ込みは動画の側で行い、リポジトリは読みやすさを優先する
（動画の時点のコードはタグ `v1`・`v2`… に残っている）。
速くしたいときは、3D の `countAllNeighbors` のように別の関数を足し、テストで結果が一致することを確かめる。

## 状態

- 再生中・速度・エフェクトなど UI に出す値は、各画面のコンポーネント（`Life2D` / `Life3D`）の React state に置く。規模が小さいので状態管理ライブラリは使わない。
- 盤面は毎世代変わるので React state に入れず、`useLifeScene` の ref に持つ。描画ループ（requestAnimationFrame）も React の外で回す。
- 画面からシーンへの命令（1世代進める・盤面を差し替える）は、`LifeCanvas` の ref に渡した `LifeSceneHandle` で行う。
- マス数のようにシーンの作り直しが要る変更は、`LifeCanvas` の `key` を変えて作り直す。

## エフェクト

- 見た目を飾る効果（色の変化・残光・拡大縮小・霧・Bloom）はすべてオプションにし、初期値はオフにする。
- エフェクトは view の描画処理（`cellMesh.ts`・`createStage.ts`）の中だけで完結させ、`core/` には持ち込まない。

## 命名

| 対象 | 規則 | 例 |
|---|---|---|
| ディレクトリ | 小文字 | `view2d/` |
| React コンポーネント | `PascalCase.tsx` | `LifeCanvas.tsx` |
| フック | `useSomething.ts` | `useLifeScene.ts` |
| ロジック | `camelCase.ts` | `cellMesh.ts` |
| CSS Module | 部品を置くフォルダごとに `styles.module.css` を1枚。`src/` 直下だけは `App.module.css`（グローバルの `styles.css` と分けるため） | `ui/styles.module.css` |

- コンポーネントは **named export** にする。`export default` は使わない。

## コメントと JSDoc

- コメントは日本語で、**なぜその形にしたか**を書く。コードから読める処理内容は繰り返さない。
- export する関数・コンポーネントには JSDoc を付け、`@param` に意味・単位・座標系を書く。
- 調整用の数値（色・大きさ・速度）は名前付き定数にして、ファイル先頭に理由と一緒に置く。

## 画面の文字（日本語 / 英語）

- URL の `?lang=en` で英語にする。言語は `shared/i18n.ts` の `LANG` が読み込み時に一度だけ決める。
- 右上の言語の切り替えは、`?lang=` を変えたページを開き直すリンクにしている。表示中に切り替えると、言語を state に持って全部の部品に渡す仕組みが要り、ライフゲームと関係ないコードが増えるため。
- 言語の判定と URL は `shared/i18n.ts`、切り替えの部品は `ui/LanguageSwitch.tsx` に置き、どちらもこのアプリのことを知らない。ほかのサンプルにはこの 2 つ（と `ui/styles.module.css` の言語の切り替えのスタイル）をそのまま写して使う。
- アプリが iframe の中で開かれたとき（Lab など）は、切り替えを出さない（`EMBEDDED`）。外のサイトが `?lang=` で言語を渡し、自分の切り替えを持っているので、二つ並ぶと中だけが切り替わってしまうため。
- 切り替えても `?lang=` 以外のパラメータと `#` は残す。言語だけが変わり、見ていた画面はそのまま。
- 画面に出す文字は、使う場所で `t({ ja: '…', en: '…' })` と書く。処理のコードに言語の分岐（`if (LANG === 'en')`）を書かない。
- 図形・プリセットの名前と説明は `data/` の中に `LocalizedText`（`{ ja, en }`）で持つ。
- エラーメッセージと、ルールの表記（`B3/S23`）・プリセットの英語名（`Clouds` など）は訳さない。
- 英語は日本語より長くなりやすい。パネルの見出しやセレクトに収まるか、`?lang=en` で画面を見て確かめる。

## スタイル

- CSS Modules を使い、クラス名は camelCase。
- 色・余白・文字サイズは `src/styles.css` のトークン（`var(--space-2)` など）を使い、値を直接書かない。
- Three.js 側の背景色は `--color-bg` と同じ値にしている。変えるときは両方を揃える。

## 書式・テスト

- 書式は Prettier に任せる（シングルクォート、セミコロンあり、2スペース、100桁）。`npm run format`
- `if`・`else`・`for`・`while` の本体は、1 文だけでも必ず `{ }` で囲み、改行して書く。
  `if (!canvas) return` のような 1 行の書き方はしない（どこまでが条件の中か、一目で分かるようにするため）。
  Prettier はこれを直さないので、書くときに守る。短いアロー関数（`(x) => x * 2`）はこの対象にしない。
- Markdown は表と図の見た目を保つため整形対象外。
- 純粋なロジックは `core/` に置き、`tests/` から直接テストする。乱数は引数で差し替えられるようにする。
- 2D の図形を足すときは `period`（周期）を書く。`tests/patterns.test.ts` が実際に動かして形を確かめる。
- 3D の近傍は `countAllNeighbors` でまとめて数える（大きな盤面のため）。素直な `countNeighbors` は説明とテストの基準として残し、両者が一致することをテストで確かめる。

## 描画まわりの決まり

- 図形の一覧のように同時に何十枚も描くものは、WebGL ではなく Canvas 2D で描く（WebGL の描画先は同時に十数個まで）。
- 3D のセルは、盤面かエフェクトが変わったときだけ描き直す。毎フレーム全セルを見直さない。

## 確認

```bash
npm run typecheck
npm test
npm run format:check
npm run build
```
