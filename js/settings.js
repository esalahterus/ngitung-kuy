
/**
 * Ngitung Kuy - Settings Manager
 * Manages application settings with reactive updates
 */

(function () {
  'use strict';

  const getStorage = () => window.NgitungKuy?.Storage;

  // Default settings
  const DEFAULT_SETTINGS = {
    soundEnabled: true,
    musicEnabled: true,
    animationsEnabled: true,
    theme: 'light',
    language: 'id',

    operation: 'addition',
    operations: ['addition'],
    range: { min: 1, max: 20 },
    rangeCustom: false,
    difficulty: 'easy'
  };

  // Mode-specific settings
  const MODE_SETTINGS_CONFIG = {
    learning: { operations: true, range: true, difficulty: true },
    timed: { operations: true, range: true, difficulty: true },
    timeBased: { operations: true, range: true, difficulty: true },
    connect: { operations: true, range: true, difficulty: true },
    puzzle: { operations: true, range: true, difficulty: true },
    minMax: { operations: true, range: true, difficulty: true },
    trueFalse: { operations: true, range: true, difficulty: true },

    numberGrid: { operations: false, range: false, difficulty: true },
    numberPuzzle: { operations: false, range: false, difficulty: true },
    mirrorSymmetry: { operations: false, range: false, difficulty: false }
  };

  // Difficulty presets
  const DIFFICULTY_RANGES = {
    addition: {
      'very-easy': { min: 1, max: 10, allowNegative: false },
      easy: { min: 1, max: 20, allowNegative: false },
      medium: { min: 1, max: 50, allowNegative: false },
      hard: { min: 1, max: 100, allowNegative: true },
      'very-hard': { min: 1, max: 200, allowNegative: true }
    },

    subtraction: {
      'very-easy': { min: 1, max: 10, allowNegative: false },
      easy: { min: 1, max: 20, allowNegative: false },
      medium: { min: 1, max: 50, allowNegative: false },
      hard: { min: 1, max: 100, allowNegative: true },
      'very-hard': { min: 1, max: 200, allowNegative: true }
    },

    multiplication: {
      'very-easy': { min: 1, max: 5 },
      easy: { min: 1, max: 10 },
      medium: { min: 1, max: 12 },
      hard: { min: 1, max: 15 },
      'very-hard': { min: 1, max: 20 }
    },

    division: {
      'very-easy': { maxDividend: 20, maxDivisor: 5 },
      easy: { maxDividend: 50, maxDivisor: 10 },
      medium: { maxDividend: 100, maxDivisor: 12 },
      hard: { maxDividend: 200, maxDivisor: 15 },
      'very-hard': { maxDividend: 500, maxDivisor: 20 }
    }
  };

  const listeners = new Map();

  // Deep clone
  function clone(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  // Merge saved settings with defaults
  function mergeSettings(defaults, saved) {
    const result = clone(defaults);

    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      return result;
    }

    for (const key of Object.keys(defaults)) {
      if (!Object.prototype.hasOwnProperty.call(saved, key)) {
        continue;
      }

      const defaultValue = defaults[key];
      const savedValue = saved[key];

      if (
        defaultValue &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        savedValue &&
        typeof savedValue === 'object' &&
        !Array.isArray(savedValue)
      ) {
        result[key] = mergeSettings(defaultValue, savedValue);
      } else if (
        Array.isArray(defaultValue) &&
        Array.isArray(savedValue)
      ) {
        result[key] = clone(savedValue);
      } else if (
        typeof savedValue === typeof defaultValue &&
        savedValue !== null
      ) {
        result[key] = savedValue;
      }
    }

    return result;
  }

  function notify(key, value) {
    const exactListeners = listeners.get(key) || [];
    exactListeners.forEach(fn => fn(value));

    // Avoid duplicate notification when key is '*'
    if (key !== '*') {
      const wildcardListeners = listeners.get('*') || [];
      wildcardListeners.forEach(fn => fn(key, value));
    }
  }

  function persist() {
    try {
      const storage = getStorage();
      if (storage) {
        storage.setSettings(clone(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.error('Settings persistence error:', error);
    }
  }

  const Settings = {
    /**
     * Initialize settings
     */
    init() {
      try {
        const storage = getStorage();

        if (storage) {
          const saved = storage.getSettings();
          const merged = mergeSettings(DEFAULT_SETTINGS, saved);

          Object.keys(DEFAULT_SETTINGS).forEach(key => {
            delete DEFAULT_SETTINGS[key];
          });

          Object.assign(DEFAULT_SETTINGS, merged);
        }
      } catch (error) {
        console.error('Settings initialization error:', error);
      }

      this.applyTheme();
      this.applyAnimations();
      return this;
    },

    /**
     * Get all settings
     */
    getAll() {
      return clone(DEFAULT_SETTINGS);
    },

    /**
     * Get specific setting
     */
    get(key) {
      if (typeof key !== 'string' || !key.trim()) {
        return undefined;
      }

      const keys = key.split('.');
      let value = DEFAULT_SETTINGS;

      for (const k of keys) {
        if (
          !value ||
          typeof value !== 'object' ||
          !Object.prototype.hasOwnProperty.call(value, k)
        ) {
          return undefined;
        }

        value = value[k];
      }

      return clone(value);
    },

    /**
     * Set setting value
     */
    set(key, value) {
      if (typeof key !== 'string' || !key.trim()) {
        return false;
      }

      const keys = key.split('.');

      if (keys.some(k =>
        !k || k === '__proto__' ||
        k === 'constructor' || k === 'prototype'
      )) {
        return false;
      }

      let target = DEFAULT_SETTINGS;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];

        if (
          !Object.prototype.hasOwnProperty.call(target, k) ||
          !target[k] ||
          typeof target[k] !== 'object' ||
          Array.isArray(target[k])
        ) {
          return false;
        }

        target = target[k];
      }

      const finalKey = keys[keys.length - 1];

      if (!Object.prototype.hasOwnProperty.call(target, finalKey)) {
        return false;
      }

      const oldValue = target[finalKey];

      if (JSON.stringify(oldValue) === JSON.stringify(value)) {
        return false;
      }

      target[finalKey] = clone(value);

      persist();

      notify(key, clone(value));

      if (key === 'theme') {
        this.applyTheme();
      }

      if (key === 'animationsEnabled') {
        this.applyAnimations();
      }

      return true;
    },

    /**
     * Set multiple settings
     * Persist once after all changes
     */
    setMultiple(settings) {
      if (
        !settings ||
        typeof settings !== 'object' ||
        Array.isArray(settings)
      ) {
        return false;
      }

      let changed = false;
      const changes = [];

      for (const [key, value] of Object.entries(settings)) {
        if (this.setWithoutPersist(key, value)) {
          changed = true;
          changes.push([key, clone(value)]);
        }
      }

      if (changed) {
        persist();

        changes.forEach(([key, value]) => {
          notify(key, value);
        });

        if (changes.some(([key]) => key === 'theme')) {
          this.applyTheme();
        }

        if (changes.some(([key]) => key === 'animationsEnabled')) {
          this.applyAnimations();
        }
      }

      return changed;
    },

    /**
     * Internal setter without persistence
     */
    setWithoutPersist(key, value) {
      if (typeof key !== 'string' || !key.trim()) {
        return false;
      }

      const keys = key.split('.');

      if (keys.some(k =>
        !k || k === '__proto__' ||
        k === 'constructor' || k === 'prototype'
      )) {
        return false;
      }

      let target = DEFAULT_SETTINGS;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];

        if (
          !Object.prototype.hasOwnProperty.call(target, k) ||
          !target[k] ||
          typeof target[k] !== 'object' ||
          Array.isArray(target[k])
        ) {
          return false;
        }

        target = target[k];
      }

      const finalKey = keys[keys.length - 1];

      if (!Object.prototype.hasOwnProperty.call(target, finalKey)) {
        return false;
      }

      if (
        JSON.stringify(target[finalKey]) === JSON.stringify(value)
      ) {
        return false;
      }

      target[finalKey] = clone(value);
      return true;
    },

    /**
     * Subscribe to setting changes
     */
    on(key, callback) {
      if (
        typeof key !== 'string' ||
        typeof callback !== 'function'
      ) {
        return () => {};
      }

      if (!listeners.has(key)) {
        listeners.set(key, []);
      }

      listeners.get(key).push(callback);

      return () => {
        const keyListeners = listeners.get(key) || [];
        const index = keyListeners.indexOf(callback);

        if (index !== -1) {
          keyListeners.splice(index, 1);
        }

        if (keyListeners.length === 0) {
          listeners.delete(key);
        }
      };
    },

    /**
     * Get mode configuration
     */
    getModeConfig(modeId) {
      return clone(
        MODE_SETTINGS_CONFIG[modeId] || {
          operations: false,
          range: false,
          difficulty: false
        }
      );
    },

    /**
     * Get difficulty range
     */
    getDifficultyRange(operation, difficulty) {
      const presets = DIFFICULTY_RANGES[operation];

      if (!presets) {
        return { min: 1, max: 20 };
      }

      return clone(
        presets[difficulty] ||
        presets.easy ||
        Object.values(presets)[0]
      );
    },

    /**
     * Get all difficulty ranges
     */
    getAllDifficultyRanges(operation) {
      return clone(DIFFICULTY_RANGES[operation] || {});
    },

    /**
     * Apply animations setting (CSS: :root[data-animations="off"] mematikan animasi & transisi)
     */
    applyAnimations() {
      if (typeof document === 'undefined') return;
      document.documentElement.setAttribute(
        'data-animations',
        this.get('animationsEnabled') === false ? 'off' : 'on'
      );
    },

    /**
     * Apply theme
     */
    applyTheme() {
      if (typeof document === 'undefined') return;

      const theme = this.get('theme');
      const root = document.documentElement;

      if (theme === 'auto') {
        const prefersDark =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;

        root.setAttribute(
          'data-theme',
          prefersDark ? 'dark' : 'light'
        );
      } else {
        root.setAttribute(
          'data-theme',
          theme === 'dark' ? 'dark' : 'light'
        );
      }
    },

    /**
     * Reset settings
     */
    reset() {
      const defaults = clone({
        soundEnabled: true,
        musicEnabled: true,
        animationsEnabled: true,
        theme: 'light',
        language: 'id',
        operation: 'addition',
        range: { min: 1, max: 20 },
        difficulty: 'easy'
      });

      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        delete DEFAULT_SETTINGS[key];
      });

      Object.assign(DEFAULT_SETTINGS, defaults);

      persist();

      notify('*', this.getAll());

      this.applyTheme();
      this.applyAnimations();
    },

    /**
     * Export settings as JSON
     */
    export() {
      return JSON.stringify(DEFAULT_SETTINGS, null, 2);
    },

    /**
     * Import settings from JSON
     */
    import(jsonString) {
      try {
        const imported = JSON.parse(jsonString);

        if (
          !imported ||
          typeof imported !== 'object' ||
          Array.isArray(imported)
        ) {
          return false;
        }

        return this.setMultiple(imported);
      } catch (error) {
        console.error('Settings import error:', error);
        return false;
      }
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => Settings.init(),
      { once: true }
    );
  } else {
    Settings.init();
  }

  // Export to global namespace
  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Settings = Settings;

})();
