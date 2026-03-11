import React, { useState, useEffect, useRef } from 'react';
import dataManager from '../../utils/dataManager';
import statisticsManager from '../../utils/statisticsManager';
import './DataManagement.css';

const DatabaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`dm-toast dm-toast--${type}`}>
      {type === 'success' ? <CheckIcon /> : <AlertIcon />}
      <span>{message}</span>
    </div>
  );
}

function DataManagement() {
  const [modelMeta, setModelMeta] = useState(() => dataManager.getModelMeta());
  const [toast, setToast] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null); // 'model' | 'backup'
  const modelFileRef = useRef();
  const backupFileRef = useRef();

  const showToast = (message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  };

  const refreshMeta = () => setModelMeta(dataManager.getModelMeta());

  // ===== MODEL =====

  const handleExportModel = () => {
    const result = dataManager.exportModelToFile();
    if (result.success) {
      showToast('Đã xuất model thành công!');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleImportModel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const result = await dataManager.importModelFromFile(file, null);
    if (result.success) {
      showToast('Đã nhập model thành công! Khởi động lại AI để dùng.');
      refreshMeta();
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleClearModel = () => {
    dataManager.clearModel();
    refreshMeta();
    setConfirmClear(null);
    showToast('Đã xoá model đã lưu.', 'info');
  };

  // ===== STATS =====

  const handleExportStatsJSON = () => {
    const data = statisticsManager.exportData();
    dataManager.exportStatsToJSON(data);
    showToast('Đã xuất thống kê dạng JSON!');
  };

  const handleExportStatsCSV = () => {
    const overallStats = statisticsManager.getOverallStats();
    if (!overallStats || overallStats.length === 0) {
      showToast('Không có dữ liệu thống kê để xuất.', 'error');
      return;
    }
    dataManager.exportStatsToCSV(overallStats);
    showToast('Đã xuất thống kê dạng CSV!');
  };

  const handleImportStats = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const result = statisticsManager.importData(data);
        if (result && result.success !== false) {
          showToast('Đã nhập dữ liệu thống kê thành công!');
        } else {
          showToast('File thống kê không hợp lệ.', 'error');
        }
      } catch {
        showToast('Không thể đọc file thống kê.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ===== BACKUP =====

  const handleFullBackup = () => {
    const result = dataManager.exportFullBackup();
    if (result.success) {
      showToast('Đã tạo backup toàn bộ dữ liệu!');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const result = await dataManager.importFullBackup(file);
    if (result.success) {
      showToast(`Đã khôi phục ${result.restoredKeys.length} mục dữ liệu. Tải lại trang để áp dụng.`);
      refreshMeta();
    } else {
      showToast(result.error, 'error');
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleString('vi-VN');
  };

  return (
    <div className="dm">
      {/* Header */}
      <div className="dm__header">
        <div className="dm__header-content">
          <DatabaseIcon />
          <div>
            <h1>Quản Lý Dữ Liệu</h1>
            <p>Lưu model AI, xuất thống kê và sao lưu toàn bộ cài đặt</p>
          </div>
        </div>
      </div>

      {/* Model Section */}
      <div className="dm-section">
        <h2>🧠 Model AI (KNN Classifier)</h2>

        <div className="dm-model-status">
          {dataManager.hasModel() ? (
            <div className="dm-model-info">
              <div className="dm-model-info__badge saved">
                <CheckIcon /> Model đã lưu
              </div>
              {modelMeta && (
                <div className="dm-model-info__details">
                  <div className="dm-detail-row">
                    <span>Thời gian lưu:</span>
                    <strong>{formatDate(modelMeta.savedAt)}</strong>
                  </div>
                  <div className="dm-detail-row">
                    <span>Nhãn:</span>
                    <strong>{modelMeta.labels?.join(', ') || '—'}</strong>
                  </div>
                  <div className="dm-detail-row">
                    <span>Số mẫu:</span>
                    <strong>
                      {modelMeta.sampleCounts
                        ? Object.entries(modelMeta.sampleCounts)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' / ')
                        : '—'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dm-model-info__badge unsaved">
              <AlertIcon /> Chưa có model được lưu
            </div>
          )}
        </div>

        <div className="dm-actions">
          <button className="dm-btn dm-btn--primary" onClick={handleExportModel} disabled={!dataManager.hasModel()}>
            <DownloadIcon /> Xuất model
          </button>

          <label className="dm-btn dm-btn--secondary">
            <input
              ref={modelFileRef}
              type="file"
              accept=".json"
              onChange={handleImportModel}
              style={{ display: 'none' }}
            />
            <UploadIcon /> Nhập model từ file
          </label>

          {dataManager.hasModel() && (
            confirmClear === 'model' ? (
              <div className="dm-confirm">
                <span>Xác nhận xoá model?</span>
                <button className="dm-btn dm-btn--danger-sm" onClick={handleClearModel}>Xoá</button>
                <button className="dm-btn dm-btn--ghost-sm" onClick={() => setConfirmClear(null)}>Huỷ</button>
              </div>
            ) : (
              <button className="dm-btn dm-btn--danger" onClick={() => setConfirmClear('model')}>
                <TrashIcon /> Xoá model
              </button>
            )
          )}
        </div>

        <p className="dm-hint">
          💡 Sau khi train AI, nhấn <strong>"Lưu Model"</strong> trong màn hình chính để lưu lại. Lần sau mở app có thể tải lên mà không cần train lại.
        </p>
      </div>

      {/* Statistics Export Section */}
      <div className="dm-section">
        <h2>📊 Xuất / Nhập Thống Kê</h2>
        <div className="dm-actions">
          <button className="dm-btn dm-btn--primary" onClick={handleExportStatsJSON}>
            <DownloadIcon /> Xuất JSON
          </button>
          <button className="dm-btn dm-btn--secondary" onClick={handleExportStatsCSV}>
            <DownloadIcon /> Xuất CSV
          </button>
          <label className="dm-btn dm-btn--secondary">
            <input
              type="file"
              accept=".json"
              onChange={handleImportStats}
              style={{ display: 'none' }}
            />
            <UploadIcon /> Nhập thống kê
          </label>
        </div>
        <p className="dm-hint">
          💡 Xuất CSV để mở trong Excel/Google Sheets. Xuất JSON để sao lưu hoặc nhập lại sau.
        </p>
      </div>

      {/* Full Backup Section */}
      <div className="dm-section">
        <h2>🗄️ Sao Lưu & Khôi Phục Toàn Bộ</h2>
        <p className="dm-section__desc">
          Backup bao gồm: thống kê, model AI, cài đặt giao diện, chế độ làm việc và presets.
        </p>
        <div className="dm-actions">
          <button className="dm-btn dm-btn--success" onClick={handleFullBackup}>
            <SaveIcon /> Tạo Backup
          </button>
          <label className="dm-btn dm-btn--secondary">
            <input
              ref={backupFileRef}
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              style={{ display: 'none' }}
            />
            <UploadIcon /> Khôi Phục Backup
          </label>
        </div>
        <p className="dm-hint">
          ⚠️ Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại. Sau khi khôi phục, hãy tải lại trang.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default DataManagement;
