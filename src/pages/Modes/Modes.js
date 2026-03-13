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

const MODE_META = {
  [WORK_MODES.NORMAL]: {
    title: 'Chế Độ Bình Thường',
    description: 'Giám sát cân bằng cho công việc hằng ngày',
    color: '#3b82f6',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 2"/>
      </svg>
    ),
  },
  [WORK_MODES.POMODORO]: {
    title: 'Pomodoro',
    description: 'Chu kỳ tập trung cao độ và nghỉ ngắn có kiểm soát',
    color: '#ef4444',
    icon: <PomodoroIcon />,
  },
  [WORK_MODES.STUDY]: {
    title: 'Chế Độ Học Tập',
    description: 'Tối ưu nhắc nghỉ hợp lý cho các phiên học dài',
    color: '#10b981',
    icon: <BookIcon />,
  },
  [WORK_MODES.AMBIENT]: {
    title: 'Chế Độ Ambient',
    description: 'Hoạt động nền nhẹ nhàng, giảm tối đa gây xao nhãng',
    color: '#8b5cf6',
    icon: <WaveIcon />,
  },
};

const ModeCard = ({ mode, isActive, onSelect, settings }) => {
  const meta = MODE_META[mode];

  return (
    <article
      className={`mode-card ${isActive ? 'active' : ''}`}
      style={{ '--mode-color': meta.color }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      <div className="mode-card__head">
        <div className="mode-card__icon-wrap">
          <div className="mode-card__icon">{meta.icon}</div>
        </div>
        <span className="mode-card__status">{isActive ? 'Đang dùng' : 'Sẵn sàng'}</span>
      </div>

      <div className="mode-card__content">
        <h3>{meta.title}</h3>
        <p>{meta.description}</p>
      </div>

      <div className={`mode-card__check ${isActive ? 'checked' : ''}`}>
        {isActive ? '✓' : ''}
      </div>

      {settings && <div className="mode-card__settings">{settings}</div>}
    </article>
  );
};

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
        currentMode,
        modes,
        timestamp: new Date().toISOString(),
        description: 'Saved mode preset',
      });
      setPresets(presetManager.getAllPresets());
      setNewPresetName('');
      setShowPresetForm(false);
    }
  };

  const handleLoadPreset = (id) => {
    const preset = presetManager.getPreset(id);
    if (!preset?.data?.modes || !preset?.data?.currentMode) {
      window.alert('Preset này không có đủ dữ liệu cấu hình để tải.');
      return;
    }

    const presetModes = preset.data.modes;

    if (presetModes.pomodoro) {
      modeManager.updateModeConfig('pomodoro', presetModes.pomodoro);
    }
    if (presetModes.study) {
      modeManager.updateModeConfig('study', presetModes.study);
    }
    if (presetModes.ambient) {
      modeManager.updateModeConfig('ambient', presetModes.ambient);
    }

    modeManager.setMode(preset.data.currentMode);
  };

  const handleDeletePreset = (id) => {
    if (window.confirm('Xóa preset này?')) {
      presetManager.deletePreset(id);
      setPresets(presetManager.getAllPresets());
    }
  };

  return (
    <div className="modes modes-pro">
      <div className="modes__header">
        <div>
          <h1>Work Modes</h1>
          <p>Tối ưu nhịp làm việc bằng cấu hình chuyên nghiệp cho từng bối cảnh.</p>
        </div>
        <div className="modes__header-chip">
          <span>Đang hoạt động</span>
          <strong>{MODE_META[currentMode]?.title || 'Chế độ mặc định'}</strong>
        </div>
      </div>

      <section className="modes-section">
        <div className="section-headline">
          <h2>Chọn chế độ vận hành</h2>
          <p>Nhấn vào thẻ để kích hoạt và điều chỉnh cấu hình chi tiết.</p>
        </div>

        <div className="modes-grid">
          <ModeCard
            mode={WORK_MODES.NORMAL}
            isActive={currentMode === WORK_MODES.NORMAL}
            onSelect={() => selectMode(WORK_MODES.NORMAL)}
          />

          <ModeCard
            mode={WORK_MODES.POMODORO}
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
                          workDuration: (parseInt(e.target.value, 10) || 1) * 60 * 1000,
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
                          breakDuration: (parseInt(e.target.value, 10) || 1) * 60 * 1000,
                        })
                      }
                    />
                    <span>phút</span>
                  </div>
                </div>
              )
            }
          />

          <ModeCard
            mode={WORK_MODES.STUDY}
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
                          breakInterval: (parseInt(e.target.value, 10) || 15) * 60 * 1000,
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

          <ModeCard
            mode={WORK_MODES.AMBIENT}
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

      <section className="modes-section">
        <div className="section-header">
          <h2>Preset cấu hình</h2>
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
          <div className="presets-list presets-grid">
            {presets.map((preset) => (
              <div key={preset.id} className="preset-item preset-card">
                <div className="preset-info">
                  <h3>{preset.name}</h3>
                  <p>
                    Tạo: {new Date(preset.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="preset-actions">
                  <button className="btn-small btn-load" onClick={() => handleLoadPreset(preset.id)}>
                    📥 Tải
                  </button>
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

      <section className="modes-section tips-pro">
        <h2>Gợi ý sử dụng</h2>
        <div className="tips-grid">
          <article>
            <h3>⚡ Pomodoro</h3>
            <p>Phù hợp cho các tác vụ cần tập trung sâu và có deadline rõ ràng.</p>
          </article>
          <article>
            <h3>📚 Study</h3>
            <p>Lý tưởng cho học dài phiên với nhịp nghỉ định kỳ để tránh quá tải.</p>
          </article>
          <article>
            <h3>🌙 Ambient</h3>
            <p>Dùng khi họp hoặc làm việc nhẹ, hạn chế âm thanh và giảm nhiễu giao diện.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Modes;
