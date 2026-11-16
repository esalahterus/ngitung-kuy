/**
 * Ngitung Kuy - Timed Mode
 */

(function() {
  'use strict';

  const { MathEngine, BaseGame, TimerService, InteractionHelper } = window.NgitungKuy;

  class TimedGame extends BaseGame {
    constructor(config = {}) {
      super('timed', config);
      this.questionHistory = [];
      this.options = [];
      this.rightIndex = 0;
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        timerDuration: 10000 // 10 seconds default
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        currentQuestion: null,
        options: [],
        rightIndex: 0,
        selectedIndex: null,
        timer: this.config.timerDuration,
        streak: 0,
        isGameOver: false,
        feedback: null // 'correct' | 'incorrect' | null
      };
    }

    onStart() {
      this.questionHistory = [];
      this.nextQuestion();
    }

    nextQuestion() {
      const { operation, range, difficulty } = this.config;
      const question = this.generateMathQuestion();

      // Avoid duplicate questions
      let attempts = 0;
      while (this.questionHistory.includes(question.expression) && attempts < 10) {
        const newQ = this.generateMathQuestion();
        if (!this.questionHistory.includes(newQ.expression)) {
          Object.assign(question, newQ);
          break;
        }
        attempts++;
      }

      this.questionHistory.push(question.expression);
      if (this.questionHistory.length > 5) this.questionHistory.shift();

      // Generate options (1 correct + 3 distractors)
      const options = this.generateOptions(question.answer);
      const rightIndex = options.indexOf(question.answer);

      this.setState({
        currentQuestion: question,
        options,
        rightIndex,
        selectedIndex: null,
        timer: this.config.timerDuration,
        feedback: null
      });

      this.startTimer();
    }

    generateOptions(correctAnswer) {
      // unique distractors, correct answer exactly once (MathEngine.generateOptions)
      return MathEngine.generateOptions(correctAnswer, 4).options;
    }

    startTimer() {
      this.cancelTimer();
      this.startCountdownTimer(this.state.timer, (remaining) => {
        this.setState({ timer: remaining });
        this.updateTimerDisplay(remaining, this.config.timerDuration);
      }, () => {
        this.handleTimeUp();
      });
    }

    updateTimerDisplay(remaining, total) {
      const fill = document.querySelector('.timed-game .timer-bar-fill');
      if (fill) {
        fill.style.width = `${(remaining / total) * 100}%`;
        fill.className = `timer-bar-fill ${remaining <= 3000 ? 'danger' : remaining <= 6000 ? 'warning' : ''}`;
      }
    }

    handleTimeUp() {
      this.cancelTimer();
      this.setState({ isGameOver: true, feedback: 'timeout' });
      this.gameOver(false);
      this.updateView();
    }

    handleOptionClick(index) {
      if (this.state.isGameOver || this.state.feedback) return;

      const isCorrect = index === this.state.rightIndex;
      this.cancelTimer();

      if (isCorrect) {
        const newScore = this.state.score + 20;
        const newStreak = this.state.streak + 1;
        this.setState({
          score: newScore,
          streak: newStreak,
          selectedIndex: index,
          feedback: 'correct'
        });
        this.saveBestScore(newScore);

        this.schedule(() => {
          this.nextQuestion();
          this.updateView();
        }, 800);
      } else {
        this.setState({
          selectedIndex: index,
          feedback: 'incorrect',
          isGameOver: true
        });
        this.gameOver(false);
        this.updateView();
      }
    }

    render() {
      const { currentQuestion, options, rightIndex, selectedIndex, timer, score, streak, bestScore, feedback, isGameOver } = this.state;

      return `
        <div class="timed-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="streak-indicator" ${streak > 0 ? '' : 'style="display:none"'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                ${streak}
              </span>
            </div>
            <div class="timer-bar">
              <div class="timer-bar-fill ${timer <= 5000 ? 'danger' : timer <= 10000 ? 'warning' : ''}"
                   style="width: ${(timer / this.config.timerDuration) * 100}%"></div>
            </div>
          </div>

          <div class="question-display ${feedback || ''}">
            ${currentQuestion ? MathEngine.formatExpression(currentQuestion) : this.t('game.loading', 'Memuat...')}
          </div>

          <div class="options-grid" role="list" aria-label="${this.t('games.timed.play.optionsLabel', 'Pilihan jawaban')}">
            ${options.map((opt, idx) => {
              let stateClass = '';
              if (feedback === 'correct' && idx === rightIndex) {
                stateClass = 'correct';
              } else if (feedback === 'incorrect') {
                if (idx === selectedIndex) stateClass = 'incorrect';
                else if (idx === rightIndex) stateClass = 'correct';
              }
              return `
                <button class="option-btn ${stateClass}"
                    data-index="${idx}"
                    ${isGameOver || feedback ? 'disabled' : ''}
                    aria-label="${this.t('games.timed.play.optionLabel', 'Pilihan {value}', { value: opt })}">
                  ${opt}
                </button>
              `;
            }).join('')}
          </div>

          ${isGameOver ? `
            <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
              <section class="game-result-card">
                <div class="game-result-icon is-loss">${feedback === 'timeout' ? '⏱️' : '✕'}</div>
                <h2 class="game-result-title" id="game-result-title">${feedback === 'timeout' ? this.t('game.timeUp', 'Waktu Habis!') : this.t('games.timed.play.wrongAnswer', 'Jawaban Salah!')}</h2>
                <p class="game-result-description">${this.t('games.timed.play.sessionEnded', 'Sesi permainan telah berakhir.')}</p>
                <div class="game-result-score">${this.state.score}</div>
                <p class="game-result-meta">${this.t('games.timed.play.finalScore', 'Skor akhir')} · ${this.t('game.best', 'Best')} ${bestScore} · ${this.t('games.timed.play.streak', 'Streak')} ${streak}</p>
                <div class="game-result-actions">
                  <button class="btn btn-primary" type="button" onclick="window.NgitungKuy.App.restartGame()">${this.t('game.playAgain', 'Main Lagi')}</button>
                  <button class="btn btn-secondary" type="button" onclick="window.NgitungKuy.App.exitToDashboard()">${this.t('game.dashboard', 'Dashboard')}</button>
                </div>
              </section>
            </div>
          ` : ''}
        </div>
      `;
    }

    bindEvents(container) {
      container.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!this.state.isGameOver && !this.state.feedback) {
            const index = parseInt(btn.dataset.index, 10);
            this.handleOptionClick(index);
            this.updateView();
          }
        });
      });
    }

    updateView() {
      const container = document.getElementById('game-area');
      if (container) {
        container.innerHTML = this.render();
        this.bindEvents(container);
      }
    }
  }

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.Timed = TimedGame;

})();