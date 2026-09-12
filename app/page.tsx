'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Ball = 'red' | 'yellow' | 'cyan' | 'violet' | 'orange' | 'lime' | 'pink';
type Mode = 'classic' | 'rush';
type Screen = 'menu' | 'game';
type Panel = 'scores' | 'settings' | 'modes' | 'help' | null;
type GameStatus = 'playing' | 'gameover';

type SavedGame = {
  board: (Ball | null)[];
  nextBalls: Ball[];
  score: number;
  mode: Mode;
  status: GameStatus;
  timeLeft: number;
};

const SIZE = 9;
const CELLS = SIZE * SIZE;
const COLORS: Ball[] = ['red', 'yellow', 'cyan', 'violet', 'orange', 'lime', 'pink'];
const SAVE_KEY = 'puzzle-ball-save-v2';
const SCORES_KEY = 'puzzle-ball-scores-v2';
const SETTINGS_KEY = 'puzzle-ball-settings-v2';

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const nextColors = () => [randomColor(), randomColor(), randomColor()];
const choose = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function lineCells(board: (Ball | null)[], origin: number) {
  const color = board[origin];
  if (!color) return new Set<number>();
  const row = Math.floor(origin / SIZE);
  const col = origin % SIZE;
  const found = new Set<number>();
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const run = [origin];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === color) {
        run.push(r * SIZE + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run.length >= 5) run.forEach((cell) => found.add(cell));
  }
  return found;
}

function findPath(board: (Ball | null)[], from: number, to: number) {
  if (from === to || board[to]) return false;
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const current = queue.shift()!;
    const row = Math.floor(current / SIZE);
    const col = current % SIZE;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = row + dr; const c = col + dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
      const next = r * SIZE + c;
      if (next === to) return true;
      if (!board[next] && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return false;
}

function newBoard() {
  const board: (Ball | null)[] = Array(CELLS).fill(null);
  const slots = Array.from({ length: CELLS }, (_, i) => i);
  for (let i = 0; i < 5; i++) {
    const slot = choose(slots);
    slots.splice(slots.indexOf(slot), 1);
    board[slot] = randomColor();
  }
  return board;
}

let audioContext: AudioContext | null = null;
function sound(kind: 'tap' | 'select' | 'move' | 'clear' | 'spawn' | 'bad' | 'over', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  audioContext ??= new AudioContext();
  const ctx = audioContext;
  const notes: Record<typeof kind, number[]> = {
    tap: [420], select: [570, 720], move: [360, 470], clear: [520, 660, 820, 1040],
    spawn: [260, 310, 360], bad: [150, 115], over: [430, 330, 230],
  };
  notes[kind].forEach((frequency, i) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = kind === 'bad' ? 'square' : 'sine';
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + i * .055;
    const duration = kind === 'clear' ? .24 : .12;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? .035 : .075, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start); oscillator.stop(start + duration + .02);
  });
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [panel, setPanel] = useState<Panel>(null);
  const [board, setBoard] = useState<(Ball | null)[]>(() => newBoard());
  const [nextBalls, setNextBalls] = useState<Ball[]>(() => nextColors());
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<Mode>('classic');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [timeLeft, setTimeLeft] = useState(120);
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [savedAvailable, setSavedAvailable] = useState(false);
  const [highScores, setHighScores] = useState({ classic: 0, rush: 0 });
  const [toast, setToast] = useState('');
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1700);
  }, []);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      try {
        setSavedAvailable(Boolean(localStorage.getItem(SAVE_KEY)));
        const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
        setHighScores({ classic: Number(scores.classic) || 0, rush: Number(scores.rush) || 0 });
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (typeof settings.soundOn === 'boolean') setSoundOn(settings.soundOn);
        if (typeof settings.vibrationOn === 'boolean') setVibrationOn(settings.vibrationOn);
      } catch { /* Local storage can be unavailable in private browsing. */ }
    }, 0);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundOn, vibrationOn })); } catch { /* noop */ }
  }, [soundOn, vibrationOn]);

  useEffect(() => {
    if (screen !== 'game') return;
    const game: SavedGame = { board, nextBalls, score, mode, status, timeLeft };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch { /* noop */ }
  }, [board, mode, nextBalls, score, screen, status, timeLeft]);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'rush' || status !== 'playing') return;
    const timer = setInterval(() => setTimeLeft((seconds) => {
      if (seconds <= 1) { setStatus('gameover'); sound('over', soundOn); return 0; }
      return seconds - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [mode, screen, soundOn, status]);

  useEffect(() => {
    if (status !== 'gameover') return;
    const scoreTimer = window.setTimeout(() => {
      setHighScores((current) => {
        const updated = { ...current, [mode]: Math.max(current[mode], score) };
        try { localStorage.setItem(SCORES_KEY, JSON.stringify(updated)); } catch { /* noop */ }
        return updated;
      });
    }, 0);
    return () => window.clearTimeout(scoreTimer);
  }, [mode, score, status]);

  const startGame = (chosenMode: Mode) => {
    sound('tap', soundOn);
    setMode(chosenMode); setBoard(newBoard()); setNextBalls(nextColors()); setScore(0);
    setSelected(null); setTimeLeft(120); setStatus('playing'); setFresh(new Set());
    setSavedAvailable(true); setPanel(null); setScreen('game');
  };

  const continueGame = () => {
    sound('tap', soundOn);
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '') as SavedGame;
      if (!Array.isArray(saved.board) || saved.board.length !== CELLS) throw new Error('bad save');
      setBoard(saved.board); setNextBalls(saved.nextBalls); setScore(saved.score || 0);
      setMode(saved.mode || 'classic'); setStatus(saved.status || 'playing'); setTimeLeft(saved.timeLeft ?? 120);
      setSelected(null); setScreen('game');
    } catch { showToast('还没有可以继续的游戏'); setSavedAvailable(false); }
  };

  const award = (count: number) => {
    const points = 10 + Math.max(0, count - 5) * 5;
    setScore((value) => value + points);
    if (mode === 'rush') setTimeLeft((seconds) => Math.min(120, seconds + count * 2));
    sound('clear', soundOn);
    if (vibrationOn && navigator.vibrate) navigator.vibrate([22, 25, 35]);
    showToast(`漂亮！消除 ${count} 颗  +${points}`);
  };

  const addNextBalls = (current: (Ball | null)[]) => {
    const updated = [...current];
    const empties = updated.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0);
    const placed: number[] = [];
    const amount = Math.min(empties.length, mode === 'rush' ? 4 : 3);
    for (let i = 0; i < amount; i++) {
      const slot = choose(empties);
      empties.splice(empties.indexOf(slot), 1);
      updated[slot] = nextBalls[i % nextBalls.length]; placed.push(slot);
    }
    const clearing = new Set<number>();
    placed.forEach((slot) => lineCells(updated, slot).forEach((cell) => clearing.add(cell)));
    if (clearing.size) { clearing.forEach((cell) => { updated[cell] = null; }); award(clearing.size); }
    setFresh(new Set(placed.filter((cell) => !clearing.has(cell))));
    setTimeout(() => setFresh(new Set()), 420);
    setNextBalls(nextColors());
    sound('spawn', soundOn);
    if (!updated.some((cell) => cell === null)) { setStatus('gameover'); sound('over', soundOn); }
    return updated;
  };

  const handleCell = (index: number) => {
    if (status !== 'playing') return;
    const cell = board[index];
    if (cell) { setSelected(index); sound('select', soundOn); return; }
    if (selected === null) { showToast('请先点选一颗彩球'); sound('bad', soundOn); return; }
    if (!findPath(board, selected, index)) { showToast('没有可通行的路线'); sound('bad', soundOn); return; }

    const moved = [...board];
    moved[index] = moved[selected]; moved[selected] = null;
    setSelected(null); sound('move', soundOn);
    const clearing = lineCells(moved, index);
    if (clearing.size) {
      clearing.forEach((cellIndex) => { moved[cellIndex] = null; });
      award(clearing.size); setBoard(moved);
    } else {
      setBoard(addNextBalls(moved));
    }
  };

  const focusCell = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offsets: Record<string, number> = { ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1 };
    if (!(event.key in offsets)) return;
    const target = index + offsets[event.key];
    const sameRow = Math.floor(target / SIZE) === Math.floor(index / SIZE);
    if (target < 0 || target >= CELLS || ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !sameRow)) return;
    event.preventDefault();
    document.querySelector<HTMLButtonElement>(`[data-cell="${target}"]`)?.focus();
  };

  const filled = useMemo(() => board.filter(Boolean).length, [board]);
  const formatTime = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  if (screen === 'game') {
    return (
      <main className={`app-shell game-screen mode-${mode}`}>
        <section className="game-column">
          <header className="game-topbar">
            <button onClick={() => { sound('tap', soundOn); setScreen('menu'); }} aria-label="返回主页">返回</button>
            <div className="score-box"><strong>分数:{score}</strong>{mode === 'rush' && <small>{formatTime}</small>}</div>
            <button onClick={() => setPanel('help')} aria-label="玩法说明">帮助</button>
          </header>

          <section className="board-wrap" aria-label="彩色小连珠棋盘">
          <div className="board" role="grid" aria-rowcount={9} aria-colcount={9}>
            {board.map((color, index) => {
              const row = Math.floor(index / SIZE); const col = index % SIZE;
              return (
                <button
                  className={`cell ${selected === index ? 'selected' : ''} ${fresh.has(index) ? 'fresh' : ''}`}
                  key={index} data-cell={index} role="gridcell" onClick={() => handleCell(index)}
                  onKeyDown={(event) => focusCell(event, index)}
                  aria-label={`${row + 1}行${col + 1}列${color ? '，有彩球' : '，空'}`}
                >{color && <span className={`ball ${color}`}><i/><b/></span>}</button>
              );
            })}
            {status === 'gameover' && (
              <div className="game-over" role="dialog" aria-label="游戏结束">
                <span>本局结束</span><strong>{score}</strong><small>最高分 {Math.max(highScores[mode], score)}</small>
                <button onClick={() => startGame(mode)}>再来一局</button>
                <button className="ghost" onClick={() => setScreen('menu')}>返回主页</button>
              </div>
            )}
          </div>
          </section>
          <div className="next-strip">
            <span>下组颜色</span>
            <div>{nextBalls.map((color, i) => <i className={`mini-ball ${color}`} key={`${color}-${i}`}/>)}</div>
          </div>
          <div className="ad-free-note">离线可玩 · 无广告{mode === 'rush' ? ` · 剩余 ${formatTime}` : ` · 棋盘 ${filled}/81`}</div>
        </section>
        {toast && <div className="toast" role="status">{toast}</div>}
        {panel === 'help' && <Modal title="怎么玩" onClose={() => setPanel(null)}><Rules mode={mode}/></Modal>}
      </main>
    );
  }

  return (
    <main className="app-shell menu-screen">
      <section className="hero" aria-label="彩色小连珠">
        <div className="mascots" aria-hidden="true">
          <span className="mascot yellow"><i/><b/></span>
          <span className="mascot violet"><i/><b/></span>
          <span className="mascot red"><i/><b/></span>
        </div>
        <div className="brand-cn">9×9 连珠益智游戏</div>
        <h1>彩色小连珠</h1>
        <div className="board-preview" aria-hidden="true">
          {Array.from({ length: 45 }, (_, i) => <span key={i}>{i % 7 === 0 || i % 11 === 0 ? <i className={`mini-ball ${COLORS[i % COLORS.length]}`}/> : null}</span>)}
        </div>
      </section>

      <nav className="menu-actions" aria-label="主菜单">
        <button className="primary-action" onClick={() => startGame('classic')}><span>新游戏</span><small>开始经典模式</small></button>
        <button onClick={continueGame} className={!savedAvailable ? 'muted-action' : ''}><span>继续游戏</span><small>{savedAvailable ? '读取上次进度' : '暂无存档'}</small></button>
        <button onClick={() => { sound('tap', soundOn); setPanel('scores'); }}><span>积分榜</span><small>查看本机纪录</small></button>
        <button onClick={() => { sound('tap', soundOn); setPanel('modes'); }}><span>更多玩法</span><small>独立扩展模式</small></button>
      </nav>

      <div className="menu-tools">
        <button onClick={() => setPanel('help')}>玩法</button><span>·</span><button onClick={() => setPanel('settings')}>设置</button>
      </div>
      <footer>9×9 益智棋盘 · 离线可玩 · 自动保存</footer>
      {toast && <div className="toast" role="status">{toast}</div>}

      {panel === 'scores' && <Modal title="本机积分榜" onClose={() => setPanel(null)}><div className="score-list"><p><i className="mini-ball yellow"/><span>经典模式</span><strong>{highScores.classic}</strong></p><p><i className="mini-ball cyan"/><span>闪电模式</span><strong>{highScores.rush}</strong></p><small>纪录只保存在当前设备，不会上传。</small></div></Modal>}
      {panel === 'modes' && <Modal title="更多玩法" onClose={() => setPanel(null)}><div className="mode-cards"><button onClick={() => startGame('classic')}><i className="mode-icon classic-icon">∞</i><span><strong>经典模式</strong><small>标准 9×9 连珠玩法</small></span></button><button onClick={() => startGame('rush')}><i className="mode-icon rush-icon">90</i><span><strong>闪电模式</strong><small>2 分钟开局，消除彩球可赢回时间</small></span></button></div><p className="modal-note">两种模式的规则与纪录互不覆盖。</p></Modal>}
      {panel === 'settings' && <Modal title="设置" onClose={() => setPanel(null)}><div className="settings-list"><label><span><strong>游戏声音</strong><small>合成移动与消除音效</small></span><input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)}/></label><label><span><strong>触感反馈</strong><small>支持的手机消除时轻微震动</small></span><input type="checkbox" checked={vibrationOn} onChange={(e) => setVibrationOn(e.target.checked)}/></label></div><div className="install-note"><strong>安装到手机</strong><p>iPhone/iPad：Safari 点“分享”→“添加到主屏幕”。<br/>安卓/电脑：浏览器菜单点“安装应用”。安装后仍可离线游玩。</p></div></Modal>}
      {panel === 'help' && <Modal title="怎么玩" onClose={() => setPanel(null)}><Rules mode="classic"/></Modal>}
    </main>
  );
}

function Rules({ mode }: { mode: Mode }) {
  return <ol className="rules"><li><b>1</b><span>点一颗彩球，再点一个空格。只要有上下左右相连的空路，彩球就会移动过去。</span></li><li><b>2</b><span>每次没有消除的移动后，棋盘会出现下一批彩球。</span></li><li><b>3</b><span>横向、纵向或斜向连成至少 5 颗同色球，就会消除并得分。</span></li>{mode === 'rush' && <li><b>+</b><span>闪电模式会倒计时；连珠越多，奖励的时间越多。</span></li>}</ol>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={onClose} aria-label="关闭">×</button></header>{children}</section></div>;
}
