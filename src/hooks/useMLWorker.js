import { useEffect, useRef, useCallback } from 'react';

/**
 * Quản lý KNN Classifier trong Web Worker riêng (off main thread).
 * Main thread chỉ chạy MobileNet inference (WebGL); KNN chạy trong worker.
 * Nếu worker không khởi tạo được (offline, CDN chặn...) isReady() trả về false
 * → caller dùng fallback main-thread classifier.
 */
export default function useMLWorker() {
  const workerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingPredictions = useRef(new Map());
  const getDatasetPending = useRef(null);
  const setDatasetPending = useRef(null);

  useEffect(() => {
    let worker;
    try {
      worker = new Worker('/mlWorker.js');
    } catch (e) {
      console.warn('MLWorker: cannot create worker', e);
      return;
    }
    workerRef.current = worker;

    worker.onmessage = ({ data: msg }) => {
      switch (msg.type) {
        case 'ready':
          readyRef.current = true;
          break;

        case 'error':
          console.warn('MLWorker error:', msg.message);
          readyRef.current = false;
          break;

        case 'prediction': {
          const p = pendingPredictions.current.get(msg.id);
          if (p) {
            pendingPredictions.current.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error));
            else p.resolve({ label: msg.label, confidences: msg.confidences });
          }
          break;
        }

        case 'dataset': {
          if (getDatasetPending.current) {
            const p = getDatasetPending.current;
            getDatasetPending.current = null;
            p.resolve(msg.data);
          }
          break;
        }

        case 'datasetLoaded': {
          if (setDatasetPending.current) {
            const p = setDatasetPending.current;
            setDatasetPending.current = null;
            p.resolve();
          }
          break;
        }

        default: break;
      }
    };

    worker.onerror = (e) => {
      console.warn('MLWorker fatal error:', e.message);
      readyRef.current = false;
    };

    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
      // Reject tất cả predictions đang chờ
      for (const [, p] of pendingPredictions.current) {
        p.reject(new Error('Worker terminated'));
      }
      pendingPredictions.current.clear();
      if (getDatasetPending.current) { getDatasetPending.current.resolve(null); getDatasetPending.current = null; }
      if (setDatasetPending.current) { setDatasetPending.current.resolve(); setDatasetPending.current = null; }
    };
  }, []);

  const isReady = useCallback(() => readyRef.current, []);

  /**
   * Thêm ví dụ training (embedding từ MobileNet đã được extract ở main thread)
   * @param {Float32Array} float32Array
   * @param {string} label
   */
  const addExample = useCallback((float32Array, label) => {
    if (!workerRef.current || !readyRef.current) return;
    // Copy buffer vì transfer hoặc GC có thể thu hồi
    const copy = new Float32Array(float32Array);
    workerRef.current.postMessage({ type: 'addExample', buffer: copy.buffer, label }, [copy.buffer]);
  }, []);

  /**
   * Chạy KNN prediction trong worker
   * @param {Float32Array} float32Array
   * @returns {Promise<{ label: string, confidences: object }>}
   */
  const predict = useCallback((float32Array) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !readyRef.current) {
        reject(new Error('worker_not_ready'));
        return;
      }
      const id = `${Date.now()}_${Math.random()}`;
      pendingPredictions.current.set(id, { resolve, reject });
      const copy = new Float32Array(float32Array);
      workerRef.current.postMessage({ type: 'predict', id, buffer: copy.buffer }, [copy.buffer]);
      // Timeout 3s
      setTimeout(() => {
        if (pendingPredictions.current.has(id)) {
          pendingPredictions.current.delete(id);
          reject(new Error('timeout'));
        }
      }, 3000);
    });
  }, []);

  /**
   * Lấy dataset đã train (để lưu vào localStorage)
   * @returns {Promise<{ label: { data: number[], shape: number[] } } | null>}
   */
  const getDataset = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { reject(new Error('no_worker')); return; }
      if (getDatasetPending.current) { reject(new Error('in_progress')); return; }
      getDatasetPending.current = { resolve, reject };
      workerRef.current.postMessage({ type: 'getDataset' });
      setTimeout(() => {
        if (getDatasetPending.current) {
          const p = getDatasetPending.current;
          getDatasetPending.current = null;
          p.reject(new Error('timeout'));
        }
      }, 8000);
    });
  }, []);

  /**
   * Khôi phục dataset từ localStorage vào worker
   * @param {{ label: { data: number[], shape: number[] } }} rawData
   * @returns {Promise<void>}
   */
  const setDataset = useCallback((rawData) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { reject(new Error('no_worker')); return; }
      if (setDatasetPending.current) { reject(new Error('in_progress')); return; }
      setDatasetPending.current = { resolve, reject };
      workerRef.current.postMessage({ type: 'setDataset', data: rawData });
      setTimeout(() => {
        if (setDatasetPending.current) {
          const p = setDatasetPending.current;
          setDatasetPending.current = null;
          p.reject(new Error('timeout'));
        }
      }, 8000);
    });
  }, []);

  /** Xóa tất cả examples trong worker */
  const clearAll = useCallback(() => {
    if (workerRef.current && readyRef.current) {
      workerRef.current.postMessage({ type: 'clearAll' });
    }
  }, []);

  return { isReady, addExample, predict, getDataset, setDataset, clearAll };
}
