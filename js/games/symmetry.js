/**
 * Ngitung Kuy - Mirror Symmetry (SymmetryActivity)
 */
(function() {
  'use strict';

  const { BaseGame, TimerService } = window.NgitungKuy;

  const LEVEL_TIME = 80;
  // half = columns per half (the board is half*2 wide)
  const LEVEL_CONFIGS = [
    { rows: 4, half: 3, cells: 4 }, { rows: 4, half: 3, cells: 6 },
    { rows: 5, half: 4, cells: 7 }, { rows: 5, half: 4, cells: 9 },
    { rows: 6, half: 4, cells: 11 }, { rows: 6, half: 4, cells: 13 },
    { rows: 7, half: 5, cells: 15 }, { rows: 7, half: 5, cells: 18 },
    { rows: 8, half: 5, cells: 21 }, { rows: 8, half: 6, cells: 24 }
  ];

  class SymmetryGame extends BaseGame {
    constructor(config = {}) {
      super('mirrorSymmetry', config);
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        leftPattern: [], rightGrid: [], rows: 0, half: 0,
        levelSize: 0, currentSize: 0, timer: LEVEL_TIME,
        error: false, levelDone: false, levelsCleared: 0, timedOut: false
      };
    }

    getLevelConfigs() { return LEVEL_CONFIGS; }

    onStart() { this.initLevel(); }

    initLevel() {
      const cfg = LEVEL_CONFIGS[Math.min(this.state.level, LEVEL_CONFIGS.length) - 1];
      const { rows, half } = cfg;
      const cells = Math.min(cfg.cells, rows * half);
      const idx = Array.from({ length: rows * half }, (_, i) => i);
      const filled = new Set();
      while (filled.size < cells) filled.add(idx.splice(Math.floor(Math.random() * idx.length), 1)[0]);

      const leftPattern = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: half }, (_, c) => (filled.has(r * half + c) ? 1 : 0)));
      const rightGrid = Array.from({ length: rows }, () => Array(half).fill(0)); // 0 empty,2 ok,3 wrong

      this.setState({ leftPattern, rightGrid, rows, half, levelSize: cells, currentSize: 0,
        timer: LEVEL_TIME, error: false, levelDone: false });
      this.updateView();

      this.startCountdownTimer(LEVEL_TIME * 1000, (ms) => this.paintTimer(Math.ceil(ms / 1000)), () => this.handleTimeUp());
    }

    paintTimer(secs) {
      const fill = document.querySelector('.symmetry-game .timer-bar-fill');
      const text = document.querySelector('.symmetry-game .game-timer');
      if (fill) { fill.style.width = `${(secs / LEVEL_TIME) * 100}%`; fill.className = `timer-bar-fill ${secs <= 5 ? 'danger' : secs <= 15 ? 'warning' : ''}`; }
      if (text) { text.textContent = `${secs}s`; text.className = `game-timer ${secs <= 5 ? 'danger' : ''}`; }
    }

    handleTimeUp() {
      this.setState({ timedOut: true });
      this.gameOver(false);
    }

    handleCellClick(r, c) {
      const s = this.state;
      if (s.levelDone || s.status !== 'playing' || s.rightGrid[r][c] !== 0) return;

      const mirrorC = s.half - 1 - c;
      const ok = s.leftPattern[r][mirrorC] === 1;
      const rightGrid = s.rightGrid.map(row => [...row]);
      rightGrid[r][c] = ok ? 2 : 3;
      this.playSound(ok ? 'correct' : 'wrong');
      const currentSize = s.currentSize + (ok ? 1 : 0);
      this.setState({ rightGrid, currentSize, error: s.error || !ok });

      if (ok && currentSize === s.levelSize) this.completeLevel();
      this.updateView();
    }

    completeLevel() {
      this.cancelTimer();
      const bonus = this.state.error ? 0 : this.state.level;
      const score = this.state.score + bonus;
      this.setState({ score, levelDone: true, levelsCleared: this.state.levelsCleared + 1 });
      this.saveBestScore(score);

      this.schedule(() => {
        if (this.state.level >= LEVEL_CONFIGS.length) { this.gameOver(true); return; }
        this.setState({ level: this.state.level + 1 });
        this.initLevel();
      }, 900);
    }

    render() {
      const { leftPattern, rightGrid, timer, score, bestScore, level, rows, half, status, levelsCleared, timedOut } = this.state;

      let result = '';
      if (status === 'gameover' || status === 'won') {
        const won = status === 'won';
        result = this.renderResult({
          icon: won ? '🏆' : '⏱️',
          title: won ? this.t('games.mirrorSymmetry.play.allDone', 'Semua Level Selesai!') : timedOut ? this.t('game.timeUp', 'Waktu Habis!') : this.t('game.over', 'Game Over'),
          description: this.t('games.mirrorSymmetry.play.reachedLevel', 'Kamu mencapai level {level}.', { level }),
          score,
          stats: [{ label: this.t('games.mirrorSymmetry.play.levelsCleared', 'Level selesai'), value: levelsCleared }, { label: this.t('games.mirrorSymmetry.play.record', 'Rekor'), value: bestScore }],
          tone: won ? 'success' : 'error'
        });
      }

      const grid = (cells, cls) => cells.map((row, r) => row.map((cell, c) => {
        const state = cls === 'pattern' ? (cell ? 'filled' : '') : (cell === 2 ? 'correct' : cell === 3 ? 'incorrect' : '');
        const mark = cls === 'target' ? (cell === 2 ? '✓' : cell === 3 ? '✗' : '') : '';
        return cls === 'pattern'
          ? `<div class="symmetry-cell pattern ${state}"></div>`
          : `<button type="button" class="symmetry-cell target ${state}" data-r="${r}" data-c="${c}" aria-label="${this.t('games.mirrorSymmetry.play.cellLabel', 'Baris {row} kolom {col}', { row: r + 1, col: c + 1 })}">${mark}</button>`;
      }).join('')).join('');

      return `
        <div class="symmetry-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level}</span>
              <span class="game-timer ${timer <= 5 ? 'danger' : ''}">${timer}s</span>
            </div>
            <div class="timer-bar"><div class="timer-bar-fill ${timer <= 5 ? 'danger' : timer <= 15 ? 'warning' : ''}" style="width:${(timer / LEVEL_TIME) * 100}%"></div></div>
          </div>
          <div class="symmetry-container">
            <div class="symmetry-half">
              <div class="half-label">${this.t('games.mirrorSymmetry.play.patternLeft', 'Pola (Kiri)')}</div>
              <div class="symmetry-grid" style="grid-template-columns: repeat(${half}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">${grid(leftPattern, 'pattern')}</div>
            </div>
            <div class="symmetry-divider"></div>
            <div class="symmetry-half">
              <div class="half-label">${this.t('games.mirrorSymmetry.play.mirrorRight', 'Cermin (Kanan)')}</div>
              <div class="symmetry-grid" style="grid-template-columns: repeat(${half}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">${grid(rightGrid, 'target')}</div>
            </div>
          </div>
          <p class="pz-hint">${this.t('games.mirrorSymmetry.play.hint', 'Ketuk kotak di kanan yang merupakan cermin dari kotak terisi di kiri.')}</p>
          ${result}
        </div>`;
    }

    bindEvents(container) {
      container.querySelectorAll('.symmetry-cell.target').forEach(el =>
        el.addEventListener('click', () => this.handleCellClick(+el.dataset.r, +el.dataset.c)));
      this.bindResultActions(container);
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.Symmetry = SymmetryGame;
})();
