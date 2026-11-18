/**
 * Ngitung Kuy - Game Engine
 * Mathematics Engine + Base Game Class + Timer Service + Interaction Helper + Difficulty Engine
 */

(function() {
  'use strict';

  // ============================================================================
  // MATHEMATICS ENGINE
  // ============================================================================

  const MathEngine = {
    operations: ['addition', 'subtraction', 'multiplication', 'division'],

    // Generate question based on operation, range, and difficulty
    generateQuestion(operation, range, difficulty) {
      const { min = 1, max = 20, maxDividend, maxDivisor, allowNegative = false } = range;

      let question;

      switch (operation) {
        case 'addition':
          question = this.generateAddition(min, max);
          break;
        case 'subtraction':
          question = this.generateSubtraction(min, max, allowNegative);
          break;
        case 'multiplication':
          question = this.generateMultiplication(min, max);
          break;
        case 'division':
          question = this.generateDivision(maxDividend || max, maxDivisor || Math.min(12, max));
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        ...question,
        operation,
        expression: this.formatExpression(question)
      };
    },

    // Generate addition question: a + b = ?
    generateAddition(min, max) {
      const a = this.randomInt(min, max);
      const b = this.randomInt(min, Math.min(max, max - a + min)); // Ensure result doesn't exceed reasonable bounds
      return {
        a,
        b,
        answer: a + b,
        type: 'addition'
      };
    },

    // Generate subtraction question: a - b = ?
    generateSubtraction(min, max, allowNegative = false) {
      let a, b, answer;

      if (allowNegative) {
        a = this.randomInt(min, max);
        b = this.randomInt(min, max);
        answer = a - b;
      } else {
        // Ensure non-negative result for basic levels
        a = this.randomInt(min + 1, max);
        b = this.randomInt(min, a);
        answer = a - b;
      }

      return { a, b, answer, type: 'subtraction' };
    },

    // Generate multiplication question: a × b = ?
    generateMultiplication(min, max) {
      const a = this.randomInt(min, max);
      const b = this.randomInt(min, max);
      return {
        a,
        b,
        answer: a * b,
        type: 'multiplication'
      };
    },

    // Generate division question: a ÷ b = ? (integer only, no remainder)
    generateDivision(maxDividend, maxDivisor) {
      // Generate valid division: dividend = divisor * quotient
      const divisor = this.randomInt(2, maxDivisor);
      const maxQuotient = Math.floor(maxDividend / divisor);
      const quotient = this.randomInt(1, Math.max(1, maxQuotient));
      const dividend = divisor * quotient;

      return {
        a: dividend,
        b: divisor,
        answer: quotient,
        type: 'division'
      };
    },

    // Validate division (must be integer, no remainder)
    validateDivision(dividend, divisor) {
      return divisor !== 0 && dividend % divisor === 0;
    },

    // Format expression string
    formatExpression(question) {
      const operators = {
        addition: '+',
        subtraction: '−',
        multiplication: '×',
        division: '÷'
      };

      const op = operators[question.type] || '+';
      return `${question.a} ${op} ${question.b} = ?`;
    },

    // Get default range for operation
    getDefaultRange(operation) {
      const defaults = {
        addition: { min: 1, max: 20 },
        subtraction: { min: 1, max: 20 },
        multiplication: { min: 1, max: 12 },
        division: { maxDividend: 100, maxDivisor: 12 }
      };
      return defaults[operation] || { min: 1, max: 20 };
    },

    // Get next difficulty based on streak
    getNextDifficulty(currentDifficulty, correctStreak) {
      const levels = ['very-easy', 'easy', 'medium', 'hard', 'very-hard'];
      const currentIndex = levels.indexOf(currentDifficulty);

      if (correctStreak >= 5 && currentIndex < levels.length - 1) {
        return levels[currentIndex + 1];
      }
      if (correctStreak <= -2 && currentIndex > 0) {
        return levels[currentIndex - 1];
      }
      return currentDifficulty;
    },

    // Utility: random integer inclusive
    randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Unbiased Fisher-Yates shuffle (returns a new array)
    shuffle(list) {
      const arr = [...list];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    /**
     * Multiple-choice options.
     * Guarantees: exactly `count` UNIQUE values, the correct answer appears
     * exactly once, and rightIndex always points at it.
     */
    generateOptions(correct, count = 4) {
      const used = new Set([correct]);
      const allowNegative = correct < 0;
      const accept = (v) => Number.isInteger(v) && !used.has(v) && (allowNegative || v >= 0);
      const spread = Math.max(3, Math.round(Math.abs(correct) * 0.2));
      const candidates = this.shuffle([
        -1, 1, -2, 2, -3, 3, -5, 5, -10, 10, -spread, spread, -2 * spread, 2 * spread
      ]);

      for (const offset of candidates) {
        if (used.size >= count) break;
        const v = correct + offset;
        if (accept(v)) used.add(v);
      }
      // Deterministic fallback: always terminates
      for (let k = 1; used.size < count && k < 1000; k++) {
        if (accept(correct + k)) used.add(correct + k);
        if (used.size < count && accept(correct - k)) used.add(correct - k);
      }

      const options = this.shuffle([...used]);
      return { options, rightIndex: options.indexOf(correct) };
    }
  };

  // ============================================================================
  // TIMER SERVICE
  // ============================================================================

  const TimerService = {
    createCountdown(durationMs, onTick, onComplete) {
      const startTime = Date.now();
      const endTime = startTime + durationMs;
      let timerId = null;
      let paused = false;
      let remainingMs = durationMs;

      const tick = () => {
        if (paused) return;
        remainingMs = endTime - Date.now();
        if (remainingMs <= 0) {
          clearInterval(timerId);
          onComplete();
          return;
        }
        onTick(remainingMs);
      };

      timerId = setInterval(tick, 100);
      tick(); // Immediate first tick

      return {
        pause: () => { paused = true; },
        resume: () => { paused = false; },
        cancel: () => { clearInterval(timerId); },
        getRemaining: () => Math.max(0, remainingMs),
        getProgress: () => 1 - (remainingMs / durationMs),
        isRunning: () => !paused && remainingMs > 0
      };
    },

    createCountUp(onTick, maxDurationMs = null) {
      const startTime = Date.now();
      let timerId = null;
      let paused = false;
      let elapsedMs = 0;

      const tick = () => {
        if (paused) return;
        elapsedMs = Date.now() - startTime;
        if (maxDurationMs && elapsedMs >= maxDurationMs) {
          clearInterval(timerId);
          onTick(elapsedMs, true);
          return;
        }
        onTick(elapsedMs, false);
      };

      timerId = setInterval(tick, 100);
      tick();

      return {
        pause: () => { paused = true; },
        resume: () => { paused = false; },
        cancel: () => { clearInterval(timerId); },
        getElapsed: () => elapsedMs,
        isRunning: () => !paused
      };
    },

    formatMs(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    formatMsShort(ms) {
      const seconds = (ms / 1000).toFixed(1);
      return `${seconds}s`;
    }
  };

  // ============================================================================
  // INTERACTION HELPER (Pointer Events for Drag/Touch)
  // ============================================================================

  const InteractionHelper = {
    makeDraggable(element, options = {}) {
      const {
        onDragStart,
        onDragMove,
        onDragEnd,
        onTap,
        dragThreshold = 8,
        clone = false
      } = options;

      let dragData = null;
      let startX = 0, startY = 0;
      let isDragging = false;
      let cloneEl = null;

      const pointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;

        startX = e.clientX;
        startY = e.clientY;
        dragData = onDragStart?.(e, element);
        if (dragData === false) return;

        const pointerMove = (e) => {
          if (!isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.hypot(dx, dy) < dragThreshold) return;

            isDragging = true;
            if (clone && element) {
              cloneEl = element.cloneNode(true);
              cloneEl.style.position = 'fixed';
              cloneEl.style.pointerEvents = 'none';
              cloneEl.style.zIndex = 9999;
              cloneEl.style.left = `${startX}px`;
              cloneEl.style.top = `${startY}px`;
              document.body.appendChild(cloneEl);
            }
            element?.classList.add('dragging');
          }

          if (isDragging) {
            if (cloneEl) {
              cloneEl.style.left = `${e.clientX}px`;
              cloneEl.style.top = `${e.clientY}px`;
            }
            onDragMove?.(e, dragData);
          }
        };

        const pointerUp = (e) => {
          document.removeEventListener('pointermove', pointerMove);
          document.removeEventListener('pointerup', pointerUp);
          document.removeEventListener('pointercancel', pointerUp);

          if (isDragging) {
            element?.classList.remove('dragging');
            cloneEl?.remove();

            const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            onDragEnd?.(e, dragData, dropTarget);
          } else if (dragData !== null) {
            onTap?.(e, element);
          }
          dragData = null;
          isDragging = false;
        };

        document.addEventListener('pointermove', pointerMove);
        document.addEventListener('pointerup', pointerUp);
        document.addEventListener('pointercancel', pointerUp);

        e.preventDefault();
      };

      element.addEventListener('pointerdown', pointerDown);
      element.style.touchAction = 'none';

      return () => {
        element.removeEventListener('pointerdown', pointerDown);
      };
    },

    onSwipe(element, callbacks) {
      const { onUp, onDown, onLeft, onRight, threshold = 30 } = callbacks;
      let startX = 0, startY = 0;

      const pointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
      };

      const pointerUp = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);

        if (dist < threshold) return;

        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle >= -45 && angle <= 45) onRight?.(e);
        else if (angle >= 45 && angle <= 135) onDown?.(e);
        else if (angle >= 135 || angle <= -135) onLeft?.(e);
        else onUp?.(e);
      };

      element.addEventListener('pointerdown', pointerDown);
      element.addEventListener('pointerup', pointerUp);

      return () => {
        element.removeEventListener('pointerdown', pointerDown);
        element.removeEventListener('pointerup', pointerUp);
      };
    },

    onTap(element, callback, options = {}) {
      const { preventDefault = true, stopPropagation = false } = options;
      let startTime = 0;

      const pointerDown = (e) => { startTime = Date.now(); };

      const pointerUp = (e) => {
        const duration = Date.now() - startTime;
        if (duration < 500) {
          if (preventDefault) e.preventDefault();
          if (stopPropagation) e.stopPropagation();
          callback(e, element);
        }
      };

      element.addEventListener('pointerdown', pointerDown);
      element.addEventListener('pointerup', pointerUp);

      return () => {
        element.removeEventListener('pointerdown', pointerDown);
        element.removeEventListener('pointerup', pointerUp);
      };
    },

    makeConnectable(sourceElements, targetElements, options) {
      const { onConnect, onDisconnect, getSourceId, getTargetId, validateConnection } = options;
      let activeSource = null;
      let lineEl = null;

      const createLine = () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'fixed';
        svg.style.top = 0;
        svg.style.left = 0;
        svg.style.width = '100vw';
        svg.style.height = '100vh';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = 1000;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3BA6F1');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-dasharray', '8, 4');
        svg.appendChild(line);
        document.body.appendChild(svg);
        return { svg, line };
      };

      const updateLine = (x1, y1, x2, y2) => {
        if (lineEl) {
          lineEl.line.setAttribute('x1', x1);
          lineEl.line.setAttribute('y1', y1);
          lineEl.line.setAttribute('x2', x2);
          lineEl.line.setAttribute('y2', y2);
        }
      };

      sourceElements.forEach(el => {
        this.makeDraggable(el, {
          dragThreshold: 5,
          onDragStart: (e, el) => {
            activeSource = el;
            // Garis dibuat saat benar-benar menyeret (bukan saat sekadar klik),
            // agar klik biasa tidak meninggalkan garis yang menggantung.
            return { sourceId: getSourceId(el), sourceEl: el };
          },
          onDragMove: (e, data) => {
            if (!lineEl) {
              lineEl = createLine();
              activeSource.classList.add('connecting');
            }
            if (lineEl && activeSource) {
              const rect = activeSource.getBoundingClientRect();
              const x1 = rect.left + rect.width / 2;
              const y1 = rect.top + rect.height / 2;
              updateLine(x1, y1, e.clientX, e.clientY);
            }
          },
          onDragEnd: (e, data, dropTarget) => {
            if (lineEl) {
              lineEl.svg.remove();
              lineEl = null;
            }
            activeSource?.classList.remove('connecting');
            if (!data) { activeSource = null; return; }

            const targetEl = dropTarget?.closest('[data-connect-target]');
            if (targetEl) {
              const targetId = getTargetId(targetEl);
              const valid = validateConnection?.(data.sourceId, targetId);
              if (valid) {
                onConnect?.(data.sourceId, targetId, data.sourceEl, targetEl);
              } else {
                onDisconnect?.(data.sourceId, targetId, 'invalid');
              }
            }
            activeSource = null;
          }
        });
      });
    }
  };

  // ============================================================================
  // DIFFICULTY ENGINE
  // ============================================================================

  const DifficultyEngine = {
    RANGES: {
      addition: {
        'very-easy': { min: 1, max: 10, allowNegative: false },
        'easy': { min: 1, max: 20, allowNegative: false },
        'medium': { min: 1, max: 50, allowNegative: false },
        'hard': { min: 1, max: 100, allowNegative: true },
        'very-hard': { min: 1, max: 200, allowNegative: true }
      },
      subtraction: {
        'very-easy': { min: 1, max: 10, allowNegative: false },
        'easy': { min: 1, max: 20, allowNegative: false },
        'medium': { min: 1, max: 50, allowNegative: false },
        'hard': { min: 1, max: 100, allowNegative: true },
        'very-hard': { min: 1, max: 200, allowNegative: true }
      },
      multiplication: {
        'very-easy': { min: 1, max: 5 },
        'easy': { min: 1, max: 10 },
        'medium': { min: 1, max: 12 },
        'hard': { min: 1, max: 15 },
        'very-hard': { min: 1, max: 20 }
      },
      division: {
        'very-easy': { maxDividend: 20, maxDivisor: 5 },
        'easy': { maxDividend: 50, maxDivisor: 10 },
        'medium': { maxDividend: 100, maxDivisor: 12 },
        'hard': { maxDividend: 200, maxDivisor: 15 },
        'very-hard': { maxDividend: 500, maxDivisor: 20 }
      }
    },

    TIMERS: {
      'very-easy': { base: 15000, decrement: 0 },
      'easy': { base: 10000, decrement: 500 },
      'medium': { base: 7000, decrement: 500 },
      'hard': { base: 5000, decrement: 300 },
      'very-hard': { base: 3000, decrement: 200 }
    },

    getRange(operation, difficulty) {
      return this.RANGES[operation]?.[difficulty] || this.RANGES[operation]?.easy || { min: 1, max: 20 };
    },

    getTimerConfig(difficulty) {
      return this.TIMERS[difficulty] || this.TIMERS.easy;
    },

    getTimerForLevel(difficulty, level) {
      const cfg = this.getTimerConfig(difficulty);
      return Math.max(1000, cfg.base - cfg.decrement * (level - 1));
    }
  };

  // ============================================================================
  // ADAPTIVE PROGRESSION
  // ============================================================================

  class AdaptiveProgression {
    constructor(game) {
      this.game = game;
      this.correctStreak = 0;
      this.incorrectCount = 0;
      this.currentDifficulty = game.config?.difficulty || 'easy';
    }

    onAnswer(correct) {
      if (correct) {
        this.correctStreak++;
        this.incorrectCount = 0;
        if (this.correctStreak >= 5) return this.promote();
      } else {
        this.incorrectCount++;
        this.correctStreak = 0;
        if (this.incorrectCount >= 2) return this.demote();
      }
      return this.currentDifficulty;
    }

    promote() {
      const levels = ['very-easy', 'easy', 'medium', 'hard', 'very-hard'];
      const idx = levels.indexOf(this.currentDifficulty);
      if (idx < levels.length - 1) {
        this.currentDifficulty = levels[idx + 1];
        this.correctStreak = 0;
        return true;
      }
      return false;
    }

    demote() {
      const levels = ['very-easy', 'easy', 'medium', 'hard', 'very-hard'];
      const idx = levels.indexOf(this.currentDifficulty);
      if (idx > 0) {
        this.currentDifficulty = levels[idx - 1];
        this.incorrectCount = 0;
        return true;
      }
      return false;
    }

    getCurrentRange(operation) {
      return DifficultyEngine.getRange(operation, this.currentDifficulty);
    }

    getCurrentDifficulty() {
      return this.currentDifficulty;
    }
  }

  // ============================================================================
  // FIXED LEVEL PROGRESSION
  // ============================================================================

  class FixedLevelProgression {
    constructor(game, levelConfigs) {
      this.game = game;
      this.levelConfigs = levelConfigs;
      this.currentLevel = 0;
    }

    onAnswer(correct) {
      if (correct) {
        this.currentLevel++;
        if (this.currentLevel >= this.levelConfigs.length) {
          this.currentLevel = this.levelConfigs.length - 1;
        }
        return true;
      }
      return false;
    }

    getCurrentConfig() {
      return this.levelConfigs[this.currentLevel] || this.levelConfigs[this.levelConfigs.length - 1];
    }

    getCurrentLevel() {
      return this.currentLevel + 1;
    }

    setLevel(level) {
      this.currentLevel = Math.max(0, Math.min(level - 1, this.levelConfigs.length - 1));
    }
  }

  // ============================================================================
  // BASE GAME CLASS
  // ============================================================================

  class BaseGame {
    constructor(modeId, config = {}) {
      this.modeId = modeId;
      this.config = { ...this.getDefaultConfig(), ...config };
      this.state = this.getInitialState();
      this.subscribers = new Set();
      this.timer = null;
      this.animationFrameId = null;
      this.destroyed = false;
      this._scheduled = new Set();
      this._disposers = [];

      // Initialize progression
      this.initProgression();
    }

    get storage() {
      return window.NgitungKuy?.Storage;
    }

    get settings() {
      return window.NgitungKuy?.Settings;
    }

    getDefaultConfig() {
      return {
        operation: 'addition',
        range: { min: 1, max: 20 },
        difficulty: 'easy'
      };
    }

    getInitialState() {
      return {
        status: 'idle', // 'idle' | 'playing' | 'paused' | 'gameover' | 'won'
        score: 0,
        bestScore: this.loadBestScore(),
        level: 1,
        startedAt: null,
        endedAt: null
      };
    }

    initProgression() {
      const adaptiveModes = ['learning', 'timed', 'timeBased', 'connect', 'puzzle', 'minMax'];
      const fixedModes = ['trueFalse', 'mirrorSymmetry', 'numberPuzzle'];

      if (adaptiveModes.includes(this.modeId)) {
        this.progression = new AdaptiveProgression(this);
      } else if (fixedModes.includes(this.modeId)) {
        this.progression = new FixedLevelProgression(this, this.getLevelConfigs());
      }
    }

    getLevelConfigs() {
      // Override in subclasses for fixed progression modes
      return [];
    }

    // State management
    setState(partialState) {
      if (this.destroyed) return;
      const prev = this.state;
      this.state = { ...prev, ...partialState };
      // Suara benar/salah mengikuti perubahan state.feedback (Learning, Timed, Time-Based, Connect, True/False)
      if ('feedback' in partialState) {
        if (partialState.feedback === 'correct') this.playSound('correct');
        else if (partialState.feedback === 'incorrect' || partialState.feedback === 'timeout') this.playSound('wrong');
      }
      this.notifySubscribers();
      this.persistIfNeeded(prev);
    }

    /** Mainkan efek suara ('correct' | 'wrong' | 'click'); mengikuti pengaturan Suara. */
    playSound(name) {
      window.NgitungKuy?.Sound?.play(name);
    }

    getState() {
      return { ...this.state };
    }

    subscribe(fn) {
      this.subscribers.add(fn);
      return () => this.subscribers.delete(fn);
    }

    notifySubscribers() {
      this.subscribers.forEach(fn => fn(this.state));
    }

    // Persistence
    persistIfNeeded(prev) {
      const PERSIST_WHITELIST = [
        'bestScore', 'level', 'highestLevel',
        'gamesPlayed', 'wins', 'totalCorrect', 'bestMoves',
        'bestTime', 'bestAccuracy'
      ];

      // Skip storage writes on ticks that did not touch persisted fields
      if (prev && !PERSIST_WHITELIST.some(key => key in this.state && prev[key] !== this.state[key])) {
        return;
      }

      const toPersist = {};
      PERSIST_WHITELIST.forEach(key => {
        if (key in this.state) toPersist[key] = this.state[key];
      });

      if (Object.keys(toPersist).length > 0 && this.storage) {
        // Merge: other fields (e.g. wins, completedAt) written by the mode must survive
        const existing = this.storage.getProgress?.(this.modeId) || {};
        this.storage.setProgress(this.modeId, { ...existing, ...toPersist });
      }
    }

    loadBestScore() {
      return this.storage?.getBestScore(this.modeId) || 0;
    }

    saveBestScore(score) {
      if (score > this.state.bestScore) {
        this.setState({ bestScore: score });
        this.storage?.setBestScore(this.modeId, score);
        return true;
      }
      return false;
    }

    // Timer management
    startCountdownTimer(durationMs, onTick, onComplete) {
      this.cancelTimer();
      this.timer = TimerService.createCountdown(durationMs, onTick, onComplete);
    }

    startCountUpTimer(onTick, maxDurationMs) {
      this.cancelTimer();
      this.timer = TimerService.createCountUp(onTick, maxDurationMs);
    }

    pauseTimer() { this.timer?.pause(); }
    resumeTimer() { this.timer?.resume(); }
    cancelTimer() { this.timer?.cancel(); this.timer = null; }

    // Game lifecycle
    start() {
      this.setState({
        status: 'playing',
        score: 0,
        startedAt: Date.now(),
        endedAt: null
      });
      this.onStart();
    }

    pause() {
      if (this.state.status === 'playing') {
        this.setState({ status: 'paused' });
        this.pauseTimer();
        this.onPause();
      }
    }

    resume() {
      if (this.state.status === 'paused') {
        this.setState({ status: 'playing' });
        this.resumeTimer();
        this.onResume();
      }
    }

    handleAnswer(correct) {
      if (this.progression) {
        this.progression.onAnswer(correct);
        this.applyProgressionConfig();
      }
      this.onAnswer(correct);
    }

    applyProgressionConfig() {
      if (!this.progression) return;

      const config = this.progression.getCurrentConfig?.() || {};
      this.setState({
        difficulty: config.difficulty || this.progression.getCurrentDifficulty?.(),
        level: config.level || this.progression.getCurrentLevel?.(),
        timer: config.timer,
        range: config.range
      });
    }

    gameOver(won = false) {
      this.cancelTimer();
      this.setState({
        status: won ? 'won' : 'gameover',
        endedAt: Date.now()
      });

      // Best score is the highest score reached, whether the run was won or lost
      if (this.state.score > 0) {
        this.saveBestScore(this.state.score);
      }

      this.onGameOver(won);
      this.updateView();
    }

    /**
     * Soft reset: returns THIS instance to its idle initial state.
     * It does NOT create a new instance and does NOT call start().
     * "Main Lagi" must go through App.restartGame(), which destroys this
     * instance and creates a fresh one (see ADR-006).
     */
    reset() {
      this.cancelTimer();
      this.clearScheduled();
      this.removeListeners();
      this.state = this.getInitialState();
      this.notifySubscribers();
      this.onReset();
    }

    // Override in subclasses
    onStart() {}
    onPause() {}
    onResume() {}
    onAnswer(correct) {}
    onGameOver(won) {}
    onReset() {}

    /** Translate a UI string (falls back to the given Indonesian text). */
    t(key, fallback, params) {
      const i18n = window.NgitungKuy?.I18n;
      return i18n ? i18n.t(key, fallback, params) : (fallback ?? key);
    }

    // Render - override in subclasses
    render() {}
    bindEvents(container) {}

    // ---- Lifecycle helpers (tracked, auto-cleaned on destroy) -------------

    /** setTimeout that is cancelled automatically by destroy()/reset(). */
    schedule(callback, delay) {
      if (this.destroyed) return null;
      const id = setTimeout(() => {
        this._scheduled.delete(id);
        if (!this.destroyed) callback();
      }, delay);
      this._scheduled.add(id);
      return id;
    }

    clearScheduled() {
      this._scheduled.forEach(id => clearTimeout(id));
      this._scheduled.clear();
    }

    /** addEventListener that is removed automatically by destroy()/reset(). */
    listen(target, type, handler, options) {
      if (!target || this.destroyed) return () => {};
      target.addEventListener(type, handler, options);
      const dispose = () => target.removeEventListener(type, handler, options);
      this._disposers.push(dispose);
      return dispose;
    }

    removeListeners() {
      this._disposers.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
      this._disposers = [];
    }

    /** Default view update: render() into #game-area, then bindEvents(). */
    updateView() {
      if (this.destroyed) return;
      const container = document.getElementById('game-area');
      if (!container) return;
      container.innerHTML = this.render();
      this.bindEvents(container);
    }

    /**
     * Standard Game Over / result card with "Main Lagi" + "Dashboard".
     * stats: [{ label, value }]
     */
    renderResult({ icon = '🏁', title, description = '', score = null, scoreLabel = this.t('game.score', 'Skor'), stats = [], tone = 'neutral', continueLabel = null }) {
      return `
        <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
          <section class="game-result-card ${tone}">
            <div class="game-result-icon" aria-hidden="true">${icon}</div>
            <h2 class="game-result-title" id="game-result-title">${title}</h2>
            ${description ? `<p class="game-result-description">${description}</p>` : ''}
            ${score !== null ? `<div class="game-result-score" aria-label="${scoreLabel}">${score}</div><p class="game-result-meta">${scoreLabel}</p>` : ''}
            ${stats.length ? `<dl class="game-result-stats">${stats.map(s => `<div><dt>${s.label}</dt><dd>${s.value}</dd></div>`).join('')}</dl>` : ''}
            <div class="game-result-actions">
              ${continueLabel ? `<button class="btn btn-primary" type="button" data-result-action="continue">${continueLabel}</button>` : ''}
              <button class="btn ${continueLabel ? 'btn-secondary' : 'btn-primary'}" type="button" data-result-action="restart">${this.t('game.playAgain', 'Main Lagi')}</button>
              <button class="btn btn-secondary" type="button" data-result-action="dashboard">${this.t('game.dashboard', 'Dashboard')}</button>
            </div>
          </section>
        </div>`;
    }

    /** Wire the buttons produced by renderResult(). Call from bindEvents(). */
    bindResultActions(container, handlers = {}) {
      const app = () => window.NgitungKuy.App;
      if (handlers.continue) {
        container.querySelector('[data-result-action="continue"]')
          ?.addEventListener('click', handlers.continue);
      }
      container.querySelector('[data-result-action="restart"]')
        ?.addEventListener('click', () => app().restartGame());
      container.querySelector('[data-result-action="dashboard"]')
        ?.addEventListener('click', () => app().exitToDashboard());
    }

    // Math helpers driven by the user's settings --------------------------

    pickOperation() {
      const ops = (this.config.operations && this.config.operations.length)
        ? this.config.operations
        : [this.config.operation || 'addition'];
      return ops[Math.floor(Math.random() * ops.length)];
    }

    resolveRange(operation) {
      const preset = DifficultyEngine.getRange(operation, this.config.difficulty);
      const custom = this.config.range;
      if (!this.config.rangeCustom || !custom) return preset;
      if (operation === 'division') return { ...preset, maxDividend: custom.max };
      return { ...preset, min: custom.min, max: custom.max };
    }

    generateMathQuestion(operation = this.pickOperation()) {
      return MathEngine.generateQuestion(operation, this.resolveRange(operation), this.config.difficulty);
    }

    // Cleanup
    destroy() {
      this.destroyed = true;
      this.cancelTimer();
      this.clearScheduled();
      this.removeListeners();
      this.subscribers.clear();
    }
  }

  // ============================================================================
  // SOUND SERVICE (assets/sounds: click, correct, wrong) - mengikuti pengaturan Suara
  // ============================================================================

  const SoundService = {
    FILES: {
      click: 'assets/sounds/click.mp3',
      keypad: 'assets/sounds/keypad.mp3',
      correct: 'assets/sounds/correct.wav',
      wrong: 'assets/sounds/wrong.mp3'
    },
    MUSIC_FILE: 'assets/sounds/background-music.mp3',
    MUSIC_VOLUME: 0.25,
    _music: null,
    _musicWanted: false,
    _audio: {},
    _lastClick: 0,

    isEnabled() {
      try {
        return window.NgitungKuy?.Settings?.get('soundEnabled') !== false;
      } catch (e) {
        return true;
      }
    },

    _get(name) {
      if (!this._audio[name]) {
        try {
          const a = new Audio(this.FILES[name]);
          a.preload = 'auto';
          this._audio[name] = a;
        } catch (e) {
          return null;
        }
      }
      return this._audio[name];
    },

    preload() {
      Object.keys(this.FILES).forEach(n => this._get(n));
    },

    play(name) {
      if (!this.FILES[name] || !this.isEnabled()) return;
      const base = this._get(name);
      if (!base) return;
      try {
        // Klon agar bunyi bisa tumpang tindih (klik beruntun)
        const a = base.cloneNode();
        a.volume = (name === 'click' || name === 'keypad') ? 0.6 : 1;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* audio tidak tersedia */ }
    },

    isMusicEnabled() {
      try {
        return window.NgitungKuy?.Settings?.get('musicEnabled') !== false;
      } catch (e) {
        return true;
      }
    },

    /**
     * Sinkronkan musik latar dengan pengaturan Musik. Browser memblokir autoplay sebelum ada
     * interaksi pengguna, jadi jika play() ditolak, musik dimulai pada interaksi berikutnya.
     */
    syncMusic() {
      if (!this._music) {
        try {
          const a = new Audio(this.MUSIC_FILE);
          a.loop = true;
          a.preload = 'auto';
          a.volume = this.MUSIC_VOLUME;
          this._music = a;
        } catch (e) {
          return;
        }
      }
      const a = this._music;
      if (this.isMusicEnabled() && !document.hidden) {
        const p = a.play();
        if (p && p.catch) p.catch(() => { /* menunggu interaksi pengguna */ });
      } else {
        a.pause();
      }
    },

    initMusic() {
      if (this._musicBound) return;
      this._musicBound = true;
      this.syncMusic();
      // Mulai pada interaksi pertama bila autoplay diblokir
      const resume = () => { if (this._music && this._music.paused) this.syncMusic(); };
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, resume, true));
      document.addEventListener('visibilitychange', () => this.syncMusic());
      window.NgitungKuy?.Settings?.on?.('*', () => this.syncMusic());
    },

    /** Suara klik untuk semua elemen interaktif (pointer & keyboard). */
    initClickSounds() {
      if (this._clickBound) return;
      this._clickBound = true;

      const SELECTOR = 'button, a[href], [role="button"], select, label.toggle, input[type="checkbox], .card, .grid-cell, .symmetry-cell, .pz-tile, .mm-card, .option-btn, .keypad-btn, .mode-card';

      const soundFor = (e) => {
        const el = e.target && e.target.closest
          ? e.target.closest(SELECTOR)
          : null;

        if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') {
          return null;
        }

        return el.closest('.number-keypad') ? 'keypad' : 'click';
      };

      // Suara hanya diputar ketika elemen benar-benar diklik
      document.addEventListener('click', (e) => {
        const snd = soundFor(e);
        if (snd) {
          this._lastClick = Date.now();
          this.play(snd);
        }
      }, true);
    }
  };

  SoundService.preload();
  const initSound = () => {
    SoundService.initClickSounds();
    SoundService.initMusic();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSound);
  } else {
    initSound();
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.MathEngine = MathEngine;
  window.NgitungKuy.TimerService = TimerService;
  window.NgitungKuy.InteractionHelper = InteractionHelper;
  window.NgitungKuy.DifficultyEngine = DifficultyEngine;
  window.NgitungKuy.AdaptiveProgression = AdaptiveProgression;
  window.NgitungKuy.FixedLevelProgression = FixedLevelProgression;
  window.NgitungKuy.Sound = SoundService;
  window.NgitungKuy.BaseGame = BaseGame;

})();