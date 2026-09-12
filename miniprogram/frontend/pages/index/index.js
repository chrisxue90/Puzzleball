const { play } = require('../../utils/audio');

const SIZE = 9;
const CELL_COUNT = SIZE * SIZE;
const COLORS = ['red', 'yellow', 'cyan', 'violet', 'orange', 'lime', 'pink'];
const SAVE_KEY = 'puzzle-ball-mini-save-v1';
const SCORE_KEY = 'puzzle-ball-mini-scores-v1';
const SETTINGS_KEY = 'puzzle-ball-mini-settings-v1';

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function nextColors() {
  return [randomColor(), randomColor(), randomColor()];
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createBoard() {
  const board = Array(CELL_COUNT).fill('');
  const slots = Array.from({ length: CELL_COUNT }, (_, index) => index);

  for (let index = 0; index < 5; index += 1) {
    const slot = choose(slots);
    slots.splice(slots.indexOf(slot), 1);
    board[slot] = randomColor();
  }

  return board;
}

function findLineCells(board, origin) {
  const color = board[origin];
  if (!color) return [];

  const row = Math.floor(origin / SIZE);
  const column = origin % SIZE;
  const found = {};
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

  directions.forEach(([rowStep, columnStep]) => {
    const run = [origin];

    [-1, 1].forEach((direction) => {
      let nextRow = row + rowStep * direction;
      let nextColumn = column + columnStep * direction;

      while (
        nextRow >= 0 && nextRow < SIZE &&
        nextColumn >= 0 && nextColumn < SIZE &&
        board[nextRow * SIZE + nextColumn] === color
      ) {
        run.push(nextRow * SIZE + nextColumn);
        nextRow += rowStep * direction;
        nextColumn += columnStep * direction;
      }
    });

    if (run.length >= 5) run.forEach((cell) => { found[cell] = true; });
  });

  return Object.keys(found).map(Number);
}

function hasPath(board, from, to) {
  if (from === to || board[to]) return false;

  const queue = [from];
  const seen = { [from]: true };

  while (queue.length) {
    const current = queue.shift();
    const row = Math.floor(current / SIZE);
    const column = current % SIZE;
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let index = 0; index < neighbors.length; index += 1) {
      const nextRow = row + neighbors[index][0];
      const nextColumn = column + neighbors[index][1];
      if (nextRow < 0 || nextRow >= SIZE || nextColumn < 0 || nextColumn >= SIZE) continue;

      const next = nextRow * SIZE + nextColumn;
      if (next === to) return true;
      if (!board[next] && !seen[next]) {
        seen[next] = true;
        queue.push(next);
      }
    }
  }

  return false;
}

Page({
  data: {
    screen: 'menu',
    board: [],
    nextBalls: [],
    selected: -1,
    score: 0,
    mode: 'classic',
    status: 'playing',
    timeLeft: 120,
    timeText: '2:00',
    soundOn: true,
    vibrationOn: true,
    savedAvailable: false,
    highScores: { classic: 0, rush: 0 }
  },

  onLoad() {
    const settings = wx.getStorageSync(SETTINGS_KEY) || {};
    const highScores = wx.getStorageSync(SCORE_KEY) || { classic: 0, rush: 0 };
    const savedAvailable = Boolean(wx.getStorageSync(SAVE_KEY));

    this.setData({
      soundOn: settings.soundOn !== false,
      vibrationOn: settings.vibrationOn !== false,
      highScores,
      savedAvailable,
      board: createBoard(),
      nextBalls: nextColors()
    });
  },

  onHide() {
    this.saveGame();
  },

  onUnload() {
    this.stopTimer();
  },

  startClassic() {
    this.startGame('classic');
  },

  startGame(mode) {
    play('tap', this.data.soundOn);
    this.stopTimer();
    this.setData({
      screen: 'game',
      board: createBoard(),
      nextBalls: nextColors(),
      selected: -1,
      score: 0,
      mode,
      status: 'playing',
      timeLeft: 120,
      timeText: '2:00'
    }, () => {
      if (mode === 'rush') this.startTimer();
      this.saveGame();
    });
  },

  chooseMode() {
    wx.showActionSheet({
      itemList: ['经典模式', '闪电模式'],
      success: ({ tapIndex }) => this.startGame(tapIndex === 1 ? 'rush' : 'classic')
    });
  },

  continueGame() {
    const saved = wx.getStorageSync(SAVE_KEY);
    if (!saved || !Array.isArray(saved.board) || saved.board.length !== CELL_COUNT) {
      wx.showToast({ title: '还没有可以继续的游戏', icon: 'none' });
      this.setData({ savedAvailable: false });
      return;
    }

    play('tap', this.data.soundOn);
    this.setData({
      screen: 'game',
      board: saved.board,
      nextBalls: saved.nextBalls || nextColors(),
      selected: -1,
      score: Number(saved.score) || 0,
      mode: saved.mode || 'classic',
      status: saved.status || 'playing',
      timeLeft: Number.isFinite(saved.timeLeft) ? saved.timeLeft : 120,
      timeText: this.formatTime(Number.isFinite(saved.timeLeft) ? saved.timeLeft : 120)
    }, () => {
      if (this.data.mode === 'rush' && this.data.status === 'playing') this.startTimer();
    });
  },

  returnToMenu() {
    play('tap', this.data.soundOn);
    this.stopTimer();
    this.saveGame();
    this.setData({ screen: 'menu', selected: -1 });
  },

  tapCell(event) {
    if (this.data.status !== 'playing') return;

    const index = Number(event.currentTarget.dataset.index);
    const board = this.data.board;

    if (board[index]) {
      this.setData({ selected: index });
      play('select', this.data.soundOn);
      return;
    }

    if (this.data.selected < 0) {
      this.notify('请先点选一颗彩球', 'bad');
      return;
    }

    if (!hasPath(board, this.data.selected, index)) {
      this.notify('没有可通行的路线', 'bad');
      return;
    }

    const moved = board.slice();
    moved[index] = moved[this.data.selected];
    moved[this.data.selected] = '';
    play('move', this.data.soundOn);

    const clearing = findLineCells(moved, index);
    if (clearing.length) {
      clearing.forEach((cell) => { moved[cell] = ''; });
      this.award(clearing.length);
      this.setData({ board: moved, selected: -1 }, () => this.saveGame());
      return;
    }

    this.addNextBalls(moved);
  },

  addNextBalls(board) {
    const updated = board.slice();
    const empties = updated
      .map((cell, index) => (cell ? -1 : index))
      .filter((index) => index >= 0);
    const placed = [];
    const amount = Math.min(empties.length, this.data.mode === 'rush' ? 4 : 3);

    for (let index = 0; index < amount; index += 1) {
      const slot = choose(empties);
      empties.splice(empties.indexOf(slot), 1);
      updated[slot] = this.data.nextBalls[index % this.data.nextBalls.length];
      placed.push(slot);
    }

    const clearingMap = {};
    placed.forEach((slot) => {
      findLineCells(updated, slot).forEach((cell) => { clearingMap[cell] = true; });
    });
    const clearing = Object.keys(clearingMap).map(Number);

    if (clearing.length) {
      clearing.forEach((cell) => { updated[cell] = ''; });
      this.award(clearing.length);
    }

    const isGameOver = updated.every(Boolean);
    play(isGameOver ? 'over' : 'spawn', this.data.soundOn);
    this.setData({
      board: updated,
      nextBalls: nextColors(),
      selected: -1,
      status: isGameOver ? 'gameover' : 'playing'
    }, () => {
      if (isGameOver) this.recordScore();
      this.saveGame();
    });
  },

  award(count) {
    const points = 10 + Math.max(0, count - 5) * 5;
    const update = { score: this.data.score + points };

    if (this.data.mode === 'rush') {
      update.timeLeft = Math.min(120, this.data.timeLeft + count * 2);
      update.timeText = this.formatTime(update.timeLeft);
    }

    this.setData(update);
    play('clear', this.data.soundOn);
    if (this.data.vibrationOn && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: 'light' });
    }
    wx.showToast({ title: `消除 ${count} 颗，+${points}`, icon: 'none' });
  },

  replay() {
    this.startGame(this.data.mode);
  },

  showHelp() {
    const rushRule = this.data.mode === 'rush' ? '\n\n闪电模式会倒计时，消除彩球可以赢回时间。' : '';
    wx.showModal({
      title: '怎么玩',
      content: `点一颗彩球，再点空格移动。彩球只能沿上下左右相连的空路通行。横、竖或斜向连成至少 5 颗同色球即可消除。没有消除时会出现下一组彩球。${rushRule}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  showScores() {
    wx.showModal({
      title: '本机积分榜',
      content: `经典模式：${this.data.highScores.classic || 0}\n闪电模式：${this.data.highScores.rush || 0}`,
      showCancel: false
    });
  },

  toggleSound(event) {
    const soundOn = event.detail.value;
    this.setData({ soundOn });
    wx.setStorageSync(SETTINGS_KEY, { soundOn, vibrationOn: this.data.vibrationOn });
    play('tap', soundOn);
  },

  toggleVibration(event) {
    const vibrationOn = event.detail.value;
    this.setData({ vibrationOn });
    wx.setStorageSync(SETTINGS_KEY, { soundOn: this.data.soundOn, vibrationOn });
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const timeLeft = Math.max(0, this.data.timeLeft - 1);
      this.setData({ timeLeft, timeText: this.formatTime(timeLeft) });

      if (timeLeft === 0) {
        this.stopTimer();
        play('over', this.data.soundOn);
        this.setData({ status: 'gameover' }, () => {
          this.recordScore();
          this.saveGame();
        });
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  },

  recordScore() {
    const highScores = Object.assign({}, this.data.highScores);
    highScores[this.data.mode] = Math.max(highScores[this.data.mode] || 0, this.data.score);
    this.setData({ highScores });
    wx.setStorageSync(SCORE_KEY, highScores);
  },

  saveGame() {
    if (this.data.screen !== 'game' || !this.data.board.length) return;
    wx.setStorageSync(SAVE_KEY, {
      board: this.data.board,
      nextBalls: this.data.nextBalls,
      score: this.data.score,
      mode: this.data.mode,
      status: this.data.status,
      timeLeft: this.data.timeLeft
    });
    this.setData({ savedAvailable: true });
  },

  notify(title, soundName) {
    play(soundName, this.data.soundOn);
    wx.showToast({ title, icon: 'none' });
  }
});
