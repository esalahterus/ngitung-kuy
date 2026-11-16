/**
 * Ngitung Kuy - True/False Mode
 */
(function() {
  'use strict';

  const { MathEngine, BaseGame, TimerService } = window.NgitungKuy;

  const TIERS = [
    { from: 1,  timer: 30, points: 20, operations: ['addition', 'subtraction'] },
    { from: 4,  timer: 25, points: 25, operations: ['addition', 'subtraction'] },
    { from: 7,  timer: 20, points: 30, operations: ['addition', 'subtraction', 'multiplication'] },
    { from: 10, timer: 15, points: 40, operations: ['addition', 'subtraction', 'multiplication', 'division'] }
  ];
  const MAX_LEVEL = 10;
  const FEEDBACK_MS = 900;

  function tierFor(level) {
    let tier = TIERS[0];
    for (const t of TIERS) if (level >= t.from) tier = t;
    return tier;
  }

  class TrueFalseGame extends BaseGame {
    constructor(config = {}) {
      super('trueFalse', config);
      this.questionHistory = [];
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        statement: '',
        correctAnswer: null,
        timer: TIERS[0].timer,
        feedback: null,   // 'correct' | 'incorrect' | 'timeout' | null
        answered: false,
        correctCount: 0
      };
    }

    getLevelConfigs() { return TIERS; }

    onStart() {
      this.questionHistory = [];
      this.nextQuestion();
    }

    nextQuestion() {
      const tier = tierFor(this.state.level);
      let statement = '';
      let isTrue = true;

      for (let i = 0; i < 20; i++) {
        const op = tier.operations[Math.floor(Math.random() * tier.operations.length)];
        const q = this.generateMathQuestion(op);
        isTrue = Math.random() < 0.5;
        const shown = isTrue ? q.answer : this.wrongValue(q.answer);
        statement = `${q.expression.replace('= ?', '')}= ${shown}`;
        if (!this.questionHistory.includes(statement)) break;
      }
      this.questionHistory.push(statement);
      if (this.questionHistory.length > 10) this.questionHistory.shift();

      this.setState({ statement, correctAnswer: isTrue, timer: tier.timer, feedback: null, answered: false });
      this.updateView();

      this.startCountdownTimer(tier.timer * 1000, (remaining) => {
        this.paintTimer(Math.ceil(remaining / 1000), tier.timer);
      }, () => this.handleTimeout());
    }

    /** A plausible wrong value that is never equal to the correct one. */
    wrongValue(correct) {
      const { options } = MathEngine.generateOptions(correct, 4);
      const wrong = options.filter(v => v !== correct);
      return wrong[Math.floor(Math.random() * wrong.length)];
    }

    paintTimer(secs, max) {
      const fill = document.querySelector('.true-false-game .timer-bar-fill');
      const text = document.querySelector('.true-false-game .game-timer');
      const cls = secs <= 5 ? 'danger' : secs <= 10 ? 'warning' : '';
      if (fill) { fill.style.width = `${(secs / max) * 100}%`; fill.className = `timer-bar-fill ${cls}`; }
      if (text) { text.textContent = `${secs}s`; text.className = `game-timer ${secs <= 5 ? 'danger' : ''}`; }
    }

    handleTimeout() {
      if (this.state.answered) return;
      this.setState({ feedback: 'timeout', answered: true });
      this.updateView();
      this.schedule(() => this.gameOver(false), FEEDBACK_MS);
    }

    handleAnswer(playerAnswer) {
      if (this.state.answered) return;
      this.cancelTimer();

      const tier = tierFor(this.state.level);
      const isCorrect = playerAnswer === this.state.correctAnswer;

      if (!isCorrect) {
        this.setState({ answered: true, feedback: 'incorrect' });
        this.schedule(() => this.gameOver(false), FEEDBACK_MS);
        return;
      }

      const score = this.state.score + tier.points;
      this.setState({ answered: true, feedback: 'correct', score, correctCount: this.state.correctCount + 1 });
      this.saveBestScore(score);

      if (this.state.level >= MAX_LEVEL) {
        this.schedule(() => this.gameOver(true), FEEDBACK_MS);
      } else {
        this.schedule(() => {
          this.setState({ level: this.state.level + 1 });
          this.nextQuestion();
        }, FEEDBACK_MS);
      }
    }

    render() {
      const { statement, timer, score, bestScore, level, feedback, correctAnswer, status, correctCount } = this.state;
      const tier = tierFor(level);

      if (status === 'won' || status === 'gameover') {
        const won = status === 'won';
        const reason = feedback === 'timeout' ? this.t('games.trueFalse.play.reasonTimeout', 'Waktu habis.') : feedback === 'incorrect' ? this.t('games.trueFalse.play.reasonWrong', 'Jawaban salah.') : '';
        return `<div class="true-false-game">${this.renderResult({
          icon: won ? '🏆' : '⏱️',
          title: won ? this.t('games.trueFalse.play.allDone', 'Semua 10 Level Selesai!') : this.t('game.over', 'Game Over'),
          description: won ? this.t('games.trueFalse.play.wonDesc', 'Luar biasa, kamu menyelesaikan semua level.') : `${reason} ${this.t('games.trueFalse.play.reachedLevel', 'Kamu sampai level {level}.', { level })}`.trim(),
          score,
          stats: [
            { label: this.t('games.trueFalse.play.levelReached', 'Level tercapai'), value: `${level} / ${MAX_LEVEL}` },
            { label: this.t('games.trueFalse.play.correctAnswers', 'Jawaban benar'), value: correctCount },
            { label: this.t('games.trueFalse.play.record', 'Rekor'), value: bestScore }
          ],
          tone: won ? 'success' : 'error'
        })}</div>`;
      }

      const cls = timer <= 5 ? 'danger' : timer <= 10 ? 'warning' : '';
      const shownFeedback = feedback === 'incorrect' || feedback === 'timeout';
      const btn = (value, label, icon) => {
        let state = '';
        if (shownFeedback && correctAnswer === value) state = 'correct';
        else if (feedback === 'incorrect' && correctAnswer !== value) state = 'incorrect';
        else if (feedback === 'correct' && correctAnswer === value) state = 'correct';
        return `<button type="button" class="option-btn tf-btn ${value ? 'true' : 'false'} ${state}" data-answer="${value}" ${feedback ? 'disabled' : ''} aria-label="${label}">
          ${icon}<span class="tf-label">${label.toUpperCase()}</span></button>`;
      };

      return `
        <div class="true-false-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('games.trueFalse.play.levelOf', 'Level {n} / {max}', { n: level, max: MAX_LEVEL })}</span>
              <span class="game-timer ${timer <= 5 ? 'danger' : ''}">${timer}s</span>
            </div>
            <div class="timer-bar"><div class="timer-bar-fill ${cls}" style="width:${(timer / tier.timer) * 100}%"></div></div>
          </div>
          <div class="question-display tf-statement ${feedback || ''}">${statement || this.t('game.loading', 'Memuat...')}</div>
          <div class="tf-options">
            ${btn(true, this.t('games.trueFalse.play.true', 'Benar'), '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>')}
            ${btn(false, this.t('games.trueFalse.play.false', 'Salah'), '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>')}
          </div>
          ${feedback === 'timeout' ? `<p class="tf-note" role="status">${this.t('games.trueFalse.play.timeUp', 'Waktu habis!')}</p>` : ''}
        </div>`;
    }

    bindEvents(container) {
      container.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.handleAnswer(btn.dataset.answer === 'true');
          this.updateView();
        });
      });
      this.bindResultActions(container);
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.TrueFalse = TrueFalseGame;

})();
