/**
 * Data Manager - Quản lý lưu/tải model KNN và xuất/nhập dữ liệu thống kê
 */

import * as tf from '@tensorflow/tfjs';

const MODEL_KEY = 'hand_detection_model';
const MODEL_META_KEY = 'hand_detection_model_meta';

class DataManager {
  // ===== MODEL SAVE / LOAD =====

  /**
   * Lưu dataset của KNN classifier vào localStorage
   * @param {knnClassifier.KNNClassifier} classifier
   * @returns {{ success: boolean, error?: string }}
   */
  saveModel(classifier) {
    try {
      const dataset = classifier.getClassifierDataset();
      if (!dataset || Object.keys(dataset).length === 0) {
        return { success: false, error: 'Chưa có dữ liệu training để lưu.' };
      }

      const serialized = {};
      for (const [label, tensor] of Object.entries(dataset)) {
        serialized[label] = {
          data: Array.from(tensor.dataSync()),
          shape: tensor.shape,
        };
      }

      localStorage.setItem(MODEL_KEY, JSON.stringify(serialized));
      localStorage.setItem(MODEL_META_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        labels: Object.keys(dataset),
        sampleCounts: Object.fromEntries(
          Object.entries(dataset).map(([label, t]) => [label, t.shape[0]])
        ),
      }));

      return { success: true };
    } catch (e) {
      console.error('Error saving model:', e);
      return { success: false, error: 'Không thể lưu model: ' + e.message };
    }
  }

  /**
   * Tải dataset vào KNN classifier từ localStorage
   * @param {knnClassifier.KNNClassifier} classifier
   * @returns {{ success: boolean, error?: string }}
   */
  loadModel(classifier) {
    try {
      const raw = localStorage.getItem(MODEL_KEY);
      if (!raw) {
        return { success: false, error: 'Không tìm thấy model đã lưu.' };
      }

      const serialized = JSON.parse(raw);
      const dataset = {};
      for (const [label, { data, shape }] of Object.entries(serialized)) {
        dataset[label] = tf.tensor(data, shape);
      }

      classifier.setClassifierDataset(dataset);
      return { success: true };
    } catch (e) {
      console.error('Error loading model:', e);
      return { success: false, error: 'Không thể tải model: ' + e.message };
    }
  }

  /**
   * Kiểm tra xem có model đã lưu không
   * @returns {boolean}
   */
  hasModel() {
    return !!localStorage.getItem(MODEL_KEY);
  }

  /**
   * Lấy thông tin metadata của model đã lưu
   * @returns {{ savedAt: string, labels: string[], sampleCounts: object } | null}
   */
  getModelMeta() {
    try {
      const raw = localStorage.getItem(MODEL_META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Xoá model đã lưu
   */
  clearModel() {
    localStorage.removeItem(MODEL_KEY);
    localStorage.removeItem(MODEL_META_KEY);
  }

  /**
   * Xuất model ra file JSON để tải về
   */
  exportModelToFile() {
    const raw = localStorage.getItem(MODEL_KEY);
    const meta = localStorage.getItem(MODEL_META_KEY);
    if (!raw) return { success: false, error: 'Không tìm thấy model.' };

    const blob = new Blob([JSON.stringify({ model: JSON.parse(raw), meta: meta ? JSON.parse(meta) : null }, null, 2)], {
      type: 'application/json',
    });
    this._triggerDownload(blob, `hand_detection_model_${this._dateStamp()}.json`);
    return { success: true };
  }

  /**
   * Nhập model từ file JSON
   * @param {File} file
   * @param {knnClassifier.KNNClassifier} classifier
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  importModelFromFile(file, classifier) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const modelData = parsed.model || parsed; // Support both formats
          const metaData = parsed.meta || null;

          localStorage.setItem(MODEL_KEY, JSON.stringify(modelData));
          if (metaData) {
            localStorage.setItem(MODEL_META_KEY, JSON.stringify(metaData));
          }

          if (classifier) {
            const result = this.loadModel(classifier);
            resolve(result);
          } else {
            resolve({ success: true });
          }
        } catch (err) {
          resolve({ success: false, error: 'File không hợp lệ: ' + err.message });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'Không thể đọc file.' });
      reader.readAsText(file);
    });
  }

  // ===== STATS EXPORT / IMPORT =====

  /**
   * Xuất thống kê ra file JSON
   * @param {object} statsData - Dữ liệu thống kê từ statisticsManager.exportData()
   */
  exportStatsToJSON(statsData) {
    const blob = new Blob([JSON.stringify(statsData, null, 2)], {
      type: 'application/json',
    });
    this._triggerDownload(blob, `hand_detection_stats_${this._dateStamp()}.json`);
  }

  /**
   * Xuất thống kê ra file CSV
   * @param {Array} dailyStats - Mảng thống kê theo ngày [{ date, touchCount, sessionTime, sessionCount }]
   */
  exportStatsToCSV(dailyStats) {
    const headers = ['Ngày', 'Số lần chạm', 'Thời gian (phút)', 'Số phiên'];
    const rows = dailyStats.map(row => [
      row.date,
      row.touchCount,
      Math.round((row.sessionTime || 0) / 60000),
      row.sessionCount || 0,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    this._triggerDownload(blob, `hand_detection_stats_${this._dateStamp()}.csv`);
  }

  // ===== FULL BACKUP / RESTORE =====

  /**
   * Tạo backup toàn bộ dữ liệu (settings, stats, model, modes)
   */
  exportFullBackup() {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {},
    };

    const keys = [
      'hand_detection_stats',
      'hand_detection_theme',
      'hand_detection_modes',
      'hand_detection_presets',
      MODEL_KEY,
      MODEL_META_KEY,
    ];

    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val !== null) backup.data[key] = JSON.parse(val);
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    this._triggerDownload(blob, `hand_detection_backup_${this._dateStamp()}.json`);
    return { success: true };
  }

  /**
   * Khôi phục toàn bộ dữ liệu từ file backup
   * @param {File} file
   * @returns {Promise<{ success: boolean, error?: string, restoredKeys: string[] }>}
   */
  importFullBackup(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup.data) {
            resolve({ success: false, error: 'File backup không hợp lệ.' });
            return;
          }

          const restoredKeys = [];
          for (const [key, value] of Object.entries(backup.data)) {
            localStorage.setItem(key, JSON.stringify(value));
            restoredKeys.push(key);
          }

          resolve({ success: true, restoredKeys });
        } catch (err) {
          resolve({ success: false, error: 'Không thể đọc backup: ' + err.message });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'Không thể đọc file.' });
      reader.readAsText(file);
    });
  }

  // ===== HELPERS =====

  _dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default new DataManager();
