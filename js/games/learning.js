/**
 * Ngitung Kuy - Learning Mode
 */

(function() {
  'use strict';

  const { MathEngine, BaseGame, TimerService, InteractionHelper } = window.NgitungKuy;

  class LearningGame extends BaseGame {
    constructor(config = {}) {
      super('learning', config);
      this.questionHistory = [];
      this.currentQuestion = null;
      this.inputValue = '';
      this.pendingTimeouts = new Set();
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        totalQuestions: 20
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        currentQuestionIndex: 0,
        correctCount: 0,
        totalAttempted: 0,
        currentQuestion: null,
        inputValue: '',
        feedback: null, // 'correct' | 'incorrect' | null
        showFeedback: false
      };
    }

    onStart() {
      this.questionHistory = [];
      this.generateQuestion();
    }

    generateQuestion() {
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
      if (this.questionHistory.length > 10) this.questionHistory.shift();

      this.setState({
        currentQuestion: question,
        inputValue: '',
        feedback: null,
        showFeedback: false
      });
    }

    handleAnswer(correct) {
      super.handleAnswer(correct);

      if (correct) {
        const newCorrect = this.state.correctCount + 1;
        const newTotal = this.state.totalAttempted + 1;
        this.setState({
          correctCount: newCorrect,
          totalAttempted: newTotal,
          feedback: 'correct',
          showFeedback: true
        });

        if (newTotal >= this.config.totalQuestions) {
          this.scheduleTimeout(() => this.handleComplete(), 1000);
        } else {
          // Next question after brief delay
          this.scheduleTimeout(() => { this.generateQuestion(); this.updateView(); }, 1000);
        }
      } else {
        this.setState({
          totalAttempted: this.state.totalAttempted + 1,
          feedback: 'incorrect',
          showFeedback: true
        });

        this.scheduleTimeout(() => {
          this.setState({ feedback: null, showFeedback: false, inputValue: '' });
          this.updateView();
        }, 800);
      }
    }

    scheduleTimeout(callback, delay) {
      const timeoutId = setTimeout(() => { this.pendingTimeouts.delete(timeoutId); callback(); }, delay);
      this.pendingTimeouts.add(timeoutId);
      return timeoutId;
    }

    handleComplete() {
      this.setState({
        status: 'won',
        showFeedback: false
      });
      if (this.storage) {
        this.storage.setProgress('learning', {
          correctCount: this.state.correctCount,
          totalAttempted: this.state.totalAttempted,
          completedAt: Date.now()
        });
      }
      this.updateView();
    }

    handleInput(digit) {
      if (this.state.showFeedback) return;

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
      const isCorrect = !isNaN(userAnswer) && userAnswer === currentQuestion.answer;

      this.handleAnswer(isCorrect);
    }

    render() {
      const { currentQuestion, inputValue, feedback, correctCount, totalAttempted, bestScore, status } = this.state;

      if (status === 'won') {
        const percentage = Math.round((correctCount / this.config.totalQuestions) * 100);
        return `
          <div class="learning-game">
            <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
              <section class="game-result-card">
                <div class="game-result-icon">🏆</div>
                <h2 class="game-result-title" id="game-result-title">${this.t('games.learning.play.resultTitle', 'Sesi Selesai!')}</h2>
                <p class="game-result-description">${this.t('games.learning.play.resultDescription', 'Bagus sekali! Terus berlatih untuk mengasah kecepatan berhitung.')}</p>
                <div class="game-result-score">${correctCount} / ${this.config.totalQuestions}</div>
                <p class="game-result-meta">${this.t('game.correct', 'Benar')} · ${this.t('games.learning.play.accuracy', '{percentage}% akurasi', { percentage })}</p>
                <div class="game-result-actions">
                  <button class="btn btn-primary" type="button" onclick="window.NgitungKuy.App.restartGame()">${this.t('game.playAgain', 'Main Lagi')}</button>
                  <button class="btn btn-secondary" type="button" onclick="window.NgitungKuy.App.exitToDashboard()">${this.t('game.dashboard', 'Dashboard')}</button>
                </div>
              </section>
            </div>
          </div>
        `;
      }

      return `
        <div class="learning-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.correct', 'Benar')}: <span class="game-score-value">${correctCount}</span></span>
              <span>${this.t('game.total', 'Total')}: ${totalAttempted}</span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
            </div>
          </div>

          <div class="question-display ${feedback || ''}">
            ${currentQuestion ? MathEngine.formatExpression(currentQuestion) : this.t('game.loading', 'Memuat...')}
          </div>

          <div class="answer-input-area">
            <input
              type="text"
              class="answer-input"
              value="${inputValue}"
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
                <path d="M19 12H5M12 19l-7-7 7-7"></path>
              </svg>
            </button>
          </div>

          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(100, (totalAttempted / this.config.totalQuestions) * 100)}%"></div>
            </div>
            <p class="text-sm text-muted text-center mt-sm">${this.t('games.learning.play.progress', '{done} / {total} soal', { done: totalAttempted, total: this.config.totalQuestions })}</p>
          </div>
        </div>
      `;
    }

    bindEvents(container) {
      // Keypad buttons
      container.querySelectorAll('.keypad-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const digit = btn.dataset.digit;
          this.handleInput(digit);
          this.updateView();
        });
      });

      // Physical keyboard listener
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
      }
      this._keyHandler = (e) => {
        if (this.state.showFeedback) return;
        if (e.key >= '0' && e.key <= '9') {
          this.handleInput(e.key);
          this.updateView();
        } else if (e.key === 'Backspace') {
          this.handleInput('backspace');
          this.updateView();
        } else if (e.key === 'Enter') {
          this.handleInput('enter');
          this.updateView();
        }
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    destroy() {
      this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.pendingTimeouts.clear();
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

  // Export
  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Games = window.NgitungKuy.Games || {};
  window.NgitungKuy.Games.Learning = LearningGame;

})();