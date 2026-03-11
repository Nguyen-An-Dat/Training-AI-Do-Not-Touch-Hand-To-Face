import React, { useState, useEffect } from 'react';
import modeManager, { WORK_MODES, presetManager } from '../../utils/modeManager';
import './Modes.css';

const PomodoroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const WaveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707-.707M3 12h1m16 0h1M4.22 19.78l.707-.707M18.364 5.636l.707.707"/>
    <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>
  </svg>
);

const ModeCard = ({ title, description, icon, isActive, onSelect, settings }) => (
  <div className={`mode-card ${isActive ? 'active' : ''}`} onClick={onSelect}>
    <div className="mode-card__icon">{icon}</div>
    <div className="mode-card__content">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    {settings && (
      <div className="mode-card__settings">
        {settings}
      </div>
    )}
    {isActive && <div className="mode-card__badge">✓ Đang sử dụng</div>}
  </div>
);

function Modes() {
  const [currentMode, setCurrentMode] = useState(() => modeManager.getMode());
  const [modes, setModes] = useState(() => modeManager.modes);
  const [presets, setPresets] = useState(() => presetManager.getAllPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);

  useEffect(() => {
    const unsubscribe = modeManager.subscribe((newModes) => {
      setModes(newModes);
      setCurrentMode(newModes.current);
    });
    return unsubscribe;
  }, []);

  const selectMode = (mode) => {
    modeManager.setMode(mode);
  };

  const updateModeConfig = (mode, config) => {
    modeManager.updateModeConfig(mode, config);
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      presetManager.savePreset(newPresetName, {
        timestamp: new Date().toISOString(),
        description: 'Saved model preset',
      });
      setPresets(presetManager.getAllPresets());
      setNewPresetName('');
      setShowPresetForm(false);
    }
  };

  const handleDeletePreset = (id) => {
    if (window.confirm('Xóa preset này?')) {
      presetManager.deletePreset(id);
      setPresets(presetManager.getAllPresets());
    }
  };

  return (
    <div className="modes">
      <div className="modes__header">
        <h1>Chế Độ Làm Việc</h1>
        <p>Chọn chế độ phù hợp với nhu cầu của bạn</p>
      </div>

      {/* Mode Selection */}
      <section className="modes-section">
        <h2>Chế Độ Hiện Tại</h2>
        <div className="modes-grid">
          {/* Normal Mode */}
          <ModeCard
            title="Chế Độ Bình Thường"
            description="Giám sát thường xuyên, thích hợp cho công việc hàng ngày"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
            isActive={currentMode === WORK_MODES.NORMAL}
            onSelect={() => selectMode(WORK_MODES.NORMAL)}
          />

          {/* Pomodoro Mode */}
          <ModeCard
            title="Pomodoro"
            description="Làm việc 25 phút, nghỉ 5 phút (4 chu kỳ)"
            icon={<PomodoroIcon />}
            isActive={currentMode === WORK_MODES.POMODORO}
            onSelect={() => selectMode(WORK_MODES.POMODORO)}
            settings={
              currentMode === WORK_MODES.POMODORO && (
                <div className="mode-settings">
                  <div className="setting-item">
                    <label>Thời gian làm việc</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={modes.pomodoro.workDuration / 1000 / 60}
                      onChange={(e) =>
                        updateModeConfig('pomodoro', {
                          workDuration: parseInt(e.target.value) * 60 * 1000,
                        })
                      }
                    />
                    <span>phút</span>
                  </div>
                  <div className="setting-item">
                    <label>Thời gian nghỉ</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={modes.pomodoro.breakDuration / 1000 / 60}
                      onChange={(e) =>
                        updateModeConfig('pomodoro', {
                          breakDuration: parseInt(e.target.value) * 60 * 1000,
                        })
                      }
                    />
                    <span>phút</span>
                  </div>
                </div>
              )
            }
          />

          {/* Study Mode */}
          <ModeCard
            title="Chế Độ Học Tập"
            description="Tối ưu hóa cho học tập, 45 phút làm + 10 phút nghỉ"
            icon={<BookIcon />}
            isActive={currentMode === WORK_MODES.STUDY}
            onSelect={() => selectMode(WORK_MODES.STUDY)}
            settings={
              currentMode === WORK_MODES.STUDY && (
                <div className="mode-settings">
                  <div className="setting-item">
                    <label>Khoảng cảnh báo</label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      value={modes.study.breakInterval / 1000 / 60}
                      onChange={(e) =>
                        updateModeConfig('study', {
                          breakInterval: parseInt(e.target.value) * 60 * 1000,
                        })
                      }
                    />
                    <span>phút</span>
                  </div>
                  <div className="setting-item checkbox">
                    <input
                      type="checkbox"
                      checked={modes.study.notifications}
                      onChange={(e) =>
                        updateModeConfig('study', { notifications: e.target.checked })
                      }
                    />
                    <label>Bật thông báo tạm dừng</label>
                  </div>
                </div>
              )
            }
          />

          {/* Ambient Mode */}
          <ModeCard
            title="Chế Độ Ambient"
            description="Chạy ở nền, không làm phiền, chỉ cảnh báo lặng lẽ"
            icon={<WaveIcon />}
            isActive={currentMode === WORK_MODES.AMBIENT}
            onSelect={() => selectMode(WORK_MODES.AMBIENT)}
            settings={
              currentMode === WORK_MODES.AMBIENT && (
                <div className="mode-settings">
                  <div className="setting-item checkbox">
                    <input
                      type="checkbox"
                      checked={modes.ambient.silentNotifications}
                      onChange={(e) =>
                        updateModeConfig('ambient', { silentNotifications: e.target.checked })
                      }
                    />
                    <label>Cảnh báo lặng lẽ (không phát âm thanh)</label>
                  </div>
                  <div className="setting-item checkbox">
                    <input
                      type="checkbox"
                      checked={modes.ambient.minimizeUI}
                      onChange={(e) =>
                        updateModeConfig('ambient', { minimizeUI: e.target.checked })
                      }
                    />
                    <label>Thu gọn giao diện</label>
                  </div>
                </div>
              )
            }
          />
        </div>
      </section>

      {/* Presets */}
      <section className="modes-section">
        <div className="section-header">
          <h2>Preset Models</h2>
          <button className="btn btn-primary" onClick={() => setShowPresetForm(!showPresetForm)}>
            {showPresetForm ? '✕ Hủy' : '+ Lưu Preset'}
          </button>
        </div>

        {showPresetForm && (
          <div className="preset-form">
            <input
              type="text"
              placeholder="Tên preset (ví dụ: Office, Home...)"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSavePreset}>
              Lưu
            </button>
          </div>
        )}

        {presets.length > 0 ? (
          <div className="presets-list">
            {presets.map((preset) => (
              <div key={preset.id} className="preset-item">
                <div className="preset-info">
                  <h3>{preset.name}</h3>
                  <p>
                    Tạo: {new Date(preset.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="preset-actions">
                  <button className="btn-small btn-load">📥 Tải</button>
                  <button
                    className="btn-small btn-delete"
                    onClick={() => handleDeletePreset(preset.id)}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">Chưa có preset nào</div>
        )}
      </section>

      {/* Tips */}
      <section className="modes-section tips">
        <h2>Mẹo</h2>
        <ul>
          <li><strong>Pomodoro:</strong> Hiệu quả cho tập trung cao độ, phù hợp khi cần hoàn thành công việc</li>
          <li><strong>Study Mode:</strong> Dành cho học sinh/sinh viên, nhắc nhở gián đoạn hợp lý</li>
          <li><strong>Ambient Mode:</strong> Lý tưởng khi bạn đang trong cuộc họp hoặc không muốn bị làm phiền</li>
          <li><strong>Presets:</strong> Lưu các cấu hình khác nhau cho từng hoàn cảnh sử dụng</li>
        </ul>
      </section>
    </div>
  );
}

export default Modes;
