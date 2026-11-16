/**
 * Ngitung Kuy - Number Puzzle (15 Puzzle)
 */

(function() {
  'use strict';

  const { BaseGame, InteractionHelper } = window.NgitungKuy;

  // Predefined levels from original Game15Activity
  const LEVEL_CONFIGS = [
    { level: 1, rows: 4, cols: 4, blocked: [] },
    { level: 2, rows: 8, cols: 2, blocked: [] },
    { level: 3, rows: 5, cols: 4, blocked: [2, 3, 16, 17] },
    { level: 4, rows: 4, cols: 5, blocked: [0, 4, 15, 19] },
    { level: 5, rows: 4, cols: 6, blocked: [4, 5, 10, 11, 12, 13, 18, 19] },
    { level: 6, rows: 6, cols: 4, blocked: [2, 3, 6, 7, 18, 19, 22, 23] },
    { level: 7, rows: 5, cols: 5, blocked: [12, 13, 14, 17, 18, 19, 22, 23, 24] },
    { level: 8, rows: 3, cols: 6, blocked: [14, 15] },
    { level: 9, rows: 4, cols: 5, blocked: [10, 14, 15, 19] },
    { level: 10, rows: 5, cols: 4, blocked: [2, 3, 7, 16] },
    { level: 11, rows: 5, cols: 5, blocked: [2, 3, 4, 8, 9, 14, 15, 20, 21] },
    { level: 12, rows: 5, cols: 5, blocked: [0, 3, 4, 8, 9, 15, 20, 21, 24] },
    { level: 13, rows: 5, cols: 4, blocked: [5, 15, 18, 19] },
    { level: 14, rows: 4, cols: 5, blocked: [7, 17, 18, 19] },
    { level: 15, rows: 5, cols: 4, blocked: [0, 6, 13, 19] }
  ];

  class NumberPuzzleGame extends BaseGame {
    constructor(config = {}) {
      super('numberPuzzle', config);
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        currentLevel: 1
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        grid: [],
        emptyPos: { r: 0, c: 0 },
        moves: 0,
        isSolved: false,
        optimalMoves: 0,
        startTime: null
      };
    }

    getLevelConfigs() {
      return LEVEL_CONFIGS.map((lc, i) => ({
        level: i + 1,
        rows: lc.rows,
        cols: lc.cols,
        blocked: lc.blocked,
        optimalMoves: this.calculateOptimalMoves(lc.rows * lc.cols - 1 - lc.blocked.length)
      }));
    }

    calculateOptimalMoves(tileCount) {
      // Rough estimation for 15-puzzle: avg ~50-100 moves depending on shuffle
      return Math.max(50, tileCount * 3);
    }

    onStart() {
      this.initLevel(this.config.currentLevel);
    }

    initLevel(levelNum) {
      const config = LEVEL_CONFIGS[levelNum - 1] || LEVEL_CONFIGS[0];
      const { rows, cols, blocked } = config;

      this.state.rows = rows;
      this.state.cols = cols;
      this.state.level = levelNum;

      // Build initial solved grid (1..15, blocked = -1, empty = 0)
      this.grid = [];
      let valCounter = 1;
      let emptyPos = { r: 0, c: 0 };

      for (let r = 0; r < rows; r++) {
        this.grid[r] = [];
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (blocked.includes(idx)) {
            this.grid[r][c] = { type: 'blocked', value: null };
          } else if (valCounter === 16) {
            this.grid[r][c] = { type: 'empty', value: null };
            emptyPos = { r, c };
          } else {
            this.grid[r][c] = { type: 'tile', value: valCounter };
            valCounter++;
          }
        }
      }

      this.state.emptyPos = emptyPos;

      // Valid sliding moves shuffle (guarantees solvability!)
      this.shuffleGrid(emptyPos, rows, cols);

      this.setState({
        grid: this.grid,
        rows,
        cols,
        moves: 0,
        isSolved: false,
        startTime: Date.now(),
        optimalMoves: this.calculateOptimalMoves(15)
      });
    }

    shuffleGrid(emptyPos, rows, cols) {
      const shuffleSteps = 150;
      let er = emptyPos.r;
      let ec = emptyPos.c;

      for (let step = 0; step < shuffleSteps; step++) {
        const directions = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 }
        ];
        const validNeighbors = [];
        for (const { dr, dc } of directions) {
          const nr = er + dr;
          const nc = ec + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && this.grid[nr][nc].type === 'tile') {
            validNeighbors.push({ r: nr, c: nc });
          }
        }
        if (validNeighbors.length > 0) {
          const chosen = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
          this.grid[er][ec] = this.grid[chosen.r][chosen.c];
          this.grid[chosen.r][chosen.c] = { type: 'empty', value: null };
          er = chosen.r;
          ec = chosen.c;
        }
      }
      this.state.emptyPos = { r: er, c: ec };
    }

    handleTileClick(r, c) {
      if (this.state.isSolved) return;

      const tile = this.grid[r][c];
      if (!tile || tile.type !== 'tile') return;

      // Check if adjacent to empty
      const { r: er, c: ec } = this.state.emptyPos;
      const isAdjacent = (Math.abs(r - er) === 1 && c === ec) ||
                         (Math.abs(c - ec) === 1 && r === er);

      if (!isAdjacent) return;

      // Swap
      this.grid[er][ec] = this.grid[r][c];
      this.grid[r][c] = { type: 'empty', value: null };
      this.state.emptyPos = { r, c };
      this.state.moves++;

      this.setState({
        grid: [...this.grid.map(row => [...row])],
        moves: this.state.moves,
        emptyPos: { r, c }
      });

      // Check win
      if (this.checkSolved()) {
        this.handleWin();
      }
    }

    checkSolved() {
      let expected = 1;
      for (let r = 0; r < this.state.rows; r++) {
        for (let c = 0; c < this.state.cols; c++) {
          const tile = this.grid[r][c];
          if (tile.type !== 'blocked' && expected < 16) {
            if (tile.type !== 'tile' || tile.value !== expected) return false;
            expected++;
          }
        }
      }
      return true;
    }

    handleWin() {
      this.playSound('correct');
      const timeTaken = Math.floor((Date.now() - this.state.startTime) / 1000);
      const bonus = Math.max(0, this.state.optimalMoves - this.state.moves) * 10;
      const timeBonus = Math.max(0, 300 - timeTaken);
      const gained = 1000 + bonus + timeBonus;
      const newScore = this.state.score + gained;
      this.setState({ score: newScore, isSolved: true, lastGain: gained, lastSeconds: timeTaken });
      this.saveBestScore(newScore);
    }

    restartLevel() {
      this.initLevel(this.config.currentLevel);
      this.updateView();
    }

    nextLevel() {
      if (this.config.currentLevel < 15) {
        this.config.currentLevel++;
        this.initLevel(this.config.currentLevel);
        this.updateView();
      }
    }

    prevLevel() {
      if (this.config.currentLevel > 1) {
        this.config.currentLevel--;
        this.initLevel(this.config.currentLevel);
        this.updateView();
      }
    }

    render() {
      const { grid, moves, rows, cols, isSolved, optimalMoves, score, bestScore, level, lastGain, lastSeconds } = this.state;
      const cur = this.config.currentLevel;

      const result = isSolved ? this.renderResult({
        icon: '🎉', title: this.t('games.numberPuzzle.play.levelDone', 'Level {level} Selesai!', { level }), score, tone: 'success',
        stats: [
          { label: this.t('games.numberPuzzle.play.moves', 'Gerakan'), value: moves },
          { label: this.t('games.numberPuzzle.play.time', 'Waktu'), value: this.t('games.numberPuzzle.play.seconds', '{n} dtk', { n: lastSeconds }) },
          { label: this.t('games.numberPuzzle.play.levelScore', 'Skor level'), value: `+${lastGain}` },
          { label: this.t('games.numberPuzzle.play.record', 'Rekor'), value: bestScore }
        ],
        continueLabel: cur < LEVEL_CONFIGS.length ? this.t('games.numberPuzzle.play.nextLevel', 'Level Berikutnya') : null
      }) : '';

      return `
        <div class="number-puzzle-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('games.numberPuzzle.play.levelOf', 'Level: {n} / {max}', { n: level, max: LEVEL_CONFIGS.length })}</span>
              <span>${this.t('games.numberPuzzle.play.moves', 'Gerakan')}: <span class="game-score-value">${moves}</span></span>
              <span>${this.t('game.score', 'Skor')}: ${score}</span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
            </div>
          </div>
          <div class="puzzle-grid" style="grid-template-rows: repeat(${rows}, 1fr); grid-template-columns: repeat(${cols}, 1fr);">
            ${grid.map((row, r) => row.map((tile, c) => `
              <div class="grid-cell ${tile.type === 'empty' ? 'empty' : ''} ${tile.type === 'blocked' ? 'blocked' : ''}"
                   data-r="${r}" data-c="${c}" role="button" aria-label="${tile.type === 'tile' ? this.t('games.numberPuzzle.play.tile', 'Ubin {n}', { n: tile.value }) : tile.type === 'empty' ? this.t('games.numberPuzzle.play.empty', 'Kosong') : this.t('games.numberPuzzle.play.blocked', 'Terblokir')}"
                   style="grid-row:${r + 1};grid-column:${c + 1};">${tile.type === 'tile' ? tile.value : ''}</div>`).join('')).join('')}
          </div>
          <div class="puzzle-controls">
            <button type="button" class="btn btn-secondary" data-act="restart">${this.t('games.numberPuzzle.play.shuffle', 'Acak Ulang')}</button>
            <button type="button" class="btn btn-secondary" data-act="prev" ${cur <= 1 ? 'disabled' : ''}>${this.t('games.numberPuzzle.play.prev', 'Sebelumnya')}</button>
            <button type="button" class="btn btn-secondary" data-act="next" ${cur >= LEVEL_CONFIGS.length ? 'disabled' : ''}>${this.t('games.numberPuzzle.play.next', 'Berikutnya')}</button>
          </div>
          ${result}
        </div>`;
    }

    bindEvents(container) {
      container.querySelectorAll('.grid-cell').forEach(el =>
        el.addEventListener('click', () => { this.handleTileClick(+el.dataset.r, +el.dataset.c); this.updateView(); }));
      const act = { restart: () => this.restartLevel(), prev: () => this.prevLevel(), next: () => this.nextLevel() };
      container.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act[b.dataset.act]()));
      this.bindResultActions(container, { continue: () => this.nextLevel() });
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.NumberPuzzle = NumberPuzzleGame;

})();