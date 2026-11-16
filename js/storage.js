/**
 * Ngitung Kuy - Storage Manager
 * LocalStorage wrapper dengan schema versioning dan error handling
 */

(function() {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    BEST_SCORE: 'ngitungkuy.bestScore',
    PROGRESS: 'ngitungkuy.progress',
    SETTINGS: 'ngitungkuy.settings',
    PLAYER_PREFS: 'ngitungkuy.playerPrefs'
  };

  // Current schema version
  const SCHEMA_VERSION = 1;

  // Default values
  const DEFAULTS = {
    bestScore: {},
    progress: {},
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      animationsEnabled: true,
      theme: 'light',
      language: 'id',
      operation: 'addition',
      range: { min: 1, max: 20 },
      difficulty: 'easy'
    },
    playerPrefs: {
      theme: 'light',
      language: 'id',
      animations: true
    }
  };

  // Migration functions
  const migrations = {
    1: (data) => {
      // Initial schema - ensure all keys exist
      Object.keys(DEFAULTS).forEach(key => {
        if (!(key in data)) {
          data[key] = DEFAULTS[key];
        }
      });
      return data;
    }
  };

  /**
   * Safe JSON parse dengan fallback
   */
  function safeParse(json, fallback = null) {
    try {
      return JSON.parse(json);
    } catch (e) {
      console.warn('Storage parse error:', e);
      return fallback;
    }
  }

  /**
   * Safe JSON stringify dengan error handling
   */
  function safeStringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      console.error('Storage stringify error:', e);
      return null;
    }
  }

  /**
   * Apply migrations to data
   */
  function migrateData(data) {
    let version = data._version || 0;
    while (version < SCHEMA_VERSION) {
      version++;
      if (migrations[version]) {
        data = migrations[version](data);
      }
    }
    data._version = SCHEMA_VERSION;
    return data;
  }

  /**
   * Get all storage data with migration
   */
  function getAllData() {
    try {
      const raw = localStorage.getItem('ngitungkuy');
      if (!raw) return { ...DEFAULTS, _version: SCHEMA_VERSION };

      const data = safeParse(raw, { ...DEFAULTS, _version: SCHEMA_VERSION });
      return migrateData(data);
    } catch (e) {
      console.error('Storage getAllData error:', e);
      return { ...DEFAULTS, _version: SCHEMA_VERSION };
    }
  }

  /**
   * Save all storage data
   */
  function saveAllData(data) {
    try {
      const json = safeStringify(data);
      if (json !== null) {
        localStorage.setItem('ngitungkuy', json);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Storage saveAllData error:', e);
      // Try to free space by clearing old data
      if (e.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('ngitungkuy');
          localStorage.setItem('ngitungkuy', safeStringify({ ...DEFAULTS, _version: SCHEMA_VERSION }));
        } catch (e2) {
          console.error('Failed to recover from quota exceeded:', e2);
        }
      }
      return false;
    }
  }

  // Public API
  const Storage = {
    /**
     * Get value by key path (supports dot notation)
     */
    get(key, defaultValue = null) {
      const data = getAllData();
      const keys = key.split('.');
      let value = data;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue;
        }
      }
      return value !== undefined ? value : defaultValue;
    },

    /**
     * Set value by key path (supports dot notation)
     */
    set(key, value) {
      const data = getAllData();
      const keys = key.split('.');
      let target = data;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in target) || typeof target[k] !== 'object') {
          target[k] = {};
        }
        target = target[k];
      }

      target[keys[keys.length - 1]] = value;
      return saveAllData(data);
    },

    /**
     * Remove key
     */
    remove(key) {
      const data = getAllData();
      const keys = key.split('.');
      let target = data;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in target) || typeof target[k] !== 'object') {
          return false;
        }
        target = target[k];
      }

      delete target[keys[keys.length - 1]];
      return saveAllData(data);
    },

    /**
     * Clear all data
     */
    clear() {
      try {
        localStorage.removeItem('ngitungkuy');
        return true;
      } catch (e) {
        console.error('Storage clear error:', e);
        return false;
      }
    },

    // ========== BEST SCORE ==========

    /**
     * Get best score for a mode
     */
    getBestScore(modeId) {
      return this.get(`bestScore.${modeId}`, 0);
    },

    /**
     * Set best score for a mode (only if higher)
     */
    setBestScore(modeId, score) {
      const current = this.getBestScore(modeId);
      if (score > current) {
        return this.set(`bestScore.${modeId}`, score);
      }
      return false;
    },

    // ========== PROGRESS ==========

    /**
     * Get progress for a mode
     */
    getProgress(modeId) {
      return this.get(`progress.${modeId}`, {});
    },

    /**
     * Set progress for a mode
     */
    setProgress(modeId, progress) {
      return this.set(`progress.${modeId}`, progress);
    },

    /**
     * Update specific progress field
     */
    updateProgress(modeId, field, value) {
      const progress = this.getProgress(modeId);
      progress[field] = value;
      return this.setProgress(modeId, progress);
    },

    // ========== SETTINGS ==========

    /**
     * Get all settings
     */
    getSettings() {
      return this.get('settings', DEFAULTS.settings);
    },

    /**
     * Update settings (partial update)
     */
    setSettings(partialSettings) {
      const current = this.getSettings();
      const merged = { ...current, ...partialSettings };
      return this.set('settings', merged);
    },

    // ========== PLAYER PREFS ==========

    /**
     * Get player preferences
     */
    getPlayerPrefs() {
      return this.get('playerPrefs', DEFAULTS.playerPrefs);
    },

    /**
     * Set player preferences
     */
    setPlayerPrefs(prefs) {
      return this.set('playerPrefs', prefs);
    },

    // ========== UTILITY ==========

    /**
     * Check if storage is available
     */
    isAvailable() {
      try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Get storage usage info
     */
    getUsage() {
      try {
        let total = 0;
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
          }
        }
        return {
          used: total,
          usedKB: (total / 1024).toFixed(2),
          quota: 5 * 1024 * 1024, // ~5MB typical
          percentUsed: ((total / (5 * 1024 * 1024)) * 100).toFixed(1)
        };
      } catch (e) {
        return null;
      }
    }
  };

  // Export to global namespace
  window.NgitungKuy = window.NgitungKuy || {};
  window.NgitungKuy.Storage = Storage;

})();