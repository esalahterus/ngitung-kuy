/**
 * Ngitung Kuy - Min-Max Mode
 */
(function() {
  'use strict';

  const { MathEngine, BaseGame, InteractionHelper, TimerService } = window.NgitungKuy;

  const CARD_COUNT = 6;
  const BASE_SCORE = 100;
  const PERFECT_BONUS = 50;

  class MinMaxGame extends BaseGame {
    constructor(config = {}) {
      super('minMax', config);
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        cards: [],            // { id, expression, answer, slot: null | 0..5 }
        selectedCardId: null,
        violations: [],       // indexes of slots currently violating the order
        hadViolation: false,
        levelComplete: false,
        levelBonus: { time: 0, perfect: 0 },
        levelSeconds: 0,
        levelsCompleted: 0
      };
    }

    onStart() {
      this.generateLevel();
    }

    generateLevel() {
      const cards = [];
      const used = new Set();

      for (let i = 0; i < CARD_COUNT; i++) {
        let q;
        let attempts = 0;
        do {
          q = this.generateMathQuestion();
          attempts++;
        } while (used.has(q.answer) && attempts < 60);
        used.add(q.answer);
        cards.push({ id: `c${i}`, expression: q.expression.replace(' = ?', ''), answer: q.answer, slot: null });
      }

      this.setState({
        cards: MathEngine.shuffle(cards),
        selectedCardId: null,
        violations: [],
        hadViolation: false,
        levelComplete: false,
        levelBonus: { time: 0, perfect: 0 },
        levelSeconds: 0
      });

      this.levelStartedAt = Date.now();
      this.startCountUpTimer((ms) => {
        const el = document.getElementById('mm-timer');
        if (el) el.textContent = TimerService.formatMs(ms);
      });
    }

    // ---- State transitions -------------------------------------------------

    cardInSlot(slot) {
      return this.state.cards.find(c => c.slot === slot) || null;
    }

    placeCard(cardId, slot) {
      if (this.state.levelComplete) return;
      const cards = this.state.cards.map(c => ({ ...c }));
      const moving = cards.find(c => c.id === cardId);
      if (!moving) return;
      const occupant = cards.find(c => c.slot === slot && c.id !== cardId);
      if (occupant) occupant.slot = moving.slot; // swap, or back to source when moving.slot is null
      moving.slot = slot;
      this.setState({ cards, selectedCardId: null });
      this.validate();
    }

    returnCard(cardId) {
      if (this.state.levelComplete) return;
      const cards = this.state.cards.map(c => c.id === cardId ? { ...c, slot: null } : c);
      this.setState({ cards, selectedCardId: null });
      this.validate();
    }

    selectCard(cardId) {
      this.setState({ selectedCardId: this.state.selectedCardId === cardId ? null : cardId });
    }

    /** Same rule as SortActivity.checkResults: slot[i] must not exceed slot[i-1]. */
    validate() {
      const violations = [];
      for (let i = 1; i < CARD_COUNT; i++) {
        const prev = this.cardInSlot(i - 1);
        const cur = this.cardInSlot(i);
        if (prev && cur && cur.answer > prev.answer) {
          violations.push(i - 1, i);
        }
      }
      const unique = [...new Set(violations)];
      const filled = this.state.cards.every(c => c.slot !== null);

      if (unique.length > 0 && unique.some(i => !(this.state.violations || []).includes(i))) this.playSound('wrong');
      this.setState({
        violations: unique,
        hadViolation: this.state.hadViolation || unique.length > 0
      });

      if (filled && unique.length === 0) this.completeLevel();
    }

    completeLevel() {
      this.playSound('correct');
      this.cancelTimer();
      const seconds = Math.round((Date.now() - this.levelStartedAt) / 1000);
      const time = Math.max(0, Math.min(120, (60 - seconds) * 2));
      const perfect = this.state.hadViolation ? 0 : PERFECT_BONUS;
      const score = this.state.score + BASE_SCORE + time + perfect;

      this.setState({
        score,
        levelComplete: true,
        levelSeconds: seconds,
        levelBonus: { time, perfect },
        levelsCompleted: this.state.levelsCompleted + 1
      });
      this.saveBestScore(score);
    }

    nextLevel() {
      this.setState({ level: this.state.level + 1 });
      this.generateLevel();
      this.updateView();
    }

    // ---- Rendering ---------------------------------------------------------

    renderCard(card, extra = '') {
      const sel = this.state.selectedCardId === card.id ? 'selected' : '';
      return `<button type="button" class="mm-card ${sel} ${extra}" data-card="${card.id}">${card.expression}</button>`;
    }

    render() {
      const { cards, score, bestScore, level, violations, levelComplete, levelBonus, levelSeconds } = this.state;
      const source = cards.filter(c => c.slot === null);

      const result = levelComplete ? this.renderResult({
        icon: '🏆',
        title: this.t('games.minMax.play.levelComplete', 'Level {level} Selesai!', { level }),
        description: this.t('games.minMax.play.levelDesc', 'Urutan MAX → MIN tepat.'),
        score,
        stats: [
          { label: this.t('games.minMax.play.time', 'Waktu'), value: this.t('games.minMax.play.seconds', '{n} dtk', { n: levelSeconds }) },
          { label: this.t('games.minMax.play.timeBonus', 'Bonus waktu'), value: `+${levelBonus.time}` },
          { label: this.t('games.minMax.play.perfectBonus', 'Bonus sempurna'), value: `+${levelBonus.perfect}` },
          { label: this.t('game.record', 'Rekor'), value: bestScore }
        ],
        tone: 'success',
        continueLabel: this.t('games.minMax.play.nextLevel', 'Level Berikutnya')
      }) : '';

      return `
        <div class="min-max-game mm">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level}</span>
              <span class="pz-timer" id="mm-timer" aria-label="${this.t('games.minMax.play.time', 'Waktu')}">0:00</span>
            </div>
          </div>
          <p class="pz-hint">${this.t('games.minMax.play.hint', 'Urutkan dari hasil terbesar (atas) ke terkecil (bawah). Seret atau ketuk kartu, lalu ketuk slot.')}</p>
          <div class="mm-board">
            <div class="mm-source" data-pool="1" role="list" aria-label="${this.t('games.minMax.play.sourceCards', 'Kartu sumber')}">
              ${source.map(c => this.renderCard(c)).join('')}
            </div>
            <div class="mm-slots" role="list" aria-label="${this.t('games.minMax.play.orderLabel', 'Urutan MAX ke MIN')}">
              ${Array.from({ length: CARD_COUNT }, (_, i) => {
                const card = this.cardInSlot(i);
                const bad = violations.includes(i) ? 'bad' : '';
                const label = i === 0 ? 'MAX' : i === CARD_COUNT - 1 ? 'MIN' : '';
                return `<div class="mm-slot ${card ? 'filled' : ''} ${bad}" data-slot="${i}" role="listitem">
                  <span class="mm-slot-index">${label || i + 1}</span>
                  ${card ? this.renderCard(card, bad ? 'bad' : '') : ''}
                </div>`;
              }).join('')}
            </div>
          </div>
          ${result}
        </div>`;
    }

    bindEvents(container) {
      container.querySelectorAll('.mm-card').forEach(el => {
        InteractionHelper.makeDraggable(el, {
          clone: true,
          onDragStart: () => ({ cardId: el.dataset.card }),
          onDragEnd: (e, data, dropTarget) => {
            const slot = dropTarget?.closest('.mm-slot');
            if (slot) this.placeCard(data.cardId, parseInt(slot.dataset.slot, 10));
            else if (dropTarget?.closest('.mm-source')) this.returnCard(data.cardId);
            this.updateView();
          },
          onTap: () => {
            const card = this.state.cards.find(c => c.id === el.dataset.card);
            if (card && card.slot !== null) this.returnCard(card.id);
            else this.selectCard(el.dataset.card);
            this.updateView();
          }
        });
      });

      container.querySelectorAll('.mm-slot:not(.filled)').forEach(el => {
        el.addEventListener('click', () => {
          const id = this.state.selectedCardId;
          if (!id) return;
          this.placeCard(id, parseInt(el.dataset.slot, 10));
          this.updateView();
        });
      });

      this.bindResultActions(container, { continue: () => this.nextLevel() });
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.MinMax = MinMaxGame;

})();
