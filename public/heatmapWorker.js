/**
 * heatmapWorker.js — Offscreen Canvas worker for heatmap rendering
 * Nhận messages: { type: 'init', canvas }, { type: 'addPoint' }, { type: 'clear' }
 */

let canvas = null;
let ctx = null;

self.addEventListener('message', ({ data: msg }) => {
  switch (msg.type) {
    case 'init':
      canvas = msg.canvas;
      ctx = canvas.getContext('2d');
      postMessage({ type: 'ready' });
      break;

    case 'addPoint': {
      if (!ctx || !canvas) return;
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
      break;
    }

    case 'clear':
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      break;

    default:
      break;
  }
});
