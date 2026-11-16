/**
 * Ngitung Kuy - Time-Based Game
 */

(function() {
  'use strict';

  const { MathEngine, BaseGame, TimerService, InteractionHelper } = window.NgitungKuy;

  class TimeBasedGame extends BaseGame {
    constructor(config = {}) {
      super('timeBased', config);
      this.questionHistory = [];
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        maxDuration: 120000 // 2 minutes default
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        currentQuestion: null,
        timer: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        level: 1,
        inputValue: '',
        feedback: null // 'correct' | 'incorrect' | null
      };
    }

    onStart() {
      this.questionHistory = [];
      this.nextQuestion();
      this.startCountUpTimer(
        (elapsed, maxReached) => {
          this.setState({ timer: elapsed });
          this.updateTimerDisplay(elapsed, this.config.maxDuration);
          if (maxReached) this.handleTimeUp();
        },
        this.config.maxDuration
      );
    }

    updateTimerDisplay(elapsed, maxDuration) {
      const fill = document.querySelector('.time-based-game .timer-bar-fill');
      const text = document.querySelector('.time-based-game .game-timer');
      if (fill) {
        fill.style.width = `${Math.min(100, (elapsed / maxDuration) * 100)}%`;
        fill.className = `timer-bar-fill ${elapsed > maxDuration * 0.8 ? 'danger' : elapsed > maxDuration * 0.5 ? 'warning' : ''}`;
      }
      if (text) {
        text.textContent = TimerService.formatMs(elapsed);
      }
      const elapsedEl = document.querySelector('.time-based-game .time-based-elapsed');
      if (elapsedEl) {
        elapsedEl.textContent = TimerService.formatMs(elapsed);
      }
    }

    nextQuestion() {
      const { operation, range, difficulty } = this.config;
      const question = this.generateMathQuestion();

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
      if (this.questionHistory.length > 10) this.questionHistory.shift();

      this.setState({
        currentQuestion: question,
        inputValue: '',
        feedback: null
      });
    }

    handleTimeUp() {
      this.cancelTimer();
      this.saveBestScore(this.state.score);
      if (this.storage) {
        this.storage.setProgress('timeBased', {
          bestScore: Math.max(this.state.score, this.state.bestScore),
          highestLevel: this.state.level,
          bestStreak: this.state.bestStreak
        });
      }
      this.gameOver(false);
      this.updateView();
    }

    handleAnswer(userAnswer) {
      if (this.state.feedback || this.state.status === 'gameover') return;

      const { currentQuestion } = this.state;
      if (!currentQuestion) return;

      const isCorrect = userAnswer === currentQuestion.answer;
      if (this.progression) {
        this.progression.onAnswer(isCorrect);
        this.applyProgressionConfig();
      }

      if (isCorrect) {
        const newStreak = this.state.streak + 1;
        const newBestStreak = Math.max(this.state.bestStreak || 0, newStreak);
        const newCorrect = (this.state.correctCount || 0) + 1;
        const newLevel = Math.floor(newCorrect / 10) + 1;

        let multiplier = 1;
        if (newStreak >= 20) multiplier = 3;
        else if (newStreak >= 10) multiplier = 2;
        else if (newStreak >= 5) multiplier = 1.5;

        const points = Math.round(10 * multiplier);
        const newScore = this.state.score + points;

        this.setState({
          score: newScore,
          streak: newStreak,
          bestStreak: newBestStreak,
          correctCount: newCorrect,
          level: newLevel,
          feedback: 'correct'
        });
        this.saveBestScore(newScore);

        this.schedule(() => {
          this.nextQuestion();
          this.updateView();
        }, 800);
      } else {
        this.setState({ feedback: 'incorrect', streak: 0 });
        this.schedule(() => {
          this.setState({ feedback: null, inputValue: '' });
          this.updateView();
        }, 800);
      }
    }

    handleInput(digit) {
      if (this.state.feedback) return;

      if (digit === 'backspace') {
        this.setState({
          inputValue: this.state.inputValue.slice(0, -1)
        });
      } else if (digit === 'enter') {
        this.submitAnswer();
      } else if (this.state.inputValue.length < 6) {
        this.setState({
          inputValue: this.state.inputValue + digit
        });
      }
    }

    submitAnswer() {
      const { currentQuestion, inputValue } = this.state;
      if (!currentQuestion || inputValue === '') return;

      const userAnswer = parseInt(inputValue, 10);
      this.handleAnswer(userAnswer);
    }

    render() {
      const { currentQuestion, timer, score, streak, bestScore, feedback, inputValue, level, status, bestStreak } = this.state;

      return `
        <div class="time-based-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level || 1}</span>
              <span class="streak-indicator" ${streak > 0 ? '' : 'style="visibility:hidden"'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                ${streak}
              </span>
            </div>
            <div class="timer-display">
              <span class="game-timer">${TimerService.formatMs(timer)}</span>
            </div>
          </div>

          <div class="question-display ${feedback || ''}">
            ${currentQuestion ? MathEngine.formatExpression(currentQuestion) : this.t('game.loading', 'Memuat...')}
          </div>

          <div class="answer-input-area">
            <input
              type="text"
              class="answer-input"
              value="${inputValue || ''}"
              readonly
              placeholder="?"
              aria-label="${this.t('game.answer', 'Jawaban')}"
            >
          </div>

          <div class="number-keypad" role="grid" aria-label="${this.t('game.keypad', 'Keypad numerik')}">
            <button class="keypad-btn" data-digit="1">1</button>
            <button class="keypad-btn" data-digit="2">2</button>
            <button class="keypad-btn" data-digit="3">3</button>
            <button class="keypad-btn" data-digit="4">4</button>
            <button class="keypad-btn" data-digit="5">5</button>
            <button class="keypad-btn" data-digit="6">6</button>
            <button class="keypad-btn" data-digit="7">7</button>
            <button class="keypad-btn" data-digit="8">8</button>
            <button class="keypad-btn" data-digit="9">9</button>
            <button class="keypad-btn action delete" data-digit="backspace" aria-label="${this.t('game.delete', 'Hapus')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                <line x1="18" y1="9" x2="12" y2="15"></line>
                <line x1="12" y1="9" x2="18" y2="15"></line>
              </svg>
            </button>
            <button class="keypad-btn" data-digit="0">0</button>
            <button class="keypad-btn action enter" data-digit="enter" aria-label="${this.t('game.submit', 'Kirim')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>

          <div class="progress-section">
            <div class="timer-bar">
              <div class="timer-bar-fill ${timer > this.config.maxDuration * 0.8 ? 'danger' : timer > this.config.maxDuration * 0.5 ? 'warning' : ''}"
                   style="width: ${Math.min(100, (timer / this.config.maxDuration) * 100)}%"></div>
            </div>
            <p class="text-sm text-muted text-center mt-sm">${this.t('games.timeBased.play.time', 'Waktu')}: <span class="time-based-elapsed">${TimerService.formatMs(timer)}</span> / ${TimerService.formatMs(this.config.maxDuration)}</p>
          </div>

          ${status === 'gameover' ? `
            <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
              <section class="game-result-card">
                <div class="game-result-icon is-loss">⏱️</div>
                <h2 class="game-result-title" id="game-result-title">${this.t('game.timeUp', 'Waktu Habis!')}</h2>
                <p class="game-result-description">${this.t('games.timeBased.play.sessionEnded', 'Sesi permainan telah berakhir.')}</p>
                <div class="game-result-score">${score}</div>
                <p class="game-result-meta">${this.t('games.timeBased.play.resultMeta', 'Level Dicapai: {level} | Best Streak: {streak}', { level: level || 1, streak: bestStreak || streak })}</p>
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
      container.querySelectorAll('.keypad-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const digit = btn.dataset.digit;
          if (digit === 'enter') {
            this.submitAnswer();
          } else {
            this.handleInput(digit);
          }
          this.updateView();
        });
      });

      // Physical keyboard listener
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
      }
      this._keyHandler = (e) => {
        if (this.state.feedback) return;
        if (e.key >= '0' && e.key <= '9') {
          this.handleInput(e.key);
          this.updateView();
        } else if (e.key === 'Backspace') {
          this.handleInput('backspace');
          this.updateView();
        } else if (e.key === 'Enter') {
          this.submitAnswer();
          this.updateView();
        }
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    destroy() {
      super.destroy();
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
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
  window.NgitungKuy.Games.TimeBased = TimeBasedGame;

})();