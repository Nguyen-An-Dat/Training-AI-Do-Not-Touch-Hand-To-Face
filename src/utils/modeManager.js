/**
 * Mode Manager - Quản lý các chế độ làm việc
 */

const MODES_KEY = 'hand_detection_modes';
const PRESET_KEY = 'hand_detection_presets';

export const WORK_MODES = {
  NORMAL: 'normal',
  POMODORO: 'pomodoro',
  STUDY: 'study',
  AMBIENT: 'ambient',
};

const defaultModes = {
  current: WORK_MODES.NORMAL,
  pomodoro: {
    workDuration: 25 * 60 * 1000, // 25 phút
    breakDuration: 5 * 60 * 1000, // 5 phút
    sessionsPerCycle: 4,
    enabled: false,
  },
  study: {
    breakInterval: 45 * 60 * 1000, // 45 phút
    breakDuration: 10 * 60 * 1000, // 10 phút
    notifications: true,
    enabled: false,
  },
  ambient: {
    silentNotifications: true, // Không phát âm thanh
    minimizeUI: true, // Ẩn UI khi không cần thiết
    enabled: false,
  },
};

class ModeManager {
  constructor() {
    this.loadModes();
    this.listeners = [];
  }

  loadModes() {
    try {
      const saved = localStorage.getItem(MODES_KEY);
      this.modes = saved ? JSON.parse(saved) : { ...defaultModes };
    } catch (e) {
      console.error('Error loading modes:', e);
      this.modes = { ...defaultModes };
    }
  }

  saveModes() {
    try {
      localStorage.setItem(MODES_KEY, JSON.stringify(this.modes));
      this.notifyListeners();
    } catch (e) {
      console.error('Error saving modes:', e);
    }
  }

  setMode(mode) {
    if (!Object.values(WORK_MODES).includes(mode)) return;
    this.modes.current = mode;
    this.saveModes();
  }

  getMode() {
    return this.modes.current;
  }

  isModeEnabled(mode) {
    if (mode === WORK_MODES.NORMAL) return true;
    return this.modes[mode]?.enabled || false;
  }

  updateModeConfig(mode, config) {
    if (this.modes[mode]) {
      this.modes[mode] = { ...this.modes[mode], ...config };
      this.saveModes();
    }
  }

  getModeConfig(mode) {
    return this.modes[mode] || null;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.modes));
  }
}

export default new ModeManager();

// ============ PRESET MANAGER ============

const defaultPresets = {
  presets: [],
};

class PresetManager {
  constructor() {
    this.loadPresets();
  }

  loadPresets() {
    try {
      const saved = localStorage.getItem(PRESET_KEY);
      this.data = saved ? JSON.parse(saved) : { ...defaultPresets };
    } catch (e) {
      console.error('Error loading presets:', e);
      this.data = { ...defaultPresets };
    }
  }

  savePresets() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving presets:', e);
    }
  }

  // Lưu model training hiện tại làm preset
  savePreset(name, modelData) {
    const preset = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      data: modelData,
    };
    this.data.presets.push(preset);
    this.savePresets();
    return preset;
  }

  // Lấy tất cả presets
  getAllPresets() {
    return this.data.presets || [];
  }

  // Lấy preset theo ID
  getPreset(id) {
    return this.data.presets?.find(p => p.id === id) || null;
  }

  // Xóa preset
  deletePreset(id) {
    this.data.presets = this.data.presets.filter(p => p.id !== id);
    this.savePresets();
  }

  // Cập nhật preset
  updatePreset(id, updates) {
    const preset = this.data.presets?.find(p => p.id === id);
    if (preset) {
      Object.assign(preset, updates, { updatedAt: new Date().toISOString() });
      this.savePresets();
    }
  }

  // Xóa tất cả presets
  clearAllPresets() {
    this.data.presets = [];
    this.savePresets();
  }
}

export const presetManager = new PresetManager();
