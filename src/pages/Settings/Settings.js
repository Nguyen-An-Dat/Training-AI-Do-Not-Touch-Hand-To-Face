import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import notificationManager from '../../utils/notificationManager';
import './Settings.css';

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SettingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m2.12-2.12l4.24-4.24"/>
  </svg>
);

function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [notifSettings, setNotifSettings] = useState(() => notificationManager.getSettings());
  const [desktopPermission, setDesktopPermission] = useState(() => notificationManager.getDesktopPermission());

  useEffect(() => {
    const unsub = notificationManager.subscribe((s) => setNotifSettings({ ...s }));
    return unsub;
  }, []);

  const handleDesktopToggle = async () => {
    if (notifSettings.desktopEnabled) {
      notificationManager.updateSettings({ desktopEnabled: false });
    } else {
      const perm = await notificationManager.requestDesktopPermission();
      setDesktopPermission(perm);
      if (perm !== 'granted') {
        alert('Trình duyệt chặn quyền thông báo. Vui lòng cho phép trong cài đặt trình duyệt.');
      }
    }
  };

  const handleVibrationToggle = () => {
    notificationManager.updateSettings({ vibrationEnabled: !notifSettings.vibrationEnabled });
  };

  const handleVolumeChange = (e) => {
    notificationManager.updateSettings({ volume: parseFloat(e.target.value) });
  };

  const handleCooldownChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      notificationManager.updateSettings({ cooldown: val * 1000 });
    }
  };

  return (
    <div className="settings">
      <div className="settings__header">
        <div className="settings__header-content">
          <SettingIcon />
          <div>
            <h1>Cài Đặt</h1>
            <p>Tuỳ chỉnh ứng dụng theo sở thích của bạn</p>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="settings-section">
        <h2>Giao Diện</h2>
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Chế Độ Hiển Thị</h3>
            <p>Chọn chế độ sáng hoặc tối</p>
          </div>
          <div className="settings-item__control">
            <div className="theme-selector">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => toggleTheme()}
                title="Chế độ sáng"
              >
                <SunIcon />
                <span>Sáng</span>
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => toggleTheme()}
                title="Chế độ tối"
              >
                <MoonIcon />
                <span>Tối</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="settings-section">
        <h2>🔔 Thông Báo Nâng Cao</h2>

        {/* Desktop Notifications */}
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Thông Báo Desktop</h3>
            <p>
              {desktopPermission === 'unsupported'
                ? 'Trình duyệt không hỗ trợ'
                : desktopPermission === 'denied'
                ? 'Bị từ chối — hãy cho phép trong cài đặt trình duyệt'
                : 'Hiện thông báo ngay cả khi app không ở foreground'}
            </p>
          </div>
          <div className="settings-item__control">
            <button
              className={`toggle-btn ${notifSettings.desktopEnabled ? 'active' : ''}`}
              onClick={handleDesktopToggle}
              disabled={desktopPermission === 'unsupported' || desktopPermission === 'denied'}
            >
              {notifSettings.desktopEnabled ? 'BẬT' : 'TẮT'}
            </button>
          </div>
        </div>

        {/* Vibration */}
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Rung Thiết Bị</h3>
            <p>Rung khi phát hiện chạm tay (chỉ hỗ trợ trên điện thoại/máy tính bảng)</p>
          </div>
          <div className="settings-item__control">
            <button
              className={`toggle-btn ${notifSettings.vibrationEnabled ? 'active' : ''}`}
              onClick={handleVibrationToggle}
            >
              {notifSettings.vibrationEnabled ? 'BẬT' : 'TẮT'}
            </button>
          </div>
        </div>

        {/* Volume */}
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Âm Lượng Cảnh Báo</h3>
            <p>Điều chỉnh âm lượng chuông báo</p>
          </div>
          <div className="settings-item__control settings-item__control--wide">
            <div className="volume-control">
              <span className="volume-icon">🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={notifSettings.volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
              <span className="volume-icon">🔊</span>
              <span className="volume-value">{Math.round(notifSettings.volume * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Cooldown */}
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Thời Gian Hồi (Cooldown)</h3>
            <p>Khoảng cách tối thiểu giữa các lần cảnh báo</p>
          </div>
          <div className="settings-item__control">
            <div className="cooldown-control">
              <input
                type="number"
                min="1"
                max="30"
                value={Math.round(notifSettings.cooldown / 1000)}
                onChange={handleCooldownChange}
                className="cooldown-input"
              />
              <span className="cooldown-unit">giây</span>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <h2>Về Ứng Dụng</h2>
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Tên Ứng Dụng</h3>
            <p>Hand Touch Detection AI</p>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Phiên Bản</h3>
            <p>1.0.0</p>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-item__content">
            <h3>Mô Tả</h3>
            <p>Ứng dụng sử dụng AI để phát hiện và cảnh báo khi bạn chạm tay lên mặt</p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="settings-section">
        <h2>Mẹo Sử Dụng</h2>
        <ul className="tips-list">
          <li>
            <strong>Training tốt:</strong> Hãy train với nhiều khoảnh khắc khác nhau để AI học chính xác hơn
          </li>
          <li>
            <strong>Ánh sáng:</strong> Đảm bảo ánh sáng đủ để camera có thể nhìn rõ tay và mặt
          </li>
          <li>
            <strong>Khoảng cách:</strong> Đứng cách camera khoảng 30-60cm để kết quả tốt nhất
          </li>
          <li>
            <strong>Thẻ đạt:</strong> Nhớ lưu thống kê để theo dõi tiến độ của bạn
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
