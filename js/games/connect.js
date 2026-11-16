/**
 * Ngitung Kuy - Connect Mode
 */

(function() {
  'use strict';

  const { MathEngine, BaseGame, InteractionHelper, TimerService } = window.NgitungKuy;

  // Poin per pasangan benar (real-time); bonus level ditambahkan saat level selesai
  const PAIR_POINTS = 10;

  class ConnectGame extends BaseGame {
    constructor(config = {}) {
      super('connect', config);
      this.questionHistory = [];
      this.leftColumn = [];
      this.rightColumn = [];
      this.connections = [];
      this.activeSource = null;
      this.svgLine = null;
    }

    getDefaultConfig() {
      return {
        ...super.getDefaultConfig(),
        pairsPerLevel: 8,
        levelDuration: 60000 // 60s countdown timer per level
      };
    }

    getInitialState() {
      return {
        ...super.getInitialState(),
        leftColumn: [],
        rightColumn: [],
        connections: [],
        wrongPair: null,
        timer: this.config.levelDuration || 60000,
        highestLevel: 1,
        feedback: null // 'correct' | 'incorrect' | 'level-complete' | 'timeout'
      };
    }

    onStart() {
      this.questionHistory = [];
      this.generateLevel();
    }

    startLevelTimer() {
      this.cancelTimer();
      const duration = this.config.levelDuration || 60000;
      this.setState({ timer: duration });
      this.startCountdownTimer(
        duration,
        (remaining) => {
          this.setState({ timer: remaining });
          this.updateTimerDisplay(remaining, duration);
        },
        () => {
          this.handleTimeUp();
        }
      );
    }

    updateTimerDisplay(remaining, total) {
      const fill = document.querySelector('.connect-game .timer-bar-fill');
      const text = document.querySelector('.connect-game .game-timer');
      if (fill) {
        fill.style.width = `${Math.max(0, Math.min(100, (remaining / total) * 100))}%`;
        fill.className = `timer-bar-fill ${remaining <= 10000 ? 'danger' : remaining <= 20000 ? 'warning' : ''}`;
      }
      if (text) {
        text.textContent = `${Math.ceil(remaining / 1000)}s`;
      }
    }

    handleTimeUp() {
      this.cancelTimer();
      this.setState({
        status: 'gameover',
        feedback: 'timeout'
      });
      this.saveBestScore(this.state.score);
      if (this.storage) {
        this.storage.setProgress('connect', {
          highestLevel: this.state.level,
          bestScore: Math.max(this.state.score, this.state.bestScore)
        });
      }
      this.gameOver(false);
      this.updateView();
    }

    generateLevel() {
      const { operation, range, difficulty } = this.config;
      const pairs = this.config.pairsPerLevel;
      const questions = [];
      const answers = new Set();
      const usedResults = new Set();

      for (let i = 0; i < pairs; i++) {
        let attempts = 0;
        let question, answer;

        do {
          const q = this.generateMathQuestion();
          if (!usedResults.has(q.answer)) {
            question = q;
            answer = q.answer;
            break;
          }
          attempts++;
        } while (attempts < 20);

        if (!question) break;

        questions.push({
          id: `q${i}`,
          expression: MathEngine.formatExpression(question),
          answer
        });
        answers.add(answer);
        usedResults.add(answer);
      }

      // Create left column (questions) and right column (shuffled answers)
      const leftColumn = questions.map(q => ({
        id: q.id,
        text: q.expression,
        answer: q.answer,
        type: 'question'
      }));

      const rightColumn = [...questions]
        .sort(() => Math.random() - 0.5)
        .map(q => ({
          id: `a${q.id}`,
          text: q.answer.toString(),
          answer: q.answer,
          type: 'answer'
        }));

      this.setState({
        leftColumn,
        rightColumn,
        connections: [],
        wrongPair: null,
        feedback: null
      });

      this.startLevelTimer();
      this.updateView();
    }

    setupDragDrop() {
      // Use InteractionHelper for connectable elements
      this.schedule(() => {
        // Render bisa terjadi berkali-kali sebelum callback ini jalan; jangan pasang handler ganda
        // pada elemen yang sama (penyebab jawaban pertama dinilai dua kali -> merah).
        const sourceElements = Array.from(document.querySelectorAll('[data-connect-source]')).filter(el => !el.dataset.connectBound);
        const targetElements = Array.from(document.querySelectorAll('[data-connect-target]'));
        sourceElements.forEach(el => { el.dataset.connectBound = '1'; });

        if (sourceElements.length && targetElements.length) {
          InteractionHelper.makeConnectable(
            sourceElements,
            targetElements,
            {
              getSourceId: (el) => el.dataset.connectSource,
              getTargetId: (el) => el.dataset.connectTarget,
              validateConnection: (sourceId, targetId) => {
                if (this.state.status !== 'playing') return false;
                const source = this.state.leftColumn.find(c => c.id === sourceId);
                const target = this.state.rightColumn.find(c => c.id === targetId);
                // Kartu yang sudah terhubung (sedang animasi hijau) tidak bisa dipakai lagi
                if (this.state.connections.some(c => c.sourceId === sourceId || c.targetId === targetId)) return false;
                return source && target && source.answer === target.answer;
              },
              onConnect: (sourceId, targetId, sourceEl, targetEl) => {
                this.handleCorrectConnection(sourceId, targetId, sourceEl, targetEl);
              },
              onDisconnect: (sourceId, targetId, reason) => {
                if (reason === 'invalid') {
                  this.handleIncorrectConnection(sourceId, targetId);
                }
              }
            }
          );
        }
      }, 0);
    }

    handleCorrectConnection(sourceId, targetId, sourceEl, targetEl) {
      // Visual feedback: hijau sebelum kartu hilang
      sourceEl.classList.add('correct');
      targetEl.classList.add('correct');

      // Skor bertambah real-time untuk setiap pasangan yang benar
      const connections = [...this.state.connections, { sourceId, targetId }];
      const score = this.state.score + PAIR_POINTS;
      this.setState({ connections, score, wrongPair: null, feedback: 'correct' });
      this.updateScoreDisplay(score);
      this.saveBestScore(score);

      // Hapus kartu setelah animasi hijau singkat
      this.schedule(() => {
        if (this.state.status !== 'playing') return;
        const leftColumn = this.state.leftColumn.filter(c => c.id !== sourceId);
        const rightColumn = this.state.rightColumn.filter(c => c.id !== targetId);
        const remaining = this.state.connections.filter(c => c.sourceId !== sourceId);
        this.setState({ leftColumn, rightColumn, connections: remaining, feedback: null });
        this.updateView();

        // Check level complete
        if (leftColumn.length === 0) {
          this.levelComplete();
        }
      }, 500);
    }

    handleIncorrectConnection(sourceId, targetId) {
      if (this.state.status !== 'playing') return;
      const src = document.querySelector(`[data-connect-source="${sourceId}"]`);
      const tgt = document.querySelector(`[data-connect-target="${targetId}"]`);
      [src, tgt].forEach(el => el && el.classList.add('incorrect', 'animate-shake'));
      this.setState({ wrongPair: { sourceId, targetId }, feedback: 'incorrect' });

      this.schedule(() => {
        this.setState({ wrongPair: null, feedback: null });
        this.updateView();
      }, 600);
    }

    updateScoreDisplay(score) {
      const el = document.querySelector('.connect-game .game-score-value');
      if (el) el.textContent = score;
    }

    levelComplete() {
      this.cancelTimer();
      const remainingSec = Math.max(0, Math.ceil(this.state.timer / 1000));
      // SPEC §6.4: Time-based: waktu tersisa (detik) × 10 + perfect bonus 500
      const levelScore = (remainingSec * 10) + 500;
      const newScore = this.state.score + levelScore;
      const newLevel = this.state.level + 1;
      const highestLevel = Math.max(this.state.highestLevel || 1, newLevel);

      this.setState({
        score: newScore,
        level: newLevel,
        highestLevel,
        feedback: 'level-complete'
      });
      this.saveBestScore(newScore);

      if (this.storage) {
        this.storage.setProgress('connect', {
          highestLevel,
          bestScore: Math.max(newScore, this.state.bestScore)
        });
      }

      this.updateView();

      this.schedule(() => {
        if (this.state.status !== 'gameover') {
          this.generateLevel();
          this.updateView();
        }
      }, 1500);
    }

    render() {
      const { leftColumn, rightColumn, connections, wrongPair, feedback, score, bestScore, level, timer, status } = this.state;
      const remainingSec = Math.ceil(timer / 1000);

      return `
        <div class="connect-game">
          <div class="game-header-info">
            <div class="game-score">
              <span>${this.t('game.score', 'Skor')}: <span class="game-score-value">${score}</span></span>
              <span>${this.t('game.best', 'Best')}: ${bestScore}</span>
              <span class="level-indicator">${this.t('game.level', 'Level')} ${level}</span>
            </div>
            <div class="timer-display">
              <span class="game-timer">${remainingSec}s</span>
            </div>
            <div class="timer-bar">
              <div class="timer-bar-fill ${timer <= 10000 ? 'danger' : timer <= 20000 ? 'warning' : ''}"
                   style="width: ${Math.max(0, Math.min(100, (timer / (this.config.levelDuration || 60000)) * 100))}%"></div>
            </div>
          </div>

          <div class="connect-container">
            <div class="card-column">
              <div class="card-column-label">${this.t('games.connect.play.questions', 'Soal')}</div>
              <div class="connect-left-column">
                ${leftColumn.map(item => `
                  <div class="card connect-source ${connections.some(c => c.sourceId === item.id) ? 'correct' : ''} ${wrongPair && wrongPair.sourceId === item.id ? 'incorrect animate-shake' : ''}"
                       data-connect-source="${item.id}"
                       data-answer="${item.answer}">
                    ${item.text}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card-column">
              <div class="card-column-label">${this.t('game.answer', 'Jawaban')}</div>
              <div class="connect-right-column">
                ${rightColumn.map(item => `
                  <div class="card connect-target ${connections.some(c => c.targetId === item.id) ? 'correct' : ''} ${wrongPair && wrongPair.targetId === item.id ? 'incorrect animate-shake' : ''}"
                       data-connect-target="${item.id}"
                       data-answer="${item.answer}">
                    ${item.text}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <svg class="connect-svg" id="connect-svg"></svg>

          ${feedback === 'level-complete' ? `
            <div class="feedback-overlay show">
              <div class="feedback-content" style="max-width: 360px; padding: 2rem;">
                <div class="feedback-icon correct" style="font-size: 3rem; margin-bottom: 0.5rem;">✓</div>
                <h3 style="margin-bottom: 0.5rem;">${this.t('games.connect.play.levelComplete', 'Level Selesai!')}</h3>
                <p style="font-size: 1.25rem; font-weight: 600; color: var(--color-success, #2ec4b6); margin-bottom: 0.5rem;">
                  ${this.t('games.connect.play.pointsGain', '+{n} Poin', { n: (remainingSec * 10) + 500 })}
                </p>
                <p class="text-sm text-muted">${this.t('games.connect.play.levelDetail', 'Waktu tersisa: {sec}s | Bonus Sempurna: +500', { sec: remainingSec })}</p>
              </div>
            </div>
          ` : ''}

          ${status === 'gameover' ? `
            <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
              <section class="game-result-card">
                <div class="game-result-icon is-loss">⏱️</div>
                <h2 class="game-result-title" id="game-result-title">${this.t('game.timeUp', 'Waktu Habis!')}</h2>
                <p class="game-result-description">${this.t('games.connect.play.sessionOver', 'Sesi permainan telah berakhir.')}</p>
                <div class="game-result-score">${score}</div>
                <p class="game-result-meta">${this.t('games.connect.play.resultMeta', 'Level Dicapai: {level} | Best Score: {best}', { level, best: bestScore })}</p>
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
      // Events handled by InteractionHelper.makeConnectable
      this.setupDragDrop();
    }

    destroy() {
      this.cancelTimer();
      super.destroy();
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
  window.NgitungKuy.Games.Connect = ConnectGame;

})();