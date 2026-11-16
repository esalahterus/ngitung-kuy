/**
 * Ngitung Kuy - Puzzle Mode
 */
(function() {
  'use strict';

  const { MathEngine, BaseGame, InteractionHelper } = window.NgitungKuy;

  const EQUATIONS_PER_LEVEL = 5;
  const POINTS_PER_EQUATION = 15;
  const PENALTY_PER_WRONG = 5;
  const SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };

  function compute(op, a, b) {
    switch (op) {
      case 'addition': return a + b;
      case 'subtraction': return a - b;
      case 'multiplication': return a * b;
      case 'division': return b !== 0 && a % b === 0 ? a / b : NaN;
      default: return NaN;
    }
  }

  class PuzzleGame extends BaseGame {
    constructor(config = {}) {
      super('puzzle', config);
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        equations: [],
        tiles: [],
        selectedTileId: null,
        levelComplete: false,
        levelsCompleted: 0,
        totalWrong: 0,
        levelBonus: 0,
        levelSeconds: 0
      };
    }

    onStart() {
      this.generateLevel();
    }

    generateLevel() {
      const equations = [];
      const tiles = [];
      const usedResults = new Set();

      for (let i = 0; i < EQUATIONS_PER_LEVEL; i++) {
        let q;
        let attempts = 0;
        do {
          q = this.generateMathQuestion();
          attempts++;
        } while (usedResults.has(q.answer) && attempts < 40);
        usedResults.add(q.answer);

        equations.push({ id: i, op: q.type, result: q.answer, wrong: 0, status: 'idle', locked: false, awarded: 0 });
        tiles.push({ id: `t${i}a`, value: q.a, eq: null, slot: null });
        tiles.push({ id: `t${i}b`, value: q.b, eq: null, slot: null });
      }

      this.setState({
        equations,
        tiles: MathEngine.shuffle(tiles),
        selectedTileId: null,
        levelComplete: false,
        levelBonus: 0,
        levelSeconds: 0,
        totalWrong: 0
      });

      this.levelStartedAt = Date.now();
      this.startCountUpTimer((elapsedMs) => {
        const el = document.getElementById('pz-timer');
        if (el) el.textContent = window.NgitungKuy.TimerService.formatMs(elapsedMs);
      });
    }

    // ---- State transitions -------------------------------------------------

    tileAt(eqIndex, slot) {
      return this.state.tiles.find(t => t.eq === eqIndex && t.slot === slot) || null;
    }

    canMoveTile(tile) {
      if (!tile) return false;
      if (tile.eq === null) return true;
      return !this.state.equations[tile.eq].locked;
    }

    placeTile(tileId, eqIndex, slot) {
      if (this.state.levelComplete) return;
      const eq = this.state.equations[eqIndex];
      const tile = this.state.tiles.find(t => t.id === tileId);
      if (!eq || eq.locked || !this.canMoveTile(tile)) return;

      const fromEq = tile.eq;
      const tiles = this.state.tiles.map(t => ({ ...t }));
      const moving = tiles.find(t => t.id === tileId);
      const occupant = tiles.find(t => t.eq === eqIndex && t.slot === slot && t.id !== tileId);

      // Occupant swaps into the dragged tile's old place (or back to the pool)
      if (occupant) {
        occupant.eq = moving.eq;
        occupant.slot = moving.slot;
      }
      moving.eq = eqIndex;
      moving.slot = slot;

      const equations = this.state.equations.map(e => ({ ...e }));
      [fromEq, eqIndex].forEach(i => { if (i !== null && equations[i] && !equations[i].locked) equations[i].status = 'idle'; });

      this.setState({ tiles, equations, selectedTileId: null });
      [fromEq, eqIndex].forEach(i => { if (i !== null) this.evaluateEquation(i); });
    }

    returnTile(tileId) {
      const tile = this.state.tiles.find(t => t.id === tileId);
      if (!tile || tile.eq === null || !this.canMoveTile(tile)) return;
      const eqIndex = tile.eq;
      const tiles = this.state.tiles.map(t => t.id === tileId ? { ...t, eq: null, slot: null } : t);
      const equations = this.state.equations.map((e, i) => i === eqIndex ? { ...e, status: 'idle' } : e);
      this.setState({ tiles, equations, selectedTileId: null });
    }

    selectTile(tileId) {
      this.setState({ selectedTileId: this.state.selectedTileId === tileId ? null : tileId });
    }

    evaluateEquation(eqIndex) {
      const eq = this.state.equations[eqIndex];
      if (!eq || eq.locked) return;
      const a = this.tileAt(eqIndex, 0);
      const b = this.tileAt(eqIndex, 1);
      if (!a || !b) return;

      const ok = compute(eq.op, a.value, b.value) === eq.result;
      const equations = this.state.equations.map(e => ({ ...e }));
      const target = equations[eqIndex];

      if (ok) {
        target.locked = true;
        target.status = 'ok';
        target.awarded = Math.max(0, POINTS_PER_EQUATION - PENALTY_PER_WRONG * target.wrong);
        const score = this.state.score + target.awarded;
        this.playSound('correct');
        this.setState({ equations, score });
        this.saveBestScore(score);
        if (equations.every(e => e.locked)) this.completeLevel();
      } else {
        target.wrong += 1;
        target.status = 'bad';
        this.playSound('wrong');
        this.setState({ equations, totalWrong: this.state.totalWrong + 1 });
      }
    }

    completeLevel() {
      this.cancelTimer();
      const seconds = Math.round((Date.now() - this.levelStartedAt) / 1000);
      const bonus = seconds < 30 ? 100 : seconds < 60 ? 50 : 0;
      const score = this.state.score + bonus;
      this.setState({
        score,
        levelComplete: true,
        levelBonus: bonus,
        levelSeconds: seconds,
        levelsCompleted: this.state.levelsCompleted + 1
      });
      this.saveBestScore(score);
      this.schedule(() => this.updateView(), 350); // let the green state show first
      this.updateView();
    }

    nextLevel() {
      this.setState({ level: this.state.level + 1 });
      this.generateLevel();
      this.updateView();
    }

    // ---- Rendering ---------------------------------------------------------

    renderTile(tile, extra = '') {
      const sel = this.state.selectedTileId === tile.id ? 'selected' : '';
      return `<button type="button" class="pz-tile ${sel} ${extra}" data-tile="${tile.id}" aria-label="${this.t('games.puzzle.play.tileLabel', 'Angka {n}', { n: tile.value })}">${tile.value}</button>`;
    }

    renderSlot(eqIndex, slot, eq) {
      const tile = this.tileAt(eqIndex, slot);
      const cls = ['pz-slot', tile ? 'filled' : '', eq.status].join(' ');
      return `<div class="${cls}" data-eq="${eqIndex}" data-slot="${slot}" role="button" tabindex="0" aria-label="${this.t('games.puzzle.play.slotLabel', 'Kotak {slot} persamaan {eq}', { slot: slot + 1, eq: eqIndex + 1 })}">${tile ? this.renderTile(tile, eq.locked ? 'locked' : '') : ''}</div>`;
    }

    render() {
      const { equations, tiles, score, bestScore, level, levelComplete, totalWrong, levelBonus, levelSeconds } = this.state;
      const pool = tiles.filter(t => t.eq === null);

      const result = levelComplete ? this.renderResult({
        icon: '🏆',
        title: this.t('games.puzzle.play.levelComplete', 'Level {level} Selesai!', { level }),
        description: this.t('games.puzzle.play.levelDesc', 'Semua persamaan berhasil disusun.'),
        score,
        stats: [
          { label: this.t('games.puzzle.play.time', 'Waktu'), value: this.t('games.puzzle.play.seconds', '{n} dtk', { n: levelSeconds }) },
          { label: this.t('games.puzzle.play.timeBonus', 'Bonus waktu'), value: `+${levelBonus}` },
          { label: this.t('games.puzzle.play.wrongAttempts', 'Percobaan salah'), value: totalWrong },
          { label: this.t('game.record', 'Rekor'), value: bestScore }
        ],
        tone: 'success',
        continueLabel: this.t('games.puzzle.play.nextLevel', 'Level Berikutnya')
      }) : '';

      return `
        <div class="puzzle-game pz">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level}</span>
              <span class="pz-timer" id="pz-timer" aria-label="${this.t('games.puzzle.play.time', 'Waktu')}">0:00</span>
            </div>
          </div>
          <p class="pz-hint">${this.t('games.puzzle.play.hint', 'Seret atau ketuk angka, lalu ketuk kotak kosong. Ketuk angka di kotak untuk mengembalikan.')}</p>
          <div class="pz-equations">
            ${equations.map((eq, i) => `
              <div class="pz-row ${eq.status}" data-row="${i}">
                ${this.renderSlot(i, 0, eq)}
                <span class="pz-op">${SYMBOL[eq.op]}</span>
                ${this.renderSlot(i, 1, eq)}
                <span class="pz-op">=</span>
                <span class="pz-result">${eq.result}</span>
              </div>`).join('')}
          </div>
          <div class="pz-pool" data-pool="1" role="list" aria-label="${this.t('games.puzzle.play.pool', 'Bank angka')}">
            ${pool.map(t => this.renderTile(t)).join('')}
          </div>
          ${result}
        </div>`;
    }

    bindEvents(container) {
      const byId = (id) => this.state.tiles.find(t => t.id === id);

      container.querySelectorAll('.pz-tile:not(.locked)').forEach(el => {
        InteractionHelper.makeDraggable(el, {
          clone: true,
          onDragStart: () => ({ tileId: el.dataset.tile }),
          onDragEnd: (e, data, dropTarget) => {
            const slot = dropTarget?.closest('.pz-slot');
            if (slot) {
              this.placeTile(data.tileId, parseInt(slot.dataset.eq, 10), parseInt(slot.dataset.slot, 10));
            } else if (dropTarget?.closest('.pz-pool')) {
              this.returnTile(data.tileId);
            }
            this.updateView();
          },
          onTap: () => {
            const tile = byId(el.dataset.tile);
            if (tile && tile.eq !== null) this.returnTile(tile.id);
            else this.selectTile(el.dataset.tile);
            this.updateView();
          }
        });
      });

      // Tap an empty slot to drop the selected tile
      container.querySelectorAll('.pz-slot:not(.filled)').forEach(el => {
        const handler = () => {
          const id = this.state.selectedTileId;
          if (!id) return;
          this.placeTile(id, parseInt(el.dataset.eq, 10), parseInt(el.dataset.slot, 10));
          this.updateView();
        };
        el.addEventListener('click', handler);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
      });

      this.bindResultActions(container, { continue: () => this.nextLevel() });
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.Puzzle = PuzzleGame;

})();
