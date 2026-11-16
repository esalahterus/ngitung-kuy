/**
 * Ngitung Kuy - Main Application Entry Point
 * Handles routing, navigation, and game initialization
 */

(function() {
  'use strict';

  const GAME_CLASSES = {
    learning: 'Learning',
    timed: 'Timed',
    timeBased: 'TimeBased',
    connect: 'Connect',
    puzzle: 'Puzzle',
    minMax: 'MinMax',
    trueFalse: 'TrueFalse',
    numberGrid: 'NumberGrid',
    numberPuzzle: 'NumberPuzzle',
    mirrorSymmetry: 'Symmetry'
  };

  // Dashboard order (explicit array; do not rely on object key order)
  const MODE_ORDER = [
    'learning', 'timed', 'timeBased', 'connect', 'puzzle', 'minMax',
    'trueFalse', 'numberGrid', 'numberPuzzle', 'mirrorSymmetry'
  ];

  // Game metadata for dashboard
  const GAME_METADATA = {
    learning: {
      name: 'Learning',
      icon: 'learning',
      description: 'Latihan soal dengan keypad numerik',
      operations: true
    },
    timed: {
      name: 'Timed',
      icon: 'timed',
      description: 'Pilihan ganda 10 detik per soal',
      operations: true
    },
    timeBased: {
      name: 'Time-Based',
      icon: 'time-based',
      description: 'Timer count-up, streak bonus',
      operations: true
    },
    connect: {
      name: 'Connect',
      icon: 'connect',
      description: 'Hubungkan soal dengan jawaban',
      operations: true
    },
    puzzle: {
      name: 'Puzzle',
      icon: 'puzzle',
      description: 'Susun persamaan dengan drag-drop',
      operations: true
    },
    minMax: {
      name: 'Min-Max',
      icon: 'min-max',
      description: 'Urutkan operasi MAX ke MIN',
      operations: true
    },
    trueFalse: {
      name: 'True/False',
      icon: 'true-false',
      description: 'Benar/Salah 10 level',
      operations: true
    },
    numberGrid: {
      name: 'Number Grid',
      icon: 'number-grid',
      description: 'Cocokkan pasangan 9 kolom',
      operations: false
    },
    numberPuzzle: {
      name: 'Number Puzzle',
      icon: 'number-puzzle',
      description: 'Slide puzzle 1-15',
      operations: false
    },
    mirrorSymmetry: {
      name: 'Mirror Symmetry',
      icon: 'symmetry',
      description: 'Cermin pola kiri-kanan',
      operations: false
    }
  };

  // SVG Icons for each game
  const GAME_ICONS = {
    learning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h12M6 12h12M6 16h8"></path></svg>`,
    timed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    timeBased: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
    connect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    puzzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v12H6z"></path><path d="M10 7h4v4h-4z"></path></svg>`,
    minMax: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    trueFalse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path><path d="M18 6L9 15l-5-5"></path></svg>`,
    numberGrid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><path d="M10 10h4v4h-4z"></path></svg>`,
    numberPuzzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><path d="M10 10L17 17"></path></svg>`,
    mirrorSymmetry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9-3-9H2"></path><path d="M2 12h4l3-9 3 9h4"></path></svg>`
  };

  // App state
  let paused = false;
  let currentGame = null;
  let currentView = 'dashboard';
  let currentModeId = null;

  // Initialize app
  async function initApp() {
    // Wait for dependencies
    await new Promise(resolve => {
      const check = () => {
        if (window.NgitungKuy?.Storage && window.NgitungKuy?.Settings) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });

      // Initialize Storage and Settings
      if (window.NgitungKuy?.Storage) window.NgitungKuy?.Storage.init?.();
      if (window.NgitungKuy?.Settings) window.NgitungKuy?.Settings.init?.();

      // Language
      window.NgitungKuy?.I18n?.applyTranslations();

      // Setup routing
      setupRouting();

      // Setup global event listeners
      setupGlobalListeners();

      // Initial view is resolved by setupRouting() -> handleHashChange()

      console.log('Ngitung Kuy initialized');
  }

  // Hash-based routing
  function setupRouting() {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial load
  }

  function handleHashChange() {
    const hash = window.location.hash
      .slice(1)
      .replace(/^\/+/, '') || 'dashboard';

    const [view, ...params] = hash.split('/');

    switch (view) {
      case 'dashboard':
        navigateTo('dashboard');
        break;
      case 'mode':
        if (params[0]) {
          navigateToMode(params[0], params[1] === 'play');
        }
        break;
      case 'settings':
        navigateTo('settings');
        break;
      case 'stats': // Out of MVP scope (DECISION-MATRIX #26)
        navigateTo('dashboard');
        break;
      default:
        navigateTo('dashboard');
    }
  }

  function disposeCurrentGame() {
    if (currentGame) {
      try { currentGame.destroy(); } catch (error) { console.warn('Game cleanup failed:', error); }
    }
    currentGame = null;
    window.currentGame = null;
    const area = document.getElementById('game-area');
    if (area) area.innerHTML = '';
    const info = document.getElementById('game-header-info');
    if (info) info.innerHTML = '';
    paused = false;
  }

  function restartGame() {
    if (currentModeId) startGame(currentModeId);
  }

  function exitToDashboard() {
    disposeCurrentGame();
    if (window.location.hash !== '#/dashboard') window.location.hash = '#/dashboard';
    else navigateTo('dashboard');
  }

  function navigateTo(view) {
    if (view !== 'gameplay') disposeCurrentGame();
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show target view
    const targetView = document.getElementById(`${view}-view`);
    if (targetView) {
      targetView.classList.add('active');
    }

    currentView = view;

    // View-specific initialization
    switch (view) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'settings':
        renderSettings();
        break;
    }
  }

  function navigateToMode(modeId, play = false) {
    const metadata = GAME_METADATA[modeId];
    if (!metadata) {
      navigateTo('dashboard');
      return;
    }

    currentModeId = modeId;

    if (play) {
      startGame(modeId);
    } else {
      // Show mode intro
      const introView = document.getElementById('mode-intro-view');
      if (introView) {
        document.getElementById('mode-intro-title').textContent = window.NgitungKuy?.I18n?.t(`games.${modeId}.name`, metadata.name) || metadata.name;
        document.getElementById('mode-instructions').innerHTML = getModeInstructions(modeId);
        renderModeSettings(modeId);
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        introView.classList.add('active');
        currentView = 'mode-intro';
      }
    }
  }

  function startGame(modeId) {
    disposeCurrentGame();
    const GameClass = window.NgitungKuy?.Games?.[GAME_CLASSES[modeId]];
    if (!GameClass) {
      console.error(`Game class not found for ${modeId}`);
      return;
    }

    // Get config from settings
    const S = window.NgitungKuy?.Settings;
    const operations = (S.get('operations') || []).filter(Boolean);
    const config = {
      operation: operations[0] || S.get('operation'),
      operations: operations.length ? operations : [S.get('operation')],
      range: S.get('range'),
      rangeCustom: !!S.get('rangeCustom'),
      difficulty: S.get('difficulty')
    };

    // Create game instance
    currentGame = new GameClass(config);

    // Make globally accessible for inline handlers
    window.currentGame = currentGame;

    // Show gameplay view
    const gameplayView = document.getElementById('gameplay-view');
    if (gameplayView) {
      document.getElementById('game-title').textContent = window.NgitungKuy?.I18n?.t(`games.${modeId}.name`, GAME_METADATA[modeId].name) || GAME_METADATA[modeId].name;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      gameplayView.classList.add('active');
      currentView = 'gameplay';

      // Initialize game
      currentGame.start();
      currentGame.updateView();
    }
  }

  // Dashboard rendering
  function renderDashboard() {
    const grid = document.getElementById('mode-grid');
    if (!grid) return;

    const t = (key, fallback) =>
      window.NgitungKuy?.I18n?.t(key, fallback) || fallback;

    // Load best scores from storage
    const bestScores = window.NgitungKuy?.Storage?.get('bestScore') || {};

    grid.innerHTML = MODE_ORDER.map((modeId) => [modeId, GAME_METADATA[modeId]]).map(([modeId, metadata]) => `
      <a href="#/mode/${modeId}" class="mode-card" role="listitem" aria-label="${t('games.' + modeId + '.name', metadata.name)}">
        <div class="mode-card-icon mode-icon-${modeId}">
          ${GAME_ICONS[modeId]}
        </div>
        <div class="mode-card-content">
          <h3 class="mode-card-title">
            ${t('games.' + modeId + '.name', metadata.name)}
          </h3>
          <p class="mode-card-description">
            ${t('games.' + modeId + '.description', metadata.description)}
          </p>
          <div class="mode-card-meta">
            <span class="mode-card-best-score">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              ${bestScores[modeId] || 0}
            </span>
            <span class="mode-card-play">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </span>
          </div>
        </div>
      </a>
    `).join('');
  }

  // Mode instructions
  function getModeInstructions(modeId) {
    const I18n = window.NgitungKuy?.I18n;
    const counts = {"learning": 5, "timed": 4, "timeBased": 4, "connect": 4, "puzzle": 4, "minMax": 4, "trueFalse": 4, "numberGrid": 4, "numberPuzzle": 4, "mirrorSymmetry": 4};
    const count = counts[modeId];
    if (!count) return '<p>' + I18n.t('app.instructionsUnavailable', 'Instruksi tidak tersedia') + '</p>';
    const items = [];
    for (let i = 1; i <= count; i++) {
      items.push('<li>' + I18n.t(`games.${modeId}.intro.${i}`) + '</li>');
    }
    return '<ul>' + items.join('') + '</ul>';
  }

  const OP_SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };

  function presetRangeFor(op, difficulty) {
    const r = window.NgitungKuy.DifficultyEngine.getRange(op, difficulty);
    return op === 'division' ? { min: 1, max: r.maxDividend } : { min: r.min, max: r.max };
  }

  function renderModeSettings(modeId) {
    const container = document.getElementById('mode-settings');
    if (!container) return;

    const S = window.NgitungKuy?.Settings;
    const t = (key, fallback) => window.NgitungKuy.I18n.t(key, fallback);
    const config = S.getModeConfig(modeId);
    const settings = S.getAll();

    if (!config.operations && !config.range && !config.difficulty) {
      container.innerHTML = `<p class="text-muted text-center">${t('modeSettings.none', 'Mode ini tidak memiliki pengaturan khusus')}</p>`;
      return;
    }

    const activeOps = settings.operations && settings.operations.length ? settings.operations : [settings.operation];
    const effective = settings.rangeCustom ? settings.range : presetRangeFor(activeOps[0], settings.difficulty);

    let html = `<fieldset><legend>${t('modeSettings.title', 'Pengaturan Permainan')}</legend>`;

    if (config.operations) {
      html += `
        <div class="setting-item setting-item-stack">
          <label>${t('modeSettings.operation', 'Operasi')}</label>
          <div class="op-checkboxes" role="group" aria-label="${t('modeSettings.operation', 'Operasi')}">
            ${Object.keys(OP_SYMBOL).map(op => `
              <label class="op-chip">
                <input type="checkbox" name="mode-operation" value="${op}" ${activeOps.includes(op) ? 'checked' : ''}>
                <span>${OP_SYMBOL[op]}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (config.difficulty) {
      html += `
        <div class="setting-item">
          <label for="mode-difficulty">${t('modeSettings.difficulty', 'Kesulitan')}</label>
          <select id="mode-difficulty">
            ${[['very-easy','veryEasy','Sangat Mudah'],['easy','easy','Mudah'],['medium','medium','Sedang'],['hard','hard','Sulit'],['very-hard','veryHard','Sangat Sulit']]
              .map(([v, k, l]) => `<option value="${v}" ${settings.difficulty === v ? 'selected' : ''}>${t('modeSettings.difficulty.' + k, l)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    if (config.range) {
      html += `
        <div class="setting-item">
          <label for="mode-range-min">${t('modeSettings.minNumber', 'Min Angka')}</label>
          <input type="number" id="mode-range-min" value="${effective.min}" min="1" max="500" inputmode="numeric">
        </div>
        <div class="setting-item">
          <label for="mode-range-max">${t('modeSettings.maxNumber', 'Max Angka')}</label>
          <input type="number" id="mode-range-max" value="${effective.max}" min="2" max="500" inputmode="numeric">
        </div>
        <p class="setting-hint" id="range-hint">${settings.rangeCustom ? t('modeSettings.rangeCustomHint', 'Rentang kustom aktif. Ubah Kesulitan untuk kembali ke preset.') : t('modeSettings.rangePresetHint', 'Rentang mengikuti preset kesulitan. Ubah angka untuk membuat rentang kustom.')}</p>
      `;
    }

    html += '</fieldset>';
    container.innerHTML = html;

    container.querySelectorAll('[name="mode-operation"]').forEach(el => {
      el.addEventListener('change', () => {
        const checked = container.querySelectorAll('[name="mode-operation"]:checked');
        if (checked.length === 0) el.checked = true; // keep at least one operation
        saveModeSettings(modeId, 'operations');
      });
    });
    container.querySelector('#mode-difficulty')?.addEventListener('change', () => saveModeSettings(modeId, 'difficulty'));
    container.querySelectorAll('#mode-range-min, #mode-range-max').forEach(el =>
      el.addEventListener('change', () => saveModeSettings(modeId, 'range')));
  }

  function saveModeSettings(modeId, source) {
    const S = window.NgitungKuy?.Settings;
    const settings = {};
    const rangeMin = document.getElementById('mode-range-min');
    const rangeMax = document.getElementById('mode-range-max');
    const difficulty = document.getElementById('mode-difficulty');
    const ops = Array.from(document.querySelectorAll('[name="mode-operation"]:checked')).map(cb => cb.value);

    if (ops.length > 0) {
      settings.operations = ops;
      settings.operation = ops[0];
    }
    if (difficulty) settings.difficulty = difficulty.value;

    if (source === 'range' && rangeMin && rangeMax) {
      let min = Math.max(1, parseInt(rangeMin.value, 10) || 1);
      let max = Math.max(2, parseInt(rangeMax.value, 10) || 20);
      if (min >= max) min = max - 1;
      settings.range = { min, max };
      settings.rangeCustom = true;
    } else if (source === 'difficulty') {
      settings.rangeCustom = false; // choosing a difficulty returns to the preset
    }

    S.setMultiple(settings);
    if (source !== 'range') renderModeSettings(modeId);
  }

  // window.NgitungKuy?.Settings rendering
  function renderSettings() {
    const settings = window.NgitungKuy?.Settings.getAll();

    document.getElementById('setting-sound').checked = settings.soundEnabled;
    document.getElementById('setting-music').checked = settings.musicEnabled;
    document.getElementById('setting-animations').checked = settings.animationsEnabled;
    document.getElementById('setting-theme').value = settings.theme;
    document.getElementById('setting-language').value = settings.language;

  }

  // Global event listeners
  function setupGlobalListeners() {
    // window.NgitungKuy?.Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
      });
    }
    
    // Toggle Suara / Musik / Animasi - simpan & terapkan langsung (tidak ada tombol simpan)
    [['setting-sound', 'soundEnabled'], ['setting-music', 'musicEnabled'], ['setting-animations', 'animationsEnabled']]
      .forEach(([id, key]) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('change', (e) => {
            window.NgitungKuy?.Settings?.set(key, e.target.checked);
          });
        }
      });

    // Theme selector - apply immediately
    const themeSelector = document.getElementById('setting-theme');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        const theme = e.target.value;

        const updated = window.NgitungKuy?.Settings?.set(
          'theme',
          theme
        );

        if (updated) {
          showToast(
            window.NgitungKuy?.I18n?.t('toast.themeChanged'),
            'success'
          );
        }
      });
    }

    // Language selector - apply immediately
    const languageSelector = document.getElementById('setting-language');

    if (languageSelector) {
      languageSelector.addEventListener('change', (e) => {
        const language = e.target.value;

        const updated = window.NgitungKuy?.Settings?.set(
          'language',
          language
        );

        // Apply translations even if the selected value is unchanged
        window.NgitungKuy?.I18n?.applyTranslations();

        // Refresh dynamic dashboard content
        if (currentView === 'dashboard') {
          renderDashboard();
        }

        // Refresh dynamic mode intro content
        if (currentView === 'mode-intro' && currentModeId) {
          navigateToMode(currentModeId);
        }

        if (updated) {
          showToast(
            window.NgitungKuy?.I18n?.t('toast.languageChanged'),
            'success'
          );
        }
      });
    }

    // Modal close
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('modal-close')) {
          closeModal();
        }
      });
    });

    // Toast auto-close
    // (handled in toast creation)

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (paused) { closeModal(); return; }
        const open = document.getElementById('modal-overlay')?.classList.contains('show');
        if (open) { closeModal(); return; }
        if (currentView === 'gameplay' && currentGame && currentGame.state.status === 'playing') {
          showPauseModal();
        }
      }
    });

    // View transition for back buttons
    document.getElementById('back-to-dashboard')?.addEventListener('click', () => {
      disposeCurrentGame();

      // Reset URL agar mode yang sama bisa dibuka kembali
      if (window.location.hash !== '#/dashboard') {
        window.location.hash = '#/dashboard';
      } else {
        navigateTo('dashboard');
      }
    });

    document.getElementById('back-to-mode')?.addEventListener('click', () => {
      disposeCurrentGame();
      navigateToMode(currentModeId);
    });

    document.getElementById('back-from-settings')?.addEventListener('click', () => {
      navigateTo('dashboard');
    });

    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', restartGame);

    // Help button
    document.getElementById('help-btn')?.addEventListener('click', () => {
      showHelpModal();
    });

    // window.NgitungKuy?.Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      navigateTo('settings');
    });

    // Start game button
    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      if (currentModeId) {
        navigateToMode(currentModeId, true);
      }
    });

    // window.NgitungKuy?.Settings exit handler
    window.addEventListener('beforeunload', () => {
      if (currentGame) {
        currentGame.destroy();
      }
    });
  }

  function saveSettings() {
    const settings = {
      soundEnabled: document.getElementById('setting-sound').checked,
      musicEnabled: document.getElementById('setting-music').checked,
      animationsEnabled: document.getElementById('setting-animations').checked,
      theme: document.getElementById('setting-theme').value,
      language: document.getElementById('setting-language').value
    };

    window.NgitungKuy?.Settings.setMultiple(settings);

    window.NgitungKuy?.I18n?.applyTranslations();

    showToast(
      window.NgitungKuy?.I18n?.t('toast.settingsSaved'),
      'success'
    );
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function showHelpModal() {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    const t = (key, fallback) => window.NgitungKuy.I18n.t(key, fallback);
    document.getElementById('modal-title').textContent = t('help.title', 'Bantuan');
    document.getElementById('modal-body').innerHTML = `
      <p><strong>Ngitung Kuy</strong> - ${t('help.tagline', 'Aplikasi latihan matematika interaktif')}</p>
      <p>${t('help.version', 'Versi 1.0')}</p>
      <hr style="margin: 1rem 0;">
      <h4>${t('help.navigation', 'Navigasi:')}</h4>
      <ul>
        <li>${t('help.navDashboard', 'Dashboard: Pilih mode permainan')}</li>
        <li>${t('help.navIntro', 'Mode Intro: Baca instruksi & atur pengaturan')}</li>
        <li>${t('help.navGameplay', 'Gameplay: Mainkan permainan')}</li>
      </ul>
      <hr style="margin: 1rem 0;">
      <h4>${t('help.controls', 'Kontrol:')}</h4>
      <ul>
        <li>${t('help.ctrlTap', 'Klik/Tap: Pilih & interaksi')}</li>
        <li>${t('help.ctrlDrag', 'Drag: Seret elemen (Connect, Puzzle, Min-Max)')}</li>
        <li>${t('help.ctrlEsc', 'Esc: Pause/Kembali')}</li>
      </ul>
      <hr style="margin: 1rem 0;">
      <p class="text-sm text-muted">${t('help.storageNote', 'Data tersimpan di browser (LocalStorage). Menghapus data browser akan menghapus progres.')}</p>
    `;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-primary" onclick="closeModal()">${t('app.close', 'Tutup')}</button>
    `;

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
  }

  function showPauseModal() {
    if (!currentGame) return;
    currentGame.pause();
    paused = true;
    const t = (key, fallback) => window.NgitungKuy.I18n.t(key, fallback);
    document.getElementById('modal-title').textContent = t('pause.title', 'Permainan Dijeda');
    document.getElementById('modal-body').innerHTML = `<p>${t('pause.body', 'Timer dihentikan sementara.')}</p>`;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-primary" id="pause-resume-btn" type="button">${t('game.continue', 'Lanjutkan')}</button>
      <button class="btn btn-secondary" id="pause-exit-btn" type="button">${t('game.dashboard', 'Dashboard')}</button>
    `;
    document.getElementById('pause-resume-btn').addEventListener('click', closeModal);
    document.getElementById('pause-exit-btn').addEventListener('click', () => { closeModal(); exitToDashboard(); });
    const overlay = document.getElementById('modal-overlay');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('show');
    }
    if (paused) {
      paused = false;
      if (currentGame) currentGame.resume();
    }
  }

  // Wait for dependencies to be ready
  function waitForDependencies() {
    return new Promise(resolve => {
      const check = () => {
        if (window.NgitungKuy?.Storage && window.NgitungKuy?.Settings) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForDependencies().then(initApp);
    });
  } else {
    waitForDependencies().then(initApp);
  }

  // Export for global access
  window.closeModal = closeModal;
  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.App = {
    navigateTo,
    navigateToMode,
    startGame,
    restartGame,
    exitToDashboard,
    showToast,
    showHelpModal,
    showPauseModal,
    closeModal
  };
})();