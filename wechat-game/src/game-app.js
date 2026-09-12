import {
  BALL_COLORS,
  BOARD_SIZE,
  CELL_COUNT,
  GAME_RULES_VERSION,
  createInitialBoard,
  createNextColors,
  resolveMove,
  scoreForClear,
} from '../shared/game-core.js';
import { BALL_GRADIENTS, UI_COLORS } from '../shared/design-tokens.js';
import { playSound } from './audio.js';

const SAVE_KEY = 'color-mini-lines-wechat-game-save-v1';
const SCORES_KEY = 'color-mini-lines-wechat-game-scores-v1';
const SETTINGS_KEY = 'color-mini-lines-wechat-game-settings-v1';

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function getWindowMetrics() {
  if (typeof wx.getWindowInfo === 'function') return wx.getWindowInfo();
  return wx.getSystemInfoSync();
}

function readStorage(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch {
    // Local persistence is optional; gameplay continues if storage is unavailable.
  }
}

export class ColorMiniLinesGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.screen = 'menu';
    this.panel = null;
    this.board = createInitialBoard();
    this.nextBalls = createNextColors();
    this.selected = null;
    this.score = 0;
    this.mode = 'classic';
    this.status = 'playing';
    this.timeLeft = 120;
    this.timer = null;
    this.toast = '';
    this.toastTimer = null;
    this.hotspots = [];
    this.boardRect = null;
    this.highScores = readStorage(SCORES_KEY, { classic: 0, rush: 0 });
    const settings = readStorage(SETTINGS_KEY, { soundOn: true, vibrationOn: true });
    this.soundOn = settings.soundOn !== false;
    this.vibrationOn = settings.vibrationOn !== false;
    this.savedAvailable = Boolean(readStorage(SAVE_KEY, null));
    this.handleTouch = this.handleTouch.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.resize();
    wx.onTouchEnd(this.handleTouch);
    if (typeof wx.onWindowResize === 'function') wx.onWindowResize(this.handleResize);
    this.render();
  }

  resize() {
    const metrics = getWindowMetrics();
    this.width = metrics.windowWidth || metrics.screenWidth;
    this.height = metrics.windowHeight || metrics.screenHeight;
    this.pixelRatio = Math.min(metrics.pixelRatio || 1, 3);
    this.safeTop = metrics.safeArea ? metrics.safeArea.top : 0;
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  handleResize() {
    this.resize();
    this.render();
  }

  addHotspot(id, x, y, width, height, action) {
    this.hotspots.push({ id, x, y, width, height, action });
  }

  handleTouch(event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const x = touch.clientX;
    const y = touch.clientY;

    for (let index = this.hotspots.length - 1; index >= 0; index -= 1) {
      const target = this.hotspots[index];
      if (
        x >= target.x
        && x <= target.x + target.width
        && y >= target.y
        && y <= target.y + target.height
      ) {
        target.action();
        return;
      }
    }

    if (this.screen === 'game' && !this.panel && this.boardRect && this.status === 'playing') {
      const rect = this.boardRect;
      if (x >= rect.x && x < rect.x + rect.size && y >= rect.y && y < rect.y + rect.size) {
        const column = Math.floor((x - rect.x) / rect.cellSize);
        const row = Math.floor((y - rect.y) / rect.cellSize);
        this.tapCell(row * BOARD_SIZE + column);
      }
    }
  }

  startGame(mode) {
    playSound('tap', this.soundOn);
    this.stopTimer();
    this.screen = 'game';
    this.panel = null;
    this.mode = mode;
    this.board = createInitialBoard();
    this.nextBalls = createNextColors();
    this.selected = null;
    this.score = 0;
    this.status = 'playing';
    this.timeLeft = 120;
    this.savedAvailable = true;
    if (mode === 'rush') this.startTimer();
    this.saveGame();
    this.render();
  }

  continueGame() {
    playSound('tap', this.soundOn);
    const saved = readStorage(SAVE_KEY, null);
    if (!saved || !Array.isArray(saved.board) || saved.board.length !== CELL_COUNT) {
      this.savedAvailable = false;
      this.notify('还没有可以继续的游戏', 'bad');
      return;
    }

    this.screen = 'game';
    this.panel = null;
    this.board = saved.board;
    this.nextBalls = Array.isArray(saved.nextBalls) && saved.nextBalls.length
      ? saved.nextBalls
      : createNextColors();
    this.score = Number(saved.score) || 0;
    this.mode = saved.mode === 'rush' ? 'rush' : 'classic';
    this.status = saved.status === 'gameover' ? 'gameover' : 'playing';
    this.timeLeft = Number.isFinite(saved.timeLeft) ? saved.timeLeft : 120;
    this.selected = null;
    if (this.mode === 'rush' && this.status === 'playing') this.startTimer();
    this.render();
  }

  returnToMenu() {
    playSound('tap', this.soundOn);
    this.saveGame();
    this.stopTimer();
    this.screen = 'menu';
    this.panel = null;
    this.selected = null;
    this.render();
  }

  tapCell(index) {
    if (this.status !== 'playing') return;
    if (this.board[index]) {
      this.selected = index;
      playSound('select', this.soundOn);
      this.render();
      return;
    }

    if (this.selected === null) {
      this.notify('请先点选一颗彩球', 'bad');
      return;
    }

    const spawnCount = this.mode === 'rush' ? 4 : 3;
    const result = resolveMove(this.board, this.selected, index, this.nextBalls, spawnCount);
    if (!result.ok) {
      this.notify('没有可通行的路线', 'bad');
      return;
    }

    this.selected = null;
    this.board = result.board;
    playSound('move', this.soundOn);

    if (result.cleared.length) this.award(result.cleared.length);
    if (result.spawned) {
      this.nextBalls = createNextColors();
      playSound('spawn', this.soundOn);
    }
    if (result.gameOver) this.finishGame();

    this.saveGame();
    this.render();
  }

  award(count) {
    const points = scoreForClear(count);
    this.score += points;
    if (this.mode === 'rush') this.timeLeft = Math.min(120, this.timeLeft + count * 2);
    playSound('clear', this.soundOn);
    if (this.vibrationOn && typeof wx.vibrateShort === 'function') {
      try { wx.vibrateShort({ type: 'light' }); } catch { /* Enhancement only. */ }
    }
    this.notify(`消除 ${count} 颗  +${points}`, null);
  }

  finishGame() {
    this.status = 'gameover';
    this.stopTimer();
    playSound('over', this.soundOn);
    this.highScores[this.mode] = Math.max(this.highScores[this.mode] || 0, this.score);
    writeStorage(SCORES_KEY, this.highScores);
    this.saveGame();
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      if (this.timeLeft === 0) this.finishGame();
      this.saveGame();
      this.render();
    }, 1000);
  }

  stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  saveGame() {
    if (this.screen !== 'game') return;
    writeStorage(SAVE_KEY, {
      rulesVersion: GAME_RULES_VERSION,
      board: this.board,
      nextBalls: this.nextBalls,
      score: this.score,
      mode: this.mode,
      status: this.status,
      timeLeft: this.timeLeft,
    });
    this.savedAvailable = true;
  }

  saveSettings() {
    writeStorage(SETTINGS_KEY, {
      soundOn: this.soundOn,
      vibrationOn: this.vibrationOn,
    });
  }

  notify(message, soundKind) {
    if (soundKind) playSound(soundKind, this.soundOn);
    this.toast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 1700);
    this.render();
  }

  render() {
    this.hotspots = [];
    this.context.clearRect(0, 0, this.width, this.height);
    if (this.screen === 'menu') this.drawMenu();
    else this.drawGame();
    if (this.panel) this.drawPanel();
    if (this.toast) this.drawToast();
  }

  drawMenu() {
    const context = this.context;
    const background = context.createLinearGradient(0, 0, 0, this.height);
    background.addColorStop(0, '#708880');
    background.addColorStop(0.45, '#506963');
    background.addColorStop(1, '#2d4542');
    context.fillStyle = background;
    context.fillRect(0, 0, this.width, this.height);

    const contentWidth = Math.min(this.width - 32, 540);
    const left = (this.width - contentWidth) / 2;
    const compact = this.height < 700;
    const heroTop = this.safeTop + (compact ? 14 : 24);
    const mascotRadius = compact ? 25 : 31;
    this.drawBall(this.width / 2 - 82, heroTop + 42, mascotRadius, 'yellow', true);
    this.drawBall(this.width / 2, heroTop + 35, mascotRadius + 5, 'violet', true);
    this.drawBall(this.width / 2 + 86, heroTop + 42, mascotRadius, 'red', true);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff4ce';
    context.font = `700 ${compact ? 19 : 22}px STKaiti`;
    context.fillText('9×9 连珠益智游戏', this.width / 2, heroTop + (compact ? 86 : 100));
    context.fillStyle = '#edf5f2';
    context.font = `700 ${compact ? 39 : 46}px STKaiti`;
    context.shadowColor = 'rgba(10, 30, 28, .7)';
    context.shadowBlur = 10;
    context.shadowOffsetY = 5;
    context.fillText('彩色小连珠', this.width / 2, heroTop + (compact ? 126 : 146));
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    const previewWidth = Math.min(contentWidth * 0.78, 390);
    const previewHeight = compact ? 73 : 90;
    const previewX = (this.width - previewWidth) / 2;
    const previewY = heroTop + (compact ? 154 : 184);
    this.drawPreviewBoard(previewX, previewY, previewWidth, previewHeight);

    const buttonHeight = compact ? 48 : 54;
    const gap = compact ? 7 : 10;
    let buttonY = previewY + previewHeight + (compact ? 18 : 28);
    this.drawMenuButton(left, buttonY, contentWidth, buttonHeight, '新游戏', '开始经典模式', true, () => this.startGame('classic'));
    buttonY += buttonHeight + gap;
    this.drawMenuButton(left, buttonY, contentWidth, buttonHeight, '继续游戏', this.savedAvailable ? '读取上次进度' : '暂无存档', false, () => this.continueGame());
    buttonY += buttonHeight + gap;
    this.drawMenuButton(left, buttonY, contentWidth, buttonHeight, '积分榜', '查看本机纪录', false, () => {
      playSound('tap', this.soundOn);
      this.panel = 'scores';
      this.render();
    });
    buttonY += buttonHeight + gap;
    this.drawMenuButton(left, buttonY, contentWidth, buttonHeight, '更多玩法', '经典与闪电模式', false, () => {
      playSound('tap', this.soundOn);
      this.panel = 'modes';
      this.render();
    });

    const toolsY = Math.min(this.height - 58, buttonY + buttonHeight + 24);
    this.drawTextButton(left + contentWidth * 0.19, toolsY, 74, 34, '玩法', () => {
      this.panel = 'help';
      this.render();
    });
    this.drawTextButton(left + contentWidth * 0.61, toolsY, 74, 34, '设置', () => {
      this.panel = 'settings';
      this.render();
    });
  }

  drawMenuButton(x, y, width, height, title, detail, primary, action) {
    const context = this.context;
    const fill = context.createLinearGradient(0, y, 0, y + height);
    fill.addColorStop(0, '#fff8df');
    fill.addColorStop(1, primary ? '#ffc95f' : '#efd49d');
    context.save();
    context.shadowColor = 'rgba(18, 35, 34, .32)';
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    roundedRect(context, x, y, width, height, 12);
    context.fillStyle = fill;
    context.fill();
    context.restore();
    context.strokeStyle = 'rgba(125, 91, 47, .45)';
    roundedRect(context, x, y, width, height, 12);
    context.stroke();

    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillStyle = '#39516b';
    context.font = '700 20px Microsoft YaHei';
    context.fillText(title, x + 22, y + height / 2);
    context.textAlign = 'right';
    context.fillStyle = '#806e53';
    context.font = '13px Microsoft YaHei';
    context.fillText(detail, x + width - 18, y + height / 2);
    this.addHotspot(`menu-${title}`, x, y, width, height, action);
  }

  drawTextButton(x, y, width, height, text, action) {
    const context = this.context;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '16px Microsoft YaHei';
    context.fillStyle = 'rgba(245, 250, 247, .82)';
    context.fillText(text, x + width / 2, y + height / 2);
    this.addHotspot(`tool-${text}`, x, y, width, height, action);
  }

  drawPreviewBoard(x, y, width, height) {
    const context = this.context;
    context.save();
    context.translate(x + width / 2, y + height / 2);
    context.rotate(-0.025);
    context.translate(-width / 2, -height / 2);
    context.fillStyle = '#d6c9a5';
    context.fillRect(-5, -5, width + 10, height + 10);
    const cellWidth = width / 9;
    const cellHeight = height / 3;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        context.fillStyle = '#ede6cd';
        context.fillRect(column * cellWidth + 0.5, row * cellHeight + 0.5, cellWidth - 1, cellHeight - 1);
      }
    }
    const previewCells = [1, 7, 11, 17, 20, 25];
    previewCells.forEach((cell, index) => {
      const row = Math.floor(cell / 9);
      const column = cell % 9;
      this.drawBall(column * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2, Math.min(cellWidth, cellHeight) * 0.31, BALL_COLORS[index], false);
    });
    context.restore();
  }

  drawGame() {
    const context = this.context;
    context.fillStyle = UI_COLORS.background;
    context.fillRect(0, 0, this.width, this.height);

    const topbarHeight = this.safeTop + 64;
    context.fillStyle = UI_COLORS.panel;
    context.fillRect(0, 0, this.width, topbarHeight);
    context.fillStyle = UI_COLORS.background;
    context.fillRect(0, topbarHeight - 4, this.width, 4);

    const controlY = this.safeTop + 8;
    this.drawTopButton(8, controlY, 74, 48, '退出', () => this.returnToMenu(), 'left');
    this.drawTopButton(this.width - 82, controlY, 74, 48, '帮助', () => {
      this.panel = 'help';
      this.render();
    }, 'right');
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#111111';
    context.font = '700 23px Microsoft YaHei';
    context.fillText(`分数:${this.score}`, this.width / 2, controlY + (this.mode === 'rush' ? 18 : 24));
    if (this.mode === 'rush') {
      context.fillStyle = '#bd2b2b';
      context.font = '14px Microsoft YaHei';
      context.fillText(this.formatTime(), this.width / 2, controlY + 41);
    }

    const bottomSpace = 110;
    const boardSize = Math.min(this.width, 620, this.height - topbarHeight - bottomSpace);
    const boardX = (this.width - boardSize) / 2;
    const boardY = topbarHeight;
    const cellSize = boardSize / BOARD_SIZE;
    this.boardRect = { x: boardX, y: boardY, size: boardSize, cellSize };

    context.fillStyle = UI_COLORS.grid;
    context.fillRect(boardX, boardY, boardSize, boardSize);
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        const index = row * BOARD_SIZE + column;
        const x = boardX + column * cellSize;
        const y = boardY + row * cellSize;
        context.fillStyle = this.selected === index ? UI_COLORS.boardSelected : UI_COLORS.board;
        context.fillRect(x + 0.6, y + 0.6, cellSize - 1.2, cellSize - 1.2);
        if (this.board[index]) {
          this.drawBall(x + cellSize / 2, y + cellSize / 2, cellSize * 0.36, this.board[index], false);
        }
      }
    }

    const stripY = boardY + boardSize;
    context.fillStyle = UI_COLORS.background;
    context.fillRect(0, stripY, this.width, this.height - stripY);
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = '#0a7ff4';
    context.font = '700 22px Microsoft YaHei';
    context.fillText('下组颜色', Math.max(18, boardX + 18), stripY + 42);
    const ballsStart = Math.max(this.width * 0.48, boardX + boardSize * 0.5);
    this.nextBalls.forEach((color, index) => {
      this.drawBall(ballsStart + index * 48, stripY + 42, 19, color, false);
    });
    context.textAlign = 'center';
    context.fillStyle = 'rgba(255, 255, 255, .38)';
    context.font = '12px Microsoft YaHei';
    const note = this.mode === 'rush'
      ? `离线可玩 · 剩余 ${this.formatTime()}`
      : `离线可玩 · 棋盘 ${this.board.filter(Boolean).length}/${CELL_COUNT}`;
    context.fillText(note, this.width / 2, stripY + 82);

    if (this.status === 'gameover') this.drawGameOver();
  }

  drawTopButton(x, y, width, height, text, action, align) {
    const context = this.context;
    context.textAlign = align;
    context.textBaseline = 'middle';
    context.fillStyle = UI_COLORS.action;
    context.font = '20px Microsoft YaHei';
    context.fillText(text, align === 'left' ? x + 8 : x + width - 8, y + height / 2);
    this.addHotspot(`top-${text}`, x, y, width, height, action);
  }

  drawBall(x, y, radius, color, face) {
    const context = this.context;
    const stops = BALL_GRADIENTS[color] || BALL_GRADIENTS.red;
    const gradient = context.createLinearGradient(x, y - radius, x, y + radius);
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(0.66, stops[1]);
    gradient.addColorStop(1, stops[2]);
    context.save();
    context.shadowColor = 'rgba(18, 28, 33, .34)';
    context.shadowBlur = Math.max(2, radius * 0.16);
    context.shadowOffsetY = Math.max(1, radius * 0.08);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = Math.max(0.7, radius * 0.025);
    context.strokeStyle = 'rgba(20, 27, 30, .24)';
    context.stroke();
    context.restore();

    context.beginPath();
    context.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.2, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, .42)';
    context.fill();

    if (face) {
      context.fillStyle = '#172229';
      context.beginPath();
      context.ellipse(x - radius * 0.25, y, radius * 0.09, radius * 0.16, 0, 0, Math.PI * 2);
      context.ellipse(x + radius * 0.25, y, radius * 0.09, radius * 0.16, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawPanel() {
    const context = this.context;
    context.fillStyle = 'rgba(10, 22, 30, .72)';
    context.fillRect(0, 0, this.width, this.height);
    const width = Math.min(this.width - 36, 430);
    const height = this.panel === 'help' ? 330 : this.panel === 'modes' ? 260 : 230;
    const x = (this.width - width) / 2;
    const y = Math.max(this.safeTop + 24, (this.height - height) / 2);
    roundedRect(context, x, y, width, height, 18);
    context.fillStyle = '#f8f2df';
    context.fill();
    context.strokeStyle = 'rgba(125, 91, 47, .55)';
    context.stroke();

    const titles = { help: '怎么玩', scores: '本机积分榜', settings: '设置', modes: '更多玩法' };
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = UI_COLORS.text;
    context.font = '700 24px STKaiti';
    context.fillText(titles[this.panel], x + 24, y + 35);
    context.textAlign = 'center';
    context.fillStyle = '#47627a';
    context.font = '24px Microsoft YaHei';
    context.fillText('×', x + width - 30, y + 34);
    this.addHotspot('panel-close', x + width - 54, y + 8, 48, 48, () => {
      this.panel = null;
      this.render();
    });

    if (this.panel === 'help') this.drawHelpPanel(x, y, width);
    if (this.panel === 'scores') this.drawScoresPanel(x, y, width);
    if (this.panel === 'settings') this.drawSettingsPanel(x, y, width);
    if (this.panel === 'modes') this.drawModesPanel(x, y, width);
  }

  drawHelpPanel(x, y, width) {
    const lines = [
      ['1', '先点一颗彩球，再点可到达的空格。'],
      ['2', '未消除时，棋盘会出现下一批彩球。'],
      ['3', '横、竖或斜线连成至少 5 颗即可消除。'],
      ['+', '闪电模式倒计时，消除可以赢回时间。'],
    ];
    lines.forEach((item, index) => {
      const rowY = y + 80 + index * 55;
      this.context.fillStyle = index === 3 ? '#bd2b2b' : UI_COLORS.action;
      this.context.font = '700 18px Microsoft YaHei';
      this.context.textAlign = 'center';
      this.context.fillText(item[0], x + 36, rowY);
      this.context.fillStyle = '#344554';
      this.context.font = `${width < 360 ? 13 : 15}px Microsoft YaHei`;
      this.context.textAlign = 'left';
      this.context.fillText(item[1], x + 64, rowY);
    });
  }

  drawScoresPanel(x, y, width) {
    const rows = [
      ['经典模式', this.highScores.classic || 0, 'yellow'],
      ['闪电模式', this.highScores.rush || 0, 'cyan'],
    ];
    rows.forEach((item, index) => {
      const rowY = y + 92 + index * 62;
      this.drawBall(x + 42, rowY, 14, item[2], false);
      this.context.textAlign = 'left';
      this.context.fillStyle = '#344554';
      this.context.font = '17px Microsoft YaHei';
      this.context.fillText(item[0], x + 70, rowY);
      this.context.textAlign = 'right';
      this.context.font = '700 21px Microsoft YaHei';
      this.context.fillText(String(item[1]), x + width - 28, rowY);
    });
  }

  drawSettingsPanel(x, y, width) {
    const rows = [
      ['游戏声音', this.soundOn, () => { this.soundOn = !this.soundOn; }],
      ['触感反馈', this.vibrationOn, () => { this.vibrationOn = !this.vibrationOn; }],
    ];
    rows.forEach((item, index) => {
      const rowY = y + 92 + index * 64;
      this.context.textAlign = 'left';
      this.context.fillStyle = '#344554';
      this.context.font = '17px Microsoft YaHei';
      this.context.fillText(item[0], x + 28, rowY);
      const switchX = x + width - 80;
      const switchY = rowY - 16;
      roundedRect(this.context, switchX, switchY, 52, 32, 16);
      this.context.fillStyle = item[1] ? '#4e887e' : '#a9aaa5';
      this.context.fill();
      this.context.beginPath();
      this.context.arc(item[1] ? switchX + 36 : switchX + 16, rowY, 12, 0, Math.PI * 2);
      this.context.fillStyle = '#ffffff';
      this.context.fill();
      this.addHotspot(`setting-${index}`, x + width - 110, rowY - 25, 90, 50, () => {
        item[2]();
        this.saveSettings();
        if (index === 0) playSound('tap', this.soundOn);
        this.render();
      });
    });
  }

  drawModesPanel(x, y, width) {
    this.drawPanelButton(x + 24, y + 76, width - 48, 58, '经典模式', '标准 9×9 连珠玩法', () => this.startGame('classic'));
    this.drawPanelButton(x + 24, y + 148, width - 48, 58, '闪电模式', '2 分钟开局，消除赢回时间', () => this.startGame('rush'));
  }

  drawPanelButton(x, y, width, height, title, detail, action) {
    roundedRect(this.context, x, y, width, height, 12);
    this.context.fillStyle = '#ead9af';
    this.context.fill();
    this.context.textAlign = 'left';
    this.context.fillStyle = '#344554';
    this.context.font = '700 17px Microsoft YaHei';
    this.context.fillText(title, x + 18, y + 22);
    this.context.fillStyle = '#76684f';
    this.context.font = '12px Microsoft YaHei';
    this.context.fillText(detail, x + 18, y + 43);
    this.addHotspot(`mode-${title}`, x, y, width, height, action);
  }

  drawGameOver() {
    const context = this.context;
    const rect = this.boardRect;
    const width = Math.min(rect.size - 64, 360);
    const height = 280;
    const x = (this.width - width) / 2;
    const y = rect.y + (rect.size - height) / 2;
    roundedRect(context, x, y, width, height, 20);
    context.fillStyle = 'rgba(34, 54, 50, .97)';
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, .55)';
    context.stroke();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff3d6';
    context.font = '700 23px STKaiti';
    context.fillText('本局结束', this.width / 2, y + 42);
    context.font = '700 62px Microsoft YaHei';
    context.fillText(String(this.score), this.width / 2, y + 102);
    context.fillStyle = 'rgba(255, 255, 255, .72)';
    context.font = '14px Microsoft YaHei';
    context.fillText(`最高分 ${Math.max(this.highScores[this.mode] || 0, this.score)}`, this.width / 2, y + 143);
    this.drawPanelButton(x + 36, y + 166, width - 72, 46, '再来一局', this.mode === 'rush' ? '闪电模式' : '经典模式', () => this.startGame(this.mode));
    this.drawPanelButton(x + 36, y + 222, width - 72, 42, '返回主页', '保存本局成绩', () => this.returnToMenu());
  }

  drawToast() {
    const context = this.context;
    context.font = '15px Microsoft YaHei';
    const width = Math.min(this.width - 40, Math.max(170, context.measureText(this.toast).width + 42));
    const height = 42;
    const x = (this.width - width) / 2;
    const y = this.height - 72;
    roundedRect(context, x, y, width, height, 21);
    context.fillStyle = 'rgba(15, 30, 39, .92)';
    context.fill();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff5d7';
    context.fillText(this.toast, this.width / 2, y + height / 2);
  }

  formatTime() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = String(this.timeLeft % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
