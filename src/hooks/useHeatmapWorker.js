import { useEffect, useRef, useCallback } from 'react';

const SUPPORTS_OFFSCREEN = typeof OffscreenCanvas !== 'undefined';

/**
 * Quản lý heatmap bằng OffscreenCanvas trong Web Worker.
 * Fallback về main-thread canvas khi trình duyệt chưa hỗ trợ OffscreenCanvas.
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 */
export default function useHeatmapWorker(canvasRef) {
  const workerRef = useRef(null);
  const workerReadyRef = useRef(false);
  const transferredRef = useRef(false);

  useEffect(() => {
    if (!SUPPORTS_OFFSCREEN) return;
    const worker = new Worker('/heatmapWorker.js');
    workerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') workerReadyRef.current = true;
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, []);

  /** Gọi một lần sau khi canvas mount để transfer sang worker */
  const initCanvas = useCallback(() => {
    if (!SUPPORTS_OFFSCREEN || !canvasRef.current || transferredRef.current || !workerRef.current) return;
    try {
      const offscreen = canvasRef.current.transferControlToOffscreen();
      workerRef.current.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
      transferredRef.current = true;
    } catch (_) {
      // transferControlToOffscreen không được hỗ trợ trên canvas này
    }
  }, [canvasRef]);

  /** Vẽ điểm nhiệt lên canvas */
  const addPoint = useCallback(() => {
    // Worker path
    if (SUPPORTS_OFFSCREEN && transferredRef.current && workerReadyRef.current && workerRef.current) {
      workerRef.current.postMessage({ type: 'addPoint' });
      return;
    }
    // Fallback: main-thread drawing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.45;
    for (let i = 0; i < 6; i++) {
      const x = cx + (Math.random() - 0.5) * 90;
      const y = cy + (Math.random() - 0.5) * 70;
      const r = 22 + Math.random() * 14;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,50,0,0.18)');
      gr.addColorStop(0.5, 'rgba(255,120,0,0.08)');
      gr.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [canvasRef]);

  /** Xóa toàn bộ heatmap */
  const clear = useCallback(() => {
    if (SUPPORTS_OFFSCREEN && transferredRef.current && workerReadyRef.current && workerRef.current) {
      workerRef.current.postMessage({ type: 'clear' });
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  return { initCanvas, addPoint, clear };
}
