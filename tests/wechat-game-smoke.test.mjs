import assert from 'node:assert/strict';
import test from 'node:test';

function createContext() {
  const gradient = { addColorStop() {} };
  return {
    arc() {},
    beginPath() {},
    clearRect() {},
    closePath() {},
    createLinearGradient() { return gradient; },
    ellipse() {},
    fill() {},
    fillRect() {},
    fillText() {},
    lineTo() {},
    measureText(text) { return { width: String(text).length * 8 }; },
    moveTo() {},
    quadraticCurveTo() {},
    restore() {},
    rotate() {},
    save() {},
    setTransform() {},
    stroke() {},
    translate() {},
  };
}

test('wechat game renders menu and an equal 9 by 9 game board', async () => {
  const storage = new Map();
  let touchHandler = null;
  globalThis.wx = {
    getWindowInfo() {
      return {
        windowWidth: 390,
        windowHeight: 844,
        pixelRatio: 3,
        safeArea: { top: 47 },
      };
    },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    onTouchEnd(handler) { touchHandler = handler; },
    onWindowResize() {},
    vibrateShort() {},
  };

  const { ColorMiniLinesGame } = await import('../wechat-game/src/game-app.js');
  const context = createContext();
  const canvas = { width: 0, height: 0, getContext() { return context; } };
  const game = new ColorMiniLinesGame(canvas);

  assert.equal(game.screen, 'menu');
  assert.equal(typeof touchHandler, 'function');
  assert.ok(game.hotspots.length >= 6);

  game.startGame('classic');
  assert.equal(game.screen, 'game');
  assert.equal(game.board.length, 81);
  assert.equal(game.board.filter(Boolean).length, 5);
  assert.equal(game.boardRect.cellSize * 9, game.boardRect.size);
  assert.ok(storage.size >= 1);

  game.finishGame();
  game.render();
  assert.equal(game.status, 'gameover');
  game.stopTimer();

  delete globalThis.wx;
});
