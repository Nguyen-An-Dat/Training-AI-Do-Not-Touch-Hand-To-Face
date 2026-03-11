/**
 * Theme Manager - Quản lý Dark/Light Mode
 */

const THEME_KEY = 'hand_detection_theme';

class ThemeManager {
  constructor() {
    this.theme = this.loadTheme();
    this.listeners = [];
    this.applyTheme();
  }

  loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved;
      
      // Kiểm tra system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (e) {
      return 'light';
    }
  }

  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    this.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this.applyTheme();
    this.notifyListeners();
  }

  getTheme() {
    return this.theme;
  }

  isDark() {
    return this.theme === 'dark';
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  applyTheme() {
    const root = document.documentElement;
    root.data = root.dataset || {};
    root.dataset.theme = this.theme;
    
    if (this.theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.theme));
  }
}

export default new ThemeManager();
