/**
 * Statistics Manager - Quản lý dữ liệu thống kê
 * Lưu trữ data vào localStorage
 */

const STATS_KEY = 'hand_detection_stats';
const SESSION_KEY = 'current_session';

// Cấu trúc data mặc định
const defaultStats = {
  sessions: [], // Danh sách các phiên làm việc
  daily: {}, // Thống kê theo ngày
};

const defaultSession = {
  startTime: null,
  endTime: null,
  touchEvents: [], // Mảng các sự kiện chạm
  trainingData: {
    trainedAt: null,
    successRate: 0, // %
  },
};

class StatisticsManager {
  constructor() {
    this.loadStats();
  }

  // Load thống kê từ localStorage
  loadStats() {
    try {
      const data = localStorage.getItem(STATS_KEY);
      this.stats = data ? JSON.parse(data) : { ...defaultStats };
    } catch (e) {
      console.error('Error loading stats:', e);
      this.stats = { ...defaultStats };
    }
  }

  // Lưu thống kê vào localStorage
  saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Error saving stats:', e);
    }
  }

  // Bắt đầu phiên làm việc mới
  startSession() {
    const session = {
      ...defaultSession,
      startTime: new Date().toISOString(),
      id: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  // Lấy phiên hiện tại
  getCurrentSession() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      console.error('Error getting current session:', e);
      return null;
    }
  }

  // Cập nhật phiên hiện tại
  updateCurrentSession(updates) {
    const session = this.getCurrentSession();
    if (!session) return;

    const updated = { ...session, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  }

  // Ghi lại sự kiện chạm mặt
  recordTouch(confidence = 0.8) {
    const session = this.getCurrentSession();
    if (!session) return;

    const touchEvent = {
      time: new Date().toISOString(),
      timestamp: Date.now(),
      confidence,
    };

    session.touchEvents.push(touchEvent);
    this.updateCurrentSession(session);
    this.saveStats();
  }

  // Kết thúc phiên làm việc
  endSession() {
    const session = this.getCurrentSession();
    if (!session) return null;

    session.endTime = new Date().toISOString();
    const duration = new Date(session.endTime) - new Date(session.startTime);

    // Thêm vào stats
    this.stats.sessions.push(session);

    // Cập nhật thống kê hàng ngày
    const date = new Date(session.startTime).toISOString().split('T')[0];
    if (!this.stats.daily[date]) {
      this.stats.daily[date] = {
        sessions: 0,
        totalDuration: 0,
        touchCount: 0,
        events: [],
      };
    }

    this.stats.daily[date].sessions += 1;
    this.stats.daily[date].totalDuration += duration;
    this.stats.daily[date].touchCount += session.touchEvents.length;
    this.stats.daily[date].events.push(...session.touchEvents);

    this.saveStats();
    localStorage.removeItem(SESSION_KEY);

    return {
      ...session,
      duration,
    };
  }

  // Ghi nhận training thành công
  recordTrainingSuccess(successRate = 95) {
    const session = this.getCurrentSession();
    if (!session) return;

    session.trainingData = {
      trainedAt: new Date().toISOString(),
      successRate,
    };
    this.updateCurrentSession(session);
  }

  // Lấy thống kê hôm nay
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    return this.stats.daily[today] || null;
  }

  // Lấy thống kê tuần này (7 ngày gần nhất)
  getWeekStats() {
    const weekData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      weekData[dateStr] = this.stats.daily[dateStr] || {
        sessions: 0,
        totalDuration: 0,
        touchCount: 0,
        events: [],
      };
    }
    return weekData;
  }

  // Lấy thống kê tháng này
  getMonthStats() {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    const monthData = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr.startsWith(currentMonth)) {
        monthData[dateStr] = this.stats.daily[dateStr] || {
          sessions: 0,
          totalDuration: 0,
          touchCount: 0,
          events: [],
        };
      }
    }
    return monthData;
  }

  // Lấy tất cả phiên làm việc
  getAllSessions() {
    return this.stats.sessions || [];
  }

  // Lấy thống kê tổng hợp
  getOverallStats() {
    const sessions = this.stats.sessions || [];
    const totalSessions = sessions.length;
    const totalTouches = sessions.reduce((sum, s) => sum + s.touchEvents.length, 0);
    const totalDuration = sessions.reduce((sum, s) => {
      return sum + (new Date(s.endTime) - new Date(s.startTime));
    }, 0);
    const avgTouchPerSession = totalSessions > 0 ? totalTouches / totalSessions : 0;

    return {
      totalSessions,
      totalTouches,
      totalDuration,
      avgTouchPerSession,
      totalDays: Object.keys(this.stats.daily).length,
    };
  }

  // Xóa tất cả dữ liệu
  clearAllData() {
    this.stats = { ...defaultStats };
    this.saveStats();
    localStorage.removeItem(SESSION_KEY);
  }

  // Xuất dữ liệu ra JSON
  exportData() {
    return JSON.stringify(this.stats, null, 2);
  }

  // Nhập dữ liệu từ JSON
  importData(jsonData) {
    try {
      this.stats = JSON.parse(jsonData);
      this.saveStats();
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }
}

export default new StatisticsManager();
