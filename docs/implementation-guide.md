[English](implementation-guide.en.md) | 日本語

# Three.js で作るライフゲーム — 実装解説

2D のライフゲームを Three.js で作り、それを三次元に拡張すると何が起きるのかを見ていきます。
1 つのアプリの中で、画面上部のメニューから 2D と 3D を切り替えられます。

- **2D** … コンウェイのライフゲーム。35 種類の有名な図形を、動く一覧から選んで置ける
- **3D** … 近傍を 26 マスに広げた 3D 版。11 種類のルールを最大 96³ の盤面で動かせる

![2D 版（エフェクトなし）](images/2d-plain.png)

---

## 1. ライフゲームのルール

マス目の各セルは「生」か「死」のどちらか。周りの 8 マスに生きているセルがいくつあるかで、次の世代が決まります。

| 今の状態 | 周りの生存数 | 次の世代 |
|---|---|---|
| 死 | ちょうど 3 | **誕生** |
| 生 | 2 か 3 | **生存** |
| 生 | 1 以下 / 4 以上 | 死（過疎 / 過密） |

この条件は **B3/S23**（Birth 3 / Survive 2,3）と書きます。
3D 版では、この「数」の部分を差し替えるだけでルールを変えられるようにしています。

盤面の端は反対側とつながっています（トーラス）。端に来たグライダーは反対側から出てきます。

---

## 2. 全体の構成

React は画面の組み立てと操作パネルを担当し、描画は Three.js の API を直接書いています（React Three Fiber は使いません）。

```
src/
  core/                 ライフゲームのロジック（React も three も使わない）。まずここを読む
    life2d.ts            盤面・周りを数える・1世代進める
    life3d.ts            3D 版（life2d.ts と同じ順に並べている）
    rule.ts              誕生・生存の条件（2D と 3D で共通）
  data/
    patterns.ts          2D の図形カタログ（35 種）
    presets.ts           3D のルールと初期配置（11 種）
  view2d/               2D の画面
    Life2D.tsx           状態を持ち、キャンバスとパネルを組み立てる
    seed.ts              初期配置から盤面を作る
    components/          React の部品
      LifeCanvas.tsx
      ControlPanel.tsx
    scene/               Three.js の描画（React の外で回る）
      useLifeScene.ts     描画ループと盤面の管理
      createStage.ts      レンダラー・カメラ・Bloom
      cellMesh.ts         InstancedMesh でセルを描く
    gallery/             図形の一覧（2D だけ）
  view3d/               3D の画面（同じ並び）
  ui/                   ボタン・スライダー・画面の枠など、2D と 3D で共通の部品
  shared/               キーボード操作・言語（部品ではない共通処理）
  App.tsx               タイトルと 2D / 3D のメニュー。選んだ画面を出すだけ
public/favicon.svg      グライダーを描いたアイコン
```

依存は `core → data → view2d / view3d → App` の一方向だけ。`view2d` と `view3d` はお互いを知りません。
2D と 3D を **同じ並びのファイルに分けている** ので、横に並べて比べると「どこが変わったか」がそのまま見えます。

データの流れは次のとおりです。

```
 ControlPanel ──(ボタン)──▶ Life2D ──ref.step() / ref.load(grid)──▶ useLifeScene
                              ▲                                        │
                              └──────── onStats(世代, 生存数) ──────────┘
                                                                       │ 毎フレーム
                                                       core/step()   ◀─┤
                                                       cellMesh.tick() ◀┘ → 画面
```

**ポイント:** 盤面は React の state に入れていません。毎世代変わる値を state にすると、そのたびに React の再描画が走り、requestAnimationFrame の描画ループとも二重管理になるためです。盤面は `useRef` に持ち、React には「世代数と生存数」だけを返しています。

---

## 3. 2D 版の実装

### 3-1. 盤面は 1 次元配列

```ts
// core/life2d.ts
export type Grid = {
  width: number;
  height: number;
  cells: Uint8Array; // 0 = 死, 1 = 生。y * width + x の順に並ぶ
};

export function indexOf(grid: Grid, x: number, y: number): number {
  const wx = (x + grid.width) % grid.width; // はみ出したら反対側へ
  const wy = (y + grid.height) % grid.height;
  return wy * grid.width + wx;
}
```

2 次元配列より生成もコピーも速く、そのまま描画のループにも回せます。
`% width` で折り返すことで、端の特別扱いが要らなくなります。

### 3-2. 1 世代進める

```ts
// core/life2d.ts
// 周りの 8 マスのうち、生きているセルを数える
export function countNeighbors(grid: Grid, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue; // 自分自身は数えない
      }
      count += grid.cells[indexOf(grid, x + dx, y + dy)];
    }
  }
  return count;
}

// 1 世代進めた新しい盤面を返す
export function step(grid: Grid, rule: Rule = CONWAY): Grid {
  const next = createGrid(grid.width, grid.height); // 元の盤面は書き換えず、新しい盤面に書き出す
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x;
      const count = countNeighbors(grid, x, y);
      const alive = grid.cells[i] === ALIVE;
      // 生きていれば「生存」の数、死んでいれば「誕生」の数に入っているかで決める
      const lives = alive ? rule.survive.includes(count) : rule.birth.includes(count);
      next.cells[i] = lives ? ALIVE : DEAD;
    }
  }
  return next;
}
```

全セルを「同時に」更新するため、元の盤面は書き換えず、新しい盤面に書き出します。
ここは Three.js と無関係な純粋関数なので、`tests/life2d.test.ts` で「ブリンカーが 2 世代で戻る」「グライダーが 4 世代で斜めに 1 マス進む」などを直接テストしています。

### 3-3. 図形カタログ

`data/patterns.ts` に、名前の付いた有名な図形を 35 種類、分類ごとに並べています。図形は「見たままの形」で書けるよう、行ごとの文字列で持っています。

```ts
{
  id: 'glider',
  name: { ja: 'グライダー', en: 'Glider' },
  category: 'spaceship',
  description: {
    ja: '4世代で斜めに1マス進む、最小の宇宙船',
    en: 'The smallest spaceship. Moves one cell diagonally every 4 generations',
  },
  rows: ['.O.', '..O', 'OOO'],
  period: 4,
}
```

| 分類 | 何が起きるか | 収録している図形 |
|---|---|---|
| 固定物体 | 何世代たっても変わらない | ブロック、蜂の巣、パン、ボート、シップ、タブ、池、イーター |
| 振動子 | 決まった周期で元の形に戻る | ブリンカー(2)、ヒキガエル(2)、ビーコン(2)、時計(2)、パルサー(3)、八角形(5)、8の字(8)、コックの銀河(8)、タンブラー(14)、ペンタデカスロン(15)、女王蜂シャトル(30) |
| 宇宙船 | 形を保ったまま移動する | グライダー、軽量級・中量級・重量級宇宙船、コッパーヘッド |
| 銃 | 宇宙船を撃ち出し続ける | ゴスパーのグライダー銃、シムキンのグライダー銃 |
| メトセラ | 小さな種なのに長く動き続ける | Rペントミノ、ダイハード、どんぐり、Bヘプトミノ、πヘプトミノ、うさぎ |
| 無限成長 | 広い盤面なら際限なく増える | 10セル、5×5、1行の無限成長 |

（カッコ内は周期）

`period` を持つ図形は、`tests/patterns.test.ts` で **実際に動かして**「ちょうどその世代で同じ形に戻るか」を確かめています。宇宙船は位置がずれるので、生きているセルを囲む矩形の中身だけを比べています。手で書いた図形の 1 マスの写し間違いもテストで見つかります。

![パルサー](images/2d-pulsar.png)

#### 一覧モード

35 種類を 1 つずつ置いて確かめるのは大変なので、「一覧で見る」（L キー）で全図形を並べて見られるようにしています。カードの中で図形がそれぞれループ再生され、押すとその図形を盤面の中央に置いて一覧を閉じます。

![図形の一覧](images/2d-gallery.png)

一覧の小さな盤面は、Three.js ではなく **Canvas 2D** で描いています。ブラウザが同時に持てる WebGL の描画先は十数個までなので、35 枚のカードそれぞれに WebGLRenderer を作ると足りなくなるためです。盤面の計算は本体と同じ `core/life2d.ts` の `step()` をそのまま使っています。

```ts
// view2d/gallery/preview.ts（抜粋）
const MARGIN: Record<PatternCategory, number> = {
  still: 3, // 固定物体・振動子は狭くして大きく見せる
  oscillator: 5,
  spaceship: 12, // 宇宙船やメトセラは広くして動きを見せる
  gun: 12,
  methuselah: 24,
  growth: 24,
};
```

分類ごとに図形の周りの余白を変え、固定物体は大きく、宇宙船は進む様子が見える広さで表示しています。

### 3-4. Three.js の土台（createStage）

```ts
// view2d/scene/createStage.ts（抜粋）
const renderer = new WebGLRenderer({ canvas, antialias: true });
const scene = new Scene();
const camera = new OrthographicCamera(); // 2D なので遠近なし。1セル = 1単位

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.7, 0.35, 0.15);
composer.addPass(bloom);
composer.addPass(new OutputPass());
```

- **OrthographicCamera** … 2D の盤面を歪みなく映す。`resize` で、余白の内側に盤面全体が収まるようにカメラの範囲を決める。このとき 1 セルが画面の **整数ピクセル** になるように切り捨て、盤面の左上もピクセルの境目にそろえる（5.3 px のような半端な大きさだと、セルや隙間の幅が 1 px ずつばらつき、マス目がむらに見える）
- **UnrealBloomPass** … 明るい部分をにじませ、セルが光って見える。`bloom.enabled` でオン・オフできる
- **OutputPass** … 色空間の変換。ポストエフェクトを使うときは最後に置く

### 3-5. 全セルを 1 つの InstancedMesh で描く

128 × 72 = 9,216 セル。セルごとに Mesh を作ると 9,216 回の描画命令になりますが、InstancedMesh なら **1 回** で済みます。形（板ポリゴン）とマテリアルを共有し、インスタンスごとに「位置」と「色」だけを持たせます。

```ts
// view2d/scene/cellMesh.ts（抜粋）
// 左上を原点にした 1 × 1 の板。セルのマスの左上に置くので、隙間は右と下にできる
const geometry = new PlaneGeometry(1, 1).translate(0.5, -0.5, 0);
const mesh = new InstancedMesh(geometry, new MeshBasicMaterial(), count);

// 位置と大きさは、画面のサイズが変わったときだけ
dummy.scale.set(size, size, 1);
dummy.position.set(x - width / 2, height / 2 - y, 0);
dummy.updateMatrix();
mesh.setMatrixAt(i, dummy.matrix);

// 毎フレーム、色だけ塗り直す
mesh.setColorAt(i, color);
mesh.instanceColor!.needsUpdate = true;
```

セルを少し小さく描いて隙間を空け、死んだセルも背景よりわずかに明るい色で描くことで、格子線を別に描かずにマス目を見せています。隙間はセルの 14% を目安に **整数ピクセル** に丸めるので、どの画面サイズでも隙間の太さがそろいます。

### 3-6. エフェクトは「オプション」にする

エフェクトなしの状態では、セルの色は **生 = シアン / 死 = 暗い紺** の 2 色だけです。ルールの動きを追うときはこれがいちばん読みやすいので、最初はすべてオフにしています。パネルのチェックボックスで、見た目だけを飾る効果を足せます。

| エフェクト | 内容 |
|---|---|
| 年齢で色を変える | 生き続けるほどシアン `#3ef2ff` → 紫 `#7b5cff` に変わる（16 世代で移りきる） |
| 死んだセルの残光 | 死んだ直後のセルをピンク `#ff3d9a` に光らせ、0.8 秒で消す |
| 発光（Bloom） | 明るいセルをにじませる |

```ts
// view2d/scene/cellMesh.ts の tick（抜粋）
if (age[i] > 0 && effects.age) {
  color.lerpColors(YOUNG, OLD, (age[i] - 1) / MATURE_AGE);
} else if (age[i] > 0) {
  color.copy(YOUNG);
} else if (effects.trail && fade[i] > 0) {
  color.lerpColors(EMPTY, TRAIL, fade[i] * fade[i]); // 二乗で尾を引くように
} else {
  color.copy(EMPTY);
}
```

どのエフェクトも **描画の中だけ** で完結していて、`core/` のロジックには一切触れていません。エフェクトを全部入れると、動き続ける部分はシアンに光り、止まった形は紫に落ち着き、動いた跡はピンクの軌跡になります。

![グライダー銃（エフェクトあり）](images/2d-effects.png)

### 3-7. React とつなぐ（useLifeScene）

```ts
// view2d/scene/useLifeScene.ts（要点）
const gridRef = useRef(initialGrid);
const optionsRef = useRef(options);
optionsRef.current = options; // 描画ループからは常に最新の props を読む

useEffect(() => {
  const stage = createStage(canvas, width, height);
  const cells = createCellMesh(width, height);
  stage.scene.add(cells.mesh);

  const loop = (now: number) => {
    const { running, interval, effects } = optionsRef.current;
    // running なら interval 秒ごとに step()
    cells.tick(delta, effects);
    stage.setBloom(effects.bloom);
    stage.render();
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  return () => {
    /* cancelAnimationFrame と dispose で後片付け */
  };
}, [canvasRef]);
```

- シーンの作成は **一度だけ**。再生・速度・エフェクトが変わってもシーンは作り直さず、ref 越しに最新の値を読む
- アンマウント時に `dispose()` で GPU のリソースを解放する（StrictMode の二重実行でもリークしない）
- 画面からの命令は `LifeCanvas` の ref に渡した `{ step, load }` で受ける

### 3-8. マス数を変える

マス数を変えると、カメラの範囲もセルの数も変わります。途中から合わせ込むより作り直すほうが単純なので、`LifeCanvas` の `key` にマス数を入れ、**キャンバスごと作り直して** います。

```tsx
<LifeCanvas key={`${boardSize.width}x${boardSize.height}`} initialGrid={initialGrid} … />
```

このとき盤面の中身を引き継げるよう、画面は盤面そのものではなく **作り方**（`Seed`）を覚えています。

```ts
// view2d/seed.ts
export type Seed =
  { kind: 'random'; density: number } | { kind: 'pattern'; pattern: Pattern } | { kind: 'empty' };
```

グライダー銃を置いた状態でマス数を変えれば、新しい盤面の中央にまたグライダー銃が置かれます。

### 3-9. ランダム配置の確率

「ランダム配置」の **確率** は、1 マスが生きている確率です（初期値は 12%）。ランダム配置を表示している間にスライダーを動かすと、その確率ですぐに置き直すので、確率による違いをその場で見比べられます。

### 3-10. ドラッグでセルを描く

正射影カメラなので、画面上の位置 → 盤面の座標は `Vector3.unproject(camera)` で 1 行です。押した位置のセルが死んでいれば「描く」、生きていれば「消す」モードになります。

---

## 4. 3D に拡張する

### 4-1. 何が変わるのか

| | 2D | 3D |
|---|---|---|
| 盤面 | 128 × 72 = 9,216（48×27〜256×144） | 32 × 32 × 32 = 32,768（16³〜96³） |
| 添字 | `y * w + x` | `x + y * s + z * s * s` |
| 近傍 | 8 マス | **26 マス**（3 × 3 × 3 − 1） |
| ルール表記 | `B3/S23` | `B13-14,17-19/S13-26`（2 桁と範囲が要る） |
| カメラ | OrthographicCamera | PerspectiveCamera + OrbitControls |
| セル | 板ポリゴン（色だけ更新） | 立方体（生存セルだけ詰めて描く） |

### 4-2. ロジックはループを 1 段足すだけ

```ts
// core/life3d.ts
for (let dz = -1; dz <= 1; dz++) {
  // ← 奥行きのループが増えただけ
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0 && dz === 0) {
        continue;
      }
      count += grid.cells[indexOf(grid, x + dx, y + dy, z + dz)];
    }
  }
}
```

誕生・生存の判定はまったく同じ形です。ルールの型 `Rule` は `core/rule.ts` を 2D と共有しています。

#### 大きな盤面のために：近傍をまとめて数える

ただし、このまま全セルについて数えると、64³（約 26 万セル）で 1 世代 150ms、96³ では 400ms 以上かかり、再生がカクつきます。そこで `step()` では、全セルの近傍数をまとめて求める `countAllNeighbors()` を使っています。

3×3×3 の箱の合計は、**x 方向に 3 つ足す → それを y 方向に 3 つ足す → さらに z 方向に 3 つ足す** の 3 段に分けて求められます。1 セルあたり 26 回の足し算が 6 回で済みます。

```ts
// core/life3d.ts（考え方）
sumX[i] = alive[x - 1] + alive[x] + alive[x + 1]; // 横に3つ
sumXY[i] = sumX[y - 1] + sumX[y] + sumX[y + 1]; // 3×3 の面
counts[i] =
  sumXY[z - 1] +
  sumXY[z] +
  sumXY[z + 1] - // 3×3×3 の箱
  alive[i]; // 自分は近傍に入れない
```

| 1 辺 | 素直に数える | 軸ごとに分ける |
|---|---|---|
| 64³ | 約 150ms | 約 5ms |
| 96³ | 約 400ms | 約 19ms |

素直な `countNeighbors()` も残してあり、`tests/life3d.test.ts` で「どのセルでも両者の結果が一致する」ことを確かめています。

### 4-3. でも、同じルールでは動かない

コードはほぼそのままですが、**B3/S23 をそのまま 3D に持ち込んでも面白くなりません。** 近傍が 8 → 26 に増えると、「3 つに囲まれる」状況の意味がまるで変わるからです。

実際に 32³ の盤面でいくつかのルールを試すと、振る舞いはルールごとに大きく違います。

| プリセット | ルール | 初期配置 | 振る舞い |
|---|---|---|---|
| **Bays 4555** | B5/S4-5 | 中央 8³ に 30% | 3D のグライダーが存在する有名なルールだが、ランダムな種はほぼ消える |
| **Bays 5766** | B6/S5-7 | 2D のグライダーを 2 層の厚みで | 2D と同じく 4 世代で斜めに 1 マス進む |
| **445** | B4/S4 | 中央 6³ に 30% | 小さな種が爆発的に広がり、約 5,000 セルで沸騰し続ける |
| **Clouds** | B13-14,17-19/S13-26 | 全体に 50% | ノイズが数世代で雲のような塊にまとまって固まる |
| **Crystal** | B1,3/S0-6 | 中央の 1 セルだけ | 1 セルから対称な結晶が育つ |
| **Architecture** | B3/S4-6 | 中央 6³ に 30% | 小さな種から一気に広がり、盤面全体がざらついた構造で埋まる |
| **Pyroclastic** | B6-8/S4-7/C10 | 中央 6³ に 30% | 噴煙のように燃え広がる |
| **Coral** | B6-7,9,12/S5-8/C4 | 中央 6³ に 30% | サンゴのように枝分かれしながらゆっくり育つ |
| **Amoeba** | B5-7,12-13,15/S9-26/C5 | 中央 10³ に 50% | アメーバのような塊がうねりながら膨らむ |
| **Pulse Waves** | B1-3/S3/C10 | 中央 6³ に 30% | 波が盤面を何度も行き来し、対称な模様を描き続ける |
| **Builder** | B4,6,8-9/S2,6,9/C10 | 中央 6³ に 30% | 足場のような構造が伸びて盤面に散らばる |

3D のルールは初期配置しだいで「すぐ全滅」か「一瞬で飽和」に振れやすいので、`data/presets.ts` でルールと初期配置をセットにしています。
Bays 4555・5766 は Carter Bays の論文（1987）、それ以外は Softology の Jason Rampe 氏の記事（2019）で名前付きで紹介されているルールです。出典の詳細は [README の「3D のルールの出典」](../README.md#3d-のルールの出典) にまとめています。

| 445 | Clouds | Crystal |
|---|---|---|
| ![445](images/3d-445.png) | ![Clouds](images/3d-clouds.png) | ![Crystal](images/3d-crystal.png) |

![追加したプリセット（Architecture / Pyroclastic / Coral / Amoeba / Pulse Waves / Builder）](images/3d-presets.png)

名前は 3D セルオートマトンの作例でよく使われている通称です。どれも 32³ の盤面で実際に動かし、すぐ全滅も飽和もしない初期配置を選んでいます。

### 4-4. 死にかけの段階を持つルール（Generations）

後半の 6 つのうち 5 つは、ルールの最後に `/C10` のような **状態の数** が付いています。これは「Generations」と呼ばれる拡張で、生き残れなかったセルがすぐには消えず、**死にかけ** の段階をいくつかたどってから消えます。

| 今の状態 | 次の世代 |
|---|---|
| 死（0） | 近傍が B の数なら誕生（1）、それ以外は死のまま |
| 生（1） | 近傍が S の数なら生のまま、それ以外は死にかけの最初の段階（2）へ |
| 死にかけ（2〜C−1） | 周りに関係なく 1 段進み、最後の段階の次で死（0）へ |

死にかけのセルは近傍に数えず、その場所には誕生も起きません。この「すぐには場所が空かない」性質が、燃え広がる炎や波のような模様を生みます。

```ts
// core/life3d.ts の step（抜粋）
if (state === DEAD) {
  // 死んでいるセル: 近傍が B の数なら誕生
  next.cells[i] = rule.birth.includes(counts[i]) ? ALIVE : DEAD;
} else if (state === ALIVE) {
  // 生きているセル: S の数なら生き残る。だめなら死にかけの最初の段階（2）へ
  if (rule.survive.includes(counts[i])) {
    next.cells[i] = ALIVE;
  } else {
    next.cells[i] = states > 2 ? 2 : DEAD;
  }
} else {
  // 死にかけのセル: 周りに関係なく 1 段進み、最後の段階の次で消える
  next.cells[i] = state + 1 < states ? state + 1 : DEAD;
}
```

`states` が 2 のときは死にかけの段階がないので、普通のライフゲームとまったく同じになります。画面では、死にかけのセルを段階が進むほど暗く描いています（エフェクトではなく、ルール上の状態の違いを見せるもの）。

### 4-5. ランダムで埋めると、確率で運命が決まる

「ランダム配置」は、1 マスが生きている **確率** と、埋める **範囲**（中央の立方体の 1 辺が盤面の何 %か）を指定して置きます。範囲 100% なら盤面全体です。同じルールでも、確率によって結果がまったく変わります（32³ の全体、40 世代後の生存数）。

| ルール | 5% | 10% | 20% | 30% | 50% |
|---|---|---|---|---|---|
| 445 | 約 5,500 | 約 5,200 | 約 5,500 | 約 5,300 | **全滅** |
| Clouds | **全滅** | **全滅** | **全滅** | **全滅** | 約 9,000 |
| Crystal | 約 2,300 | 約 2,600 | 約 5,400 | 約 11,400 | 約 11,300 |
| Bays 4555 | 約 6 | 約 65 | 約 2,200 | 約 400 | **全滅** |

Clouds は 50% 近くないと一瞬で消え、445 は逆に 50% で過密になって消えます。そこでプリセットごとに「動き続けやすい確率」（`randomDensity`）を持たせ、プリセットを選ぶと確率のスライダーがその値に合わせ直されるようにしています。

ランダム配置を表示している間にスライダーを動かすと、その確率・範囲ですぐに置き直します。全滅する境目を探したり、範囲を小さくして「小さな種から育てる」様子と比べたりできます。

### 4-6. 3D の描画

**空でないセルだけを詰めて描く。** 32,768 個すべてを描くと、死んだセルを毎回隠す必要があります。代わりに生きているセルだけを配列の先頭から詰め、`mesh.count` で描く数を絞ります。

```ts
// view3d/scene/cellMesh.ts（抜粋）
const t = effects.grow ? Math.min(1, deltaSeconds * GROW_SPEED) : 1;
let drawn = 0;
for (let i = 0; i < count; i++) {
  scale[i] += (target - scale[i]) * t; // grow がオフなら一気に 0 か 1 になる
  if (scale[i] < MIN_SCALE) {
    continue;
  }

  matrix.makeScale(scale[i], scale[i], scale[i]);
  matrix.setPosition(px, py, pz);
  mesh.setMatrixAt(drawn, matrix);
  mesh.setColorAt(drawn, effects.color ? hslColor : PLAIN);
  drawn++;
}
mesh.count = drawn;
```

3D もエフェクトは最初すべてオフで、生きているセルが同じ色の立方体としてその場に出たり消えたりするだけです。

| エフェクト | 内容 |
|---|---|
| 膨らむ・縮む | 大きさを 0 ↔ 1 に毎フレーム近づけ、世代の切り替わりを滑らかにする |
| 位置と年齢で色を変える | 中心がシアン、外側がマゼンタ。生き続けるほど少し暗くなる |
| 奥を霧で薄くする | `Fog` で奥のセルほど背景に溶かす。`scene.fog` に入れるか `null` にするだけで切り替わる |
| 発光（Bloom） | 2D と同じ |

エフェクトに関係なく常に入っているのは、次の 2 つです。

- **OrbitControls の autoRotate** … 放っておいてもゆっくり回り、立体感が伝わる（パネルで止められる）
- **境界のワイヤーフレーム** … トーラスの境目。ここを越えたセルは反対側に現れる

| エフェクトなし | エフェクトあり |
|---|---|
| ![エフェクトなし](images/3d-plain.png) | ![エフェクトあり](images/3d-445.png) |

**変化があったときだけ描き直す。** 96³ では 88 万セルを毎フレーム見直すだけで重くなります。そこで、盤面かエフェクトの設定が変わったとき、または膨らむ・縮むアニメーションの途中のときだけ、行列と色を書き直しています。

注意点が 1 つあります。`instanceColor` は最初の `setColorAt` で作られるので、描画前に一度呼んでおかないと、色なしでシェーダーが組まれてしまいます。

```ts
mesh.setColorAt(0, new Color()); // instanceColor を先に作っておく
```

---

## 5. 操作

| キー | 2D | 3D |
|---|---|---|
| M | 3D に切り替え | 2D に切り替え |
| Space | 再生 / 停止 | 再生 / 停止 |
| → | 1 世代進める | 1 世代進める |
| R | ランダム配置 | ランダム配置 |
| C | クリア | — |
| L / Esc | 図形の一覧を開く / 閉じる | — |
| ↓ / ↑ | 次 / 前の図形 | — |
| I | — | プリセットの初期配置に戻す |
| 1〜9, 0 | — | ルール切り替え（先頭の 10 種） |
| A | — | カメラの自動回転 |
| マウス | ドラッグでセルを描く | ドラッグで視点を回す・ホイールで寄り引き |

URL の末尾が `#3d` なら 3D の画面が開きます。右上の「JA | EN」を押すか `?lang=en` で英語で表示します（`?lang=en#3d` のように一緒に使えます）。

## 6. いじってみるポイント

| 変えたいもの | 場所 |
|---|---|
| 図形を増やす | `data/patterns.ts` の `PATTERNS` に追加（周期を書けばテストが確かめてくれる） |
| 3D のルールを増やす | `data/presets.ts` に `parseRule('B…/S…')` で追加 |
| 2D のルール | `view2d/scene/useLifeScene.ts` の `step(gridRef.current)` に、第 2 引数で `parseRule('B36/S23')`（HighLife）などを渡す |
| 選べるマス数 | `view2d/Life2D.tsx` / `view3d/Life3D.tsx` の `BOARD_SIZES` |
| セルの色・残光の長さ | `view2d/scene/cellMesh.ts` / `view3d/scene/cellMesh.ts` 先頭の定数 |
| 発光の強さ | `view2d/scene/createStage.ts` / `view3d/scene/createStage.ts` の `UnrealBloomPass` |
| 画面の文字 | 使っている場所の `t({ ja: '…', en: '…' })`。図形・プリセットの名前と説明はデータの中 |

## 7. 動かし方

```bash
npm install
npm run dev        # 開発サーバー
npm test           # core と data のテスト（図形の周期チェックを含む）
npm run build      # 型チェック + ビルド
```
