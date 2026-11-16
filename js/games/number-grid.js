/**
 * Ngitung Kuy - Number Grid (Number Match)
 */

(function() {
  'use strict';

  const { BaseGame, InteractionHelper } = window.NgitungKuy;

  class NumberGridGame extends BaseGame {
    constructor(config = {}) {
      super('numberGrid', config);
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        columns: 9,
        initRows: 3,
        maxAddCount: 5
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        grid: [],
        selectedCells: [],
        addCount: 5,
        hints: [],
        showHints: false
      };
    }

    onStart() {
      this.initGame();
    }

    initGame() {
      this.grid = [];
      this.state.addCount = this.config.maxAddCount;

      // Add initial rows
      for (let i = 0; i < this.config.initRows; i++) {
        this.addRow('simple');
      }

      this.setState({
        grid: this.grid,
        addCount: this.config.maxAddCount,
        hints: [],
        showHints: false
      });
    }

    addRow(type = 'simple') {
      const { columns } = this.config;
      const row = [];

      if (type === 'simple') {
        // Level 0: random 1-9
        for (let c = 0; c < columns; c++) {
          row.push({
            number: Math.floor(Math.random() * 9) + 1,
            type: 1, // normal
            i: this.grid.length,
            j: c
          });
        }
      } else {
        // Hard levels: constraint-based
        for (let c = 0; c < columns; c++) {
          const candidates = this.getValidCandidates(this.grid.length, c, row);
          const number = candidates[Math.floor(Math.random() * candidates.length)];
          row.push({
            number,
            type: 1,
            i: this.grid.length,
            j: c
          });
        }
      }

      this.grid.push(row);
    }

    getValidCandidates(row, col, currentRow = []) {
      const candidates = [];
      for (let n = 1; n <= 9; n++) {
        let valid = true;

        // Check above
        if (row > 0) {
          const above = this.grid[row - 1][col];
          if (above.type !== -1 && above.number === n) valid = false;
          if (above.type !== -1 && above.number + n === 10) valid = false;
        }

        // Check left
        if (col > 0) {
          const left = currentRow[col - 1]; // row under construction is not in this.grid yet
          if (left.type !== -1 && left.number === n) valid = false;
          if (left.type !== -1 && left.number + n === 10) valid = false;
        }

        // Check upper-left diagonal
        if (row > 0 && col > 0) {
          const ul = this.grid[row - 1][col - 1];
          if (ul.type !== -1 && ul.number === n) valid = false;
          if (ul.type !== -1 && ul.number + n === 10) valid = false;
        }

        // Check upper-right diagonal
        if (row > 0 && col < this.config.columns - 1) {
          const ur = this.grid[row - 1][col + 1];
          if (ur.type !== -1 && ur.number === n) valid = false;
          if (ur.type !== -1 && ur.number + n === 10) valid = false;
        }

        if (valid) candidates.push(n);
      }

      return candidates.length > 0 ? candidates : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    addNumbers() {
      if (this.state.addCount <= 0 || this.state.status !== 'playing') return;
      this.hideHints();
      this.addRow(this.state.level > 1 ? 'hard' : 'simple');
      this.setState({ grid: this.grid, addCount: this.state.addCount - 1 });
      if (this.state.addCount <= 0 && !this.checkGame()) this.handleGameOver();
      this.updateView();
    }

    handleCellClick(cell) {
      if (cell.type === -1 || this.state.status !== 'playing' || this.busy) return;
      if (this.state.showHints) this.hideHints();

      const selected = this.state.selectedCells;

      if (selected.length === 0) {
        // First selection
        cell.type = 2; // selected
        selected.push(cell);
      } else if (selected.length === 1) {
        if (selected[0] === cell) {
          // Deselect
          cell.type = 1;
          selected.length = 0;
        } else {
          // Second selection - check match
          cell.type = 2;
          selected.push(cell);

          if (this.checkMatch(selected[0], selected[1])) {
            // Valid match
            this.playSound('correct');
            this.handleMatch(selected[0], selected[1]);
          } else {
            // Invalid - reset after delay
            this.playSound('wrong');
            this.busy = true;
            this.schedule(() => {
              this.busy = false;
              selected[0].type = 1;
              selected[1].type = 1;
              selected.length = 0;
              this.updateView();
            }, 300);
          }
        }
      }
    }

    checkMatch(cell1, cell2) {
      if (cell1.type === -1 || cell2.type === -1) return false;
      if (cell1 === cell2) return false;

      const { i: i1, j: j1, number: n1 } = cell1;
      const { i: i2, j: j2, number: n2 } = cell2;

      // Check if same number OR sum to 10
      const isMatch = n1 === n2 || n1 + n2 === 10;
      if (!isMatch) return false;

      // Check path connectivity
      return this.hasValidPath(i1, j1, i2, j2);
    }

    hasValidPath(i1, j1, i2, j2) {
      // Same row - horizontal
      if (i1 === i2) {
        const start = Math.min(j1, j2) + 1;
        const end = Math.max(j1, j2);
        for (let j = start; j < end; j++) {
          if (this.grid[i1][j].type !== -1) return false;
        }
        return true;
      }

      // Same column - vertical
      if (j1 === j2) {
        const start = Math.min(i1, i2) + 1;
        const end = Math.max(i1, i2);
        for (let i = start; i < end; i++) {
          if (this.grid[i][j1].type !== -1) return false;
        }
        return true;
      }

      // Diagonal
      if (Math.abs(i1 - i2) === Math.abs(j1 - j2)) {
        const di = i2 > i1 ? 1 : -1;
        const dj = j2 > j1 ? 1 : -1;
        let ci = i1 + di, cj = j1 + dj;
        while (ci !== i2 && cj !== j2) {
          if (this.grid[ci][cj].type !== -1) return false;
          ci += di;
          cj += dj;
        }
        return true;
      }

      // End of line to start of next line (wrap)
      if (Math.abs(i1 - i2) === 1) {
        // Check if j1 is at end and j2 at start, or vice versa
        const cols = this.config.columns;
        if ((j1 === cols - 1 && j2 === 0) || (j1 === 0 && j2 === cols - 1)) {
          return true;
        }
      }

      return false;
    }

    handleMatch(cell1, cell2) {
      // Mark as cleared
      cell1.type = -1;
      cell2.type = -1;
      cell1.number = 0;
      cell2.number = 0;

      this.setState({
        score: this.state.score + 1,
        selectedCells: [],
        hints: []
      });

      this.saveBestScore(this.state.score + 1);

      // Check for cleared lines
      this.checkLines();

      // Check level complete
      const allCleared = this.grid.every(row => row.every(cell => cell.type === -1));
      if (allCleared) {
        this.levelComplete();
      } else if (!this.checkGame() && this.state.addCount <= 0) {
        this.handleGameOver();
      }
    }

    checkLines() {
      let cleared = false;
      for (let i = this.grid.length - 1; i >= 0; i--) {
        const row = this.grid[i];
        if (row.every(cell => cell.type === -1 || cell.number === 0)) {
          this.grid.splice(i, 1);
          cleared = true;
        }
      }

      if (cleared) {
        // Update row indices
        this.grid.forEach((row, i) => {
          row.forEach((cell, j) => {
            cell.i = i;
            cell.j = j;
          });
        });
        this.setState({ grid: [...this.grid] });
      }
    }

    checkGame() {
      // Check if any valid moves exist
      this.state.hints = [];

      for (let i = 0; i < this.grid.length; i++) {
        for (let j = 0; j < this.config.columns; j++) {
          const cell1 = this.grid[i][j];
          if (cell1.type === -1) continue;

          for (let i2 = i; i2 < this.grid.length; i2++) {
            const startJ = (i2 === i) ? j + 1 : 0;
            for (let j2 = startJ; j2 < this.config.columns; j2++) {
              const cell2 = this.grid[i2][j2];
              if (cell2.type === -1) continue;

              if (this.checkMatch(cell1, cell2)) {
                this.state.hints.push(cell1, cell2);
                return true;
              }
            }
          }
        }
      }

      return false;
    }

    levelComplete() {
      const level = this.state.level + 1;
      const bonus = this.state.addCount * 9;      // remaining adds x 9 (SPEC 6.11)
      const score = this.state.score + bonus;
      this.state.level = level;
      for (let i = 0; i < 3; i++) this.addRow(level > 1 ? 'hard' : 'simple'); // +3 rows
      this.setState({ level, score, addCount: this.config.maxAddCount, grid: this.grid, hints: [], selectedCells: [] });
      this.saveBestScore(score);
    }

    showHint() {
      if (this.state.status !== 'playing') return;
      this.hideHints();
      this.checkGame();
      if (this.state.hints.length > 0) {
        this.state.hints.forEach(h => { h.type = 3; });
        this.state.showHints = true;
      } else {
        const addBtn = document.querySelector('.add-numbers-btn');
        if (addBtn) {
          addBtn.classList.add('shake');
          this.schedule(() => addBtn.classList.remove('shake'), 1000);
        }
      }
      this.updateView();
    }

    hideHints() {
      (this.state.hints || []).forEach(h => { if (h.type === 3) h.type = 1; });
      this.state.hints = [];
      this.state.showHints = false;
    }

    handleGameOver() {
      this.setState({ gameOver: true });
      this.saveBestScore(this.state.score);
      this.gameOver(false);
    }

    render() {
      const { grid, addCount, score, bestScore, level, showHints } = this.state;

      return `
        <div class="number-grid-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level}</span>
            </div>
          </div>

          <div class="add-controls">
            <button type="button" class="btn btn-primary add-numbers-btn" data-act="add" ${this.state.addCount <= 0 ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              ${this.t('games.numberGrid.play.add', 'Tambah')} (${addCount})
            </button>
            <button type="button" class="btn btn-secondary" data-act="hint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="8"></line>
              </svg>
              ${this.t('games.numberGrid.play.hint', 'Hint')}
            </button>
          </div>

          <div class="game-grid number-grid cols-9" style="grid-template-columns: repeat(9, 1fr);">
            ${this.state.grid.map((row, i) => row.map((cell, j) => `
              <div class="grid-cell ${cell.type === -1 ? 'cleared' : ''}
                           ${cell.type === 2 ? 'selected' : ''}
                           ${cell.type === 3 ? 'hint' : ''}"
                   data-i="${i}" data-j="${j}"
                   style="grid-row: ${i + 1}; grid-column: ${j + 1};">
                ${cell.type === -1 ? '' : cell.number}
              </div>
            `).join('')).join('')}
          </div>

          ${this.state.gameOver ? this.renderResult({ icon: '💀', title: this.t('game.over', 'Game Over'), description: this.t('games.numberGrid.play.gameOverDesc', 'Tidak ada pasangan tersisa dan tombol Tambah habis.'), score, stats: [{ label: this.t('game.level', 'Level'), value: level }, { label: this.t('games.numberGrid.play.record', 'Rekor'), value: bestScore }], tone: 'error' }) : ''}
        </div>
      `;
    }

    bindEvents(container) {
      container.querySelectorAll('.grid-cell').forEach((el) => {
        const i = parseInt(el.dataset.i, 10);
        const j = parseInt(el.dataset.j, 10);
        const cellData = this.grid[i] && this.grid[i][j];
        if (!cellData) return;
        el.addEventListener('click', () => { this.handleCellClick(cellData); this.updateView(); });
      });
      container.querySelector('[data-act="add"]')?.addEventListener('click', () => this.addNumbers());
      container.querySelector('[data-act="hint"]')?.addEventListener('click', () => this.showHint());
      this.bindResultActions(container);
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.NumberGrid = NumberGridGame;

})();