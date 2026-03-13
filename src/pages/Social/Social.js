import React, { useState, useEffect, useRef } from 'react';
import socialManager, { AVATAR_COLORS, ACHIEVEMENTS } from '../../utils/socialManager';
import statisticsManager from '../../utils/statisticsManager';
import './Social.css';

const TIER_COLOR = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#f59e0b' };
const TIER_LABEL = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng' };

function Avatar({ nickname, color, size = 48 }) {
  const initial = (nickname || '?')[0].toUpperCase();
  return (
    <div
      className="social-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

export default function Social() {
  const [profile, setProfile] = useState(() => socialManager.getProfile());
  const [nicknameInput, setNicknameInput] = useState(() => socialManager.getProfile().nickname);
  const [editingProfile, setEditingProfile] = useState(false);
  const [overallStats, setOverallStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [shareText, setShareText] = useState('');
  const [shareJson, setShareJson] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const stats = statisticsManager.getOverallStats();
    setOverallStats(stats);
    const ach = socialManager.computeAchievements(stats);
    setAchievements(ach);
    const board = socialManager.upsertSelf(stats);
    setLeaderboard(board);
    setShareText(socialManager.generateShareText(stats, ach));
    setShareJson(socialManager.exportShareEntry(stats));
    return () => clearTimeout(toastTimer.current);
  }, []);

  const handleSaveProfile = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    const updated = socialManager.setProfile({ nickname: trimmed });
    setProfile(updated);
    setEditingProfile(false);
    // Refresh leaderboard self entry
    const stats = statisticsManager.getOverallStats();
    const board = socialManager.upsertSelf(stats);
    setLeaderboard(board);
    const ach = socialManager.computeAchievements(stats);
    setShareText(socialManager.generateShareText(stats, ach));
    setShareJson(socialManager.exportShareEntry(stats));
    showToast('Đã lưu hồ sơ!');
  };

  const handleColorSelect = (color) => {
    const updated = socialManager.setProfile({ avatarColor: color });
    setProfile(updated);
    const stats = statisticsManager.getOverallStats();
    const board = socialManager.upsertSelf(stats);
    setLeaderboard(board);
    setShareJson(socialManager.exportShareEntry(stats));
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(shareText).then(() => showToast('Đã sao chép!')).catch(() => showToast('Không thể sao chép', 'error'));
  };

  const handleCopyShareJson = () => {
    navigator.clipboard.writeText(shareJson).then(() => showToast('Đã sao chép mã chia sẻ!')).catch(() => showToast('Không thể sao chép', 'error'));
  };

  const handleImportFriend = () => {
    const result = socialManager.importFriend(importInput.trim());
    if (result.success) {
      setLeaderboard(result.board);
      setImportInput('');
      setShowImportPanel(false);
      showToast('Đã thêm bạn bè vào bảng xếp hạng!');
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  };

  const handleRemoveFriend = (id) => {
    const board = socialManager.removeFriend(id);
    setLeaderboard(board);
    showToast('Đã xóa khỏi bảng xếp hạng');
  };

  const score = overallStats ? socialManager.computeScore(overallStats) : 0;
  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="social">
      {toast && <div className={`social-toast social-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="social__header">
        <h1>🏆 Xã Hội & Thành Tích</h1>
        <p>Theo dõi tiến trình, chia sẻ thành tích và thử thách bạn bè</p>
      </div>

      {/* ===== PROFILE CARD ===== */}
      <section className="social-section">
        <h2 className="social-section__title">👤 Hồ Sơ</h2>
        <div className="profile-card">
          <div className="profile-card__avatar-area">
            <Avatar nickname={profile.nickname} color={profile.avatarColor} size={72} />
            <div className="profile-avatar-colors">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  className={`avatar-color-btn ${profile.avatarColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => handleColorSelect(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div className="profile-card__info">
            {editingProfile ? (
              <div className="profile-edit-row">
                <input
                  className="profile-name-input"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                  maxLength={30}
                  autoFocus
                />
                <button className="btn-profile-save" onClick={handleSaveProfile}>Lưu</button>
                <button className="btn-profile-cancel" onClick={() => { setEditingProfile(false); setNicknameInput(profile.nickname); }}>Hủy</button>
              </div>
            ) : (
              <div className="profile-name-row">
                <h3 className="profile-name">{profile.nickname}</h3>
                <button className="btn-profile-edit" onClick={() => setEditingProfile(true)}>✏️ Đổi tên</button>
              </div>
            )}
            <div className="profile-stats-row">
              <div className="profile-stat">
                <span className="profile-stat__value">{score.toLocaleString('vi-VN')}</span>
                <span className="profile-stat__label">Điểm số</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat__value">{overallStats?.totalSessions || 0}</span>
                <span className="profile-stat__label">Phiên</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat__value">{earnedCount}/{ACHIEVEMENTS.length}</span>
                <span className="profile-stat__label">Thành tích</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat__value">{overallStats?.totalTouches || 0}</span>
                <span className="profile-stat__label">Lần chạm</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ACHIEVEMENTS ===== */}
      <section className="social-section">
        <h2 className="social-section__title">🏅 Thành Tích ({earnedCount}/{ACHIEVEMENTS.length})</h2>
        <div className="achievements-grid">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`achievement-card ${ach.earned ? 'earned' : 'locked'}`}
              style={ach.earned ? { '--tier-color': TIER_COLOR[ach.tier] } : {}}
            >
              <div className="achievement-card__icon">{ach.icon}</div>
              <div className="achievement-card__body">
                <div className="achievement-card__title">{ach.title}</div>
                <div className="achievement-card__desc">{ach.desc}</div>
                {ach.earned && (
                  <div className="achievement-card__tier" style={{ color: TIER_COLOR[ach.tier] }}>
                    {TIER_LABEL[ach.tier]}
                  </div>
                )}
              </div>
              {!ach.earned && <div className="achievement-card__lock">🔒</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ===== SHARE CARD ===== */}
      <section className="social-section">
        <h2 className="social-section__title">📤 Chia Sẻ Thành Tích</h2>
        <div className="share-panel">
          <div className="share-panel__actions">
            <button className="btn-share" onClick={() => setShowShareCard(s => !s)}>
              {showShareCard ? '▲ Ẩn thẻ' : '▼ Xem thẻ chia sẻ'}
            </button>
            <button className="btn-share" onClick={handleCopyShareText}>📋 Sao chép văn bản</button>
            <button className="btn-share btn-share--json" onClick={handleCopyShareJson}>🔗 Sao chép mã thử thách</button>
          </div>
          {showShareCard && (
            <pre className="share-text-card">{shareText}</pre>
          )}
          <p className="share-hint">
            💡 Gửi <strong>mã thử thách</strong> cho bạn bè để họ nhập vào bảng xếp hạng và so sánh điểm số.
          </p>
        </div>
      </section>

      {/* ===== LEADERBOARD ===== */}
      <section className="social-section">
        <h2 className="social-section__title">📊 Bảng Xếp Hạng</h2>
        <div className="leaderboard">
          {leaderboard.length === 0 ? (
            <p className="leaderboard-empty">Chưa có ai trong bảng. Hãy mời bạn bè!</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Người chơi</th>
                  <th className="text-right">Điểm</th>
                  <th className="text-right">Phiên</th>
                  <th className="text-right">Chạm tay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.id} className={entry.isSelf ? 'leaderboard-self' : ''}>
                    <td className="rank-cell">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td>
                      <div className="leaderboard-player">
                        <Avatar nickname={entry.nickname} color={entry.avatarColor} size={32} />
                        <span className="leaderboard-name">{entry.nickname}</span>
                        {entry.isSelf && <span className="self-badge">Bạn</span>}
                      </div>
                    </td>
                    <td className="text-right score-cell">{entry.score.toLocaleString('vi-VN')}</td>
                    <td className="text-right">{entry.totalSessions}</td>
                    <td className="text-right">{entry.totalTouches}</td>
                    <td>
                      {!entry.isSelf && (
                        <button className="btn-remove-friend" onClick={() => handleRemoveFriend(entry.id)} title="Xóa">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Import friend */}
          <div className="import-friend">
            <button className="btn-import" onClick={() => setShowImportPanel(s => !s)}>
              {showImportPanel ? '▲ Hủy' : '➕ Thêm bạn bè (dán mã thử thách)'}
            </button>
            {showImportPanel && (
              <div className="import-panel">
                <textarea
                  className="import-textarea"
                  placeholder="Dán mã JSON từ bạn vào đây..."
                  value={importInput}
                  onChange={e => setImportInput(e.target.value)}
                  rows={5}
                />
                <button className="btn-import-confirm" onClick={handleImportFriend} disabled={!importInput.trim()}>
                  ✓ Thêm vào bảng
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
