/**
 * Social Manager — Profile, Achievements, Leaderboard, Share
 * Tất cả dữ liệu lưu trong localStorage (không cần server)
 */

const PROFILE_KEY = 'hand_detection_profile';
const LEADERBOARD_KEY = 'hand_detection_leaderboard';

export const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

export const ACHIEVEMENTS = [
  {
    id: 'first_session',
    icon: '🎯',
    title: 'Bắt Đầu Hành Trình',
    desc: 'Hoàn thành phiên làm việc đầu tiên',
    tier: 'bronze',
    condition: (s) => s.totalSessions >= 1,
  },
  {
    id: 'sessions_5',
    icon: '💪',
    title: 'Chăm Chỉ',
    desc: 'Hoàn thành 5 phiên làm việc',
    tier: 'bronze',
    condition: (s) => s.totalSessions >= 5,
  },
  {
    id: 'sessions_20',
    icon: '🌟',
    title: 'Kiên Trì',
    desc: 'Hoàn thành 20 phiên làm việc',
    tier: 'silver',
    condition: (s) => s.totalSessions >= 20,
  },
  {
    id: 'marathon',
    icon: '⏱️',
    title: 'Marathon',
    desc: 'Làm việc trung bình hơn 20 phút mỗi phiên',
    tier: 'silver',
    condition: (s) => s.totalSessions >= 1 && (s.totalDuration / s.totalSessions) >= 20 * 60000,
  },
  {
    id: 'dedicated',
    icon: '🔥',
    title: 'Tận Tâm',
    desc: 'Tổng thời gian làm việc hơn 2 giờ',
    tier: 'gold',
    condition: (s) => s.totalDuration >= 2 * 60 * 60 * 1000,
  },
  {
    id: 'clean_hands',
    icon: '😇',
    title: 'Bàn Tay Sạch',
    desc: 'Dưới 30 lần chạm tổng, với ít nhất 3 phiên',
    tier: 'silver',
    condition: (s) => s.totalSessions >= 3 && s.totalTouches < 30,
  },
  {
    id: 'improving',
    icon: '📈',
    title: 'Tiến Bộ',
    desc: 'Dưới 3 lần chạm trung bình mỗi phiên (tối thiểu 5 phiên)',
    tier: 'gold',
    condition: (s) => s.totalSessions >= 5 && s.avgTouchPerSession < 3,
  },
  {
    id: 'week_user',
    icon: '🗓️',
    title: 'Người Dùng Tuần',
    desc: 'Sử dụng ứng dụng trong ít nhất 7 ngày khác nhau',
    tier: 'gold',
    condition: (s) => s.totalDays >= 7,
  },
];

const TIER_ORDER = { bronze: 0, silver: 1, gold: 2 };

function computeScore(stats) {
  if (!stats || stats.totalSessions === 0) return 0;
  const sessionPts = stats.totalSessions * 100;
  const timePts = Math.floor((stats.totalDuration || 0) / 60000) * 2;
  const penalty = (stats.totalTouches || 0) * 5;
  return Math.max(0, sessionPts + timePts - penalty);
}

class SocialManager {
  // ===== PROFILE =====

  getProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : { nickname: 'Người Dùng', avatarColor: AVATAR_COLORS[0] };
    } catch {
      return { nickname: 'Người Dùng', avatarColor: AVATAR_COLORS[0] };
    }
  }

  setProfile(updates) {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    return updated;
  }

  // ===== ACHIEVEMENTS =====

  computeAchievements(overallStats) {
    const stats = overallStats || { totalSessions: 0, totalTouches: 0, totalDuration: 0, avgTouchPerSession: 0, totalDays: 0 };
    return ACHIEVEMENTS.map(a => ({
      ...a,
      earned: a.condition(stats),
    })).sort((a, b) => {
      // Sort: earned first, then by tier desc
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
    });
  }

  // ===== SCORE =====

  computeScore(overallStats) {
    return computeScore(overallStats);
  }

  // ===== LEADERBOARD =====

  getLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  upsertSelf(overallStats) {
    const profile = this.getProfile();
    const score = computeScore(overallStats);
    const entry = {
      id: 'self',
      isSelf: true,
      nickname: profile.nickname,
      avatarColor: profile.avatarColor,
      score,
      totalSessions: overallStats?.totalSessions || 0,
      totalTouches: overallStats?.totalTouches || 0,
      totalDuration: overallStats?.totalDuration || 0,
      updatedAt: new Date().toISOString(),
    };
    const board = this.getLeaderboard().filter(e => e.id !== 'self');
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    return board;
  }

  importFriend(json) {
    try {
      const entry = typeof json === 'string' ? JSON.parse(json) : json;
      if (!entry.nickname || typeof entry.score !== 'number') throw new Error('Dữ liệu không hợp lệ');
      if (entry.id === 'self') entry.id = 'friend_' + Date.now();
      entry.isSelf = false;
      const board = this.getLeaderboard().filter(e => e.id !== entry.id);
      board.push(entry);
      board.sort((a, b) => b.score - a.score);
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
      return { success: true, board };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  removeFriend(id) {
    const board = this.getLeaderboard().filter(e => e.id !== id);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    return board;
  }

  // ===== SHARE =====

  exportShareEntry(overallStats) {
    const profile = this.getProfile();
    return JSON.stringify({
      id: 'friend_' + Date.now(),
      nickname: profile.nickname,
      avatarColor: profile.avatarColor,
      score: computeScore(overallStats),
      totalSessions: overallStats?.totalSessions || 0,
      totalTouches: overallStats?.totalTouches || 0,
      totalDuration: overallStats?.totalDuration || 0,
      updatedAt: new Date().toISOString(),
    }, null, 2);
  }

  generateShareText(overallStats, achievements) {
    const profile = this.getProfile();
    const score = computeScore(overallStats);
    const earned = achievements.filter(a => a.earned);
    const hours = Math.floor((overallStats?.totalDuration || 0) / 3600000);
    const mins = Math.floor(((overallStats?.totalDuration || 0) % 3600000) / 60000);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const lines = [
      `🤖 Bỏ Tay Ra — Thành tích của ${profile.nickname}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⭐ Điểm số:        ${score.toLocaleString('vi-VN')}`,
      `📊 Số phiên:       ${overallStats?.totalSessions || 0}`,
      `⏱️  Tổng thời gian: ${timeStr}`,
      `👋 Tổng chạm tay:  ${overallStats?.totalTouches || 0}`,
      `🏅 Thành tích: ${earned.length}/${achievements.length} — ${earned.map(a => a.icon).join(' ')}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔗 Thử thách bạn bè: ai ít chạm tay hơn?`,
    ];
    return lines.join('\n');
  }
}

export default new SocialManager();
