/**
 * Notification Manager - Quản lý thông báo nâng cao
 * Hỗ trợ: Desktop Notification, Vibration, Volume Control, Cooldown
 */

const NOTIF_KEY = 'hand_detection_notifications';

const defaultSettings = {
  desktopEnabled: false,       // Web Notification API
  vibrationEnabled: true,      // navigator.vibrate
  vibrationPattern: [200, 100, 200], // ms: buzz, pause, buzz
  volume: 0.8,                 // 0.0 – 1.0
  cooldown: 3000,              // ms between identical alerts
  showBadge: true,             // Hiện badge đếm số lần cảnh báo
};

class NotificationManager {
  constructor() {
    this.settings = this._load();
    this._lastNotifTime = 0;
    this._listeners = [];
  }

  // ===== SETTINGS =====

  _load() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
    } catch {
      return { ...defaultSettings };
    }
  }

  _save() {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(this.settings));
      this._notify();
    } catch (e) {
      console.error('NotificationManager save error:', e);
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    this._save();
  }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  _notify() {
    this._listeners.forEach(cb => cb(this.settings));
  }

  // ===== DESKTOP NOTIFICATIONS =====

  /**
   * Yêu cầu quyền gửi thông báo desktop
   * @returns {Promise<'granted'|'denied'|'default'>}
   */
  async requestDesktopPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      this.updateSettings({ desktopEnabled: true });
    }
    return result;
  }

  /**
   * Lấy trạng thái quyền thông báo hiện tại
   */
  getDesktopPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Gửi thông báo desktop
   * @param {string} title
   * @param {string} body
   */
  sendDesktopNotification(title, body = '') {
    if (!this.settings.desktopEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'hand-detection-alert',
        renotify: true,
      });
    } catch (e) {
      console.warn('Desktop notification failed:', e);
    }
  }

  // ===== VIBRATION =====

  /**
   * Rung thiết bị theo pattern đã cấu hình
   */
  vibrate() {
    if (!this.settings.vibrationEnabled) return;
    if (!('vibrate' in navigator)) return;
    try {
      navigator.vibrate(this.settings.vibrationPattern);
    } catch (e) {
      console.warn('Vibration failed:', e);
    }
  }

  // ===== COMBINED ALERT =====

  /**
   * Gửi toàn bộ cảnh báo (desktop + rung) theo cài đặt
   * Có cooldown để tránh spam
   * @param {string} title
   * @param {string} body
   */
  alert(title, body = '') {
    const now = Date.now();
    if (now - this._lastNotifTime < this.settings.cooldown) return;
    this._lastNotifTime = now;

    this.sendDesktopNotification(title, body);
    this.vibrate();
  }

  /**
   * Trả về volume đang cấu hình (0.0 – 1.0)
   */
  getVolume() {
    return this.settings.volume;
  }
}

export default new NotificationManager();
