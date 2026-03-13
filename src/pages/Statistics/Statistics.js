import React, { useState, useEffect, useMemo, useCallback } from 'react';
import statisticsManager from '../../utils/statisticsManager';
import './Statistics.css';

const fmtMs = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
};

const fmtShort = (dateStr) =>
  new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const fmtFull = (dateStr) =>
  new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  });

function KpiCard({ title, value, sub, icon, accent }) {
  return (
    <div className="kpi" style={{ '--kpi': accent }}>
      <div className="kpi__icon">{icon}</div>
      <div className="kpi__body">
        <span className="kpi__lbl">{title}</span>
        <span className="kpi__val">{value}</span>
        {sub && <span className="kpi__sub">{sub}</span>}
      </div>
      <div className="kpi__bg-glow" />
    </div>
  );
}

function BarChart({ data, accent }) {
  const max = Math.max(...data.map(d => d.v), 1);
  const hasAny = data.some(d => d.v > 0);
  if (!hasAny) {
    return (
      <div className="empty-state">
        <span>✅</span>
        <p>Không có lần chạm nào trong kỳ này!</p>
      </div>
    );
  }
  return (
    <div className="vchart">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.v / max) * 100 : 0;
        return (
          <div key={i} className={"vchart__col" + (d.v === 0 ? " vchart__col--zero" : "")}>
            <div className="vchart__bar-wrap">
              {d.v > 0 && <span className="vchart__tip">{d.v}</span>}
              <div className="vchart__bar" style={{ height: pct + "%", "--bar": accent }} />
            </div>
            <span className="vchart__lbl">{d.l}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, color }) {
  const W = 560, H = 120, PL = 36, PR = 10, PT = 10, PB = 26;
  const iW = W - PL - PR, iH = H - PT - PB;
  if (!data || data.length < 2) {
    return (
      <div className="empty-state">
        <span>📈</span>
        <p>Cần ít nhất 2 ngày dữ liệu</p>
      </div>
    );
  }
  const maxV = Math.max(...data.map(d => d.v), 1);
  const pts = data.map((d, i) => ({
    x: PL + (i / (data.length - 1)) * iW,
    y: PT + iH - (d.v / maxV) * iH,
    d,
  }));
  const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaPath = linePath + " L" + pts[pts.length - 1].x.toFixed(1) + "," + (PT + iH).toFixed(1) + " L" + PL + "," + (PT + iH).toFixed(1) + " Z";
  const gradId = "ag" + color.replace(/[^a-z0-9]/gi, "");
  const showIdx = new Set([0, data.length - 1]);
  const step = data.length <= 8 ? 1 : data.length <= 16 ? 2 : Math.ceil(data.length / 7);
  for (let i = 0; i < data.length; i += step) showIdx.add(i);
  const gridVals = [0, Math.round(maxV * 0.5), maxV];
  return (
    <svg viewBox={"0 0 " + W + " " + H} className="line-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridVals.map(gv => {
        const gy = PT + iH - (gv / maxV) * iH;
        return (
          <g key={gv}>
            <line x1={PL} y1={gy.toFixed(1)} x2={W - PR} y2={gy.toFixed(1)} stroke="currentColor" strokeOpacity="0.07" />
            <text x={PL - 4} y={gy + 3.5} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">{gv}m</text>
          </g>
        );
      })}
      <path d={areaPath} fill={"url(#" + gradId + ")"} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill={color} stroke="var(--bg-secondary)" strokeWidth="2" />
      ))}
      {pts.filter((_, i) => showIdx.has(i)).map((p) => (
        <text key={p.d.l} x={p.x.toFixed(1)} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">{p.d.l}</text>
      ))}
    </svg>
  );
}

function Donut({ pct, color }) {
  const R = 38, C = 2 * Math.PI * R;
  const filled = (Math.min(Math.max(pct, 0), 100) / 100) * C;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="donut-svg">
      <circle cx="48" cy="48" r={R} fill="none" stroke="var(--bg-tertiary)" strokeWidth="9" />
      <circle cx="48" cy="48" r={R} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={filled.toFixed(2) + " " + (C - filled).toFixed(2)}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="48" y="44" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">{pct}%</text>
      <text x="48" y="58" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.5">an toàn</text>
    </svg>
  );
}

function RecordItem({ icon, label, value }) {
  return (
    <div className="rec-item">
      <span className="rec-item__icon">{icon}</span>
      <div className="rec-item__body">
        <span className="rec-item__lbl">{label}</span>
        <span className="rec-item__val">{value}</span>
      </div>
    </div>
  );
}

function Statistics() {
  const [range, setRange] = useState('week');
  const [daily, setDaily] = useState({});
  const [overall, setOverall] = useState(null);

  const load = useCallback(() => {
    let d;
    if (range === 'week') d = statisticsManager.getWeekStats();
    else if (range === 'month') d = statisticsManager.getMonthStats();
    else d = statisticsManager.stats.daily;
    setDaily(d);
    setOverall(statisticsManager.getOverallStats());
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const { touchData, durationData, derived } = useMemo(() => {
    const entries = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
    const touchData = entries.map(([date, d]) => ({ l: fmtShort(date), v: d.touchCount || 0 }));
    const durationData = entries.map(([date, d]) => ({ l: fmtShort(date), v: Math.round((d.totalDuration || 0) / 60000) }));
    const activeDays = entries.filter(([, d]) => (d.sessions || 0) > 0);
    const safeDays = activeDays.filter(([, d]) => (d.touchCount || 0) === 0);
    const safeRate = activeDays.length > 0 ? Math.round((safeDays.length / activeDays.length) * 100) : 0;
    const periodTouches = entries.reduce((s, [, d]) => s + (d.touchCount || 0), 0);
    const periodDuration = entries.reduce((s, [, d]) => s + (d.totalDuration || 0), 0);
    const periodSessions = entries.reduce((s, [, d]) => s + (d.sessions || 0), 0);
    const bestDay = activeDays.length > 0
      ? [...activeDays].sort(([, a], [, b]) => a.touchCount - b.touchCount)[0] : null;
    let streak = 0;
    const cur = new Date(); cur.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().split('T')[0];
      if ((statisticsManager.stats.daily[key]?.sessions || 0) > 0) {
        streak++; cur.setDate(cur.getDate() - 1);
      } else if (i === 0) { cur.setDate(cur.getDate() - 1); } else break;
    }
    const allKeys = Object.keys(statisticsManager.stats.daily)
      .filter(k => (statisticsManager.stats.daily[k]?.sessions || 0) > 0).sort();
    let bestStreak = 0, curSt = 0, prevD = null;
    for (const k of allKeys) {
      const dd = new Date(k);
      if (prevD) { const diff = (dd - prevD) / 86400000; curSt = diff === 1 ? curSt + 1 : 1; }
      else { curSt = 1; }
      if (curSt > bestStreak) bestStreak = curSt;
      prevD = dd;
    }
    const avgSessionMs = (overall?.totalSessions || 0) > 0 ? overall.totalDuration / overall.totalSessions : 0;
    return {
      touchData, durationData,
      derived: { safeRate, periodTouches, periodDuration, periodSessions, bestDay, streak, bestStreak, avgSessionMs, activeDays: activeDays.length, safeDays: safeDays.length },
    };
  }, [daily, overall]);

  const handleExport = () => {
    const data = statisticsManager.exportData();
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
    a.download = 'stats-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  };

  const handleClear = () => {
    if (window.confirm('Xóa tất cả dữ liệu thống kê? Hành động này không thể hoàn tác.')) {
      statisticsManager.clearAllData(); load();
    }
  };

  const rangeLabel = range === 'week' ? '7 ngày qua' : range === 'month' ? '30 ngày qua' : 'Tất cả thời gian';
  const hasData = (overall?.totalSessions || 0) > 0;

  if (!overall) return <div className="dash-loading">⌛ Đang tải...</div>;

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1 className="dash__title">📊 Dashboard Thống Kê</h1>
          <p className="dash__sub">Theo dõi thói quen &amp; tối ưu năng suất làm việc</p>
        </div>
        <div className="range-tabs">
          {[['week', '7 ngày'], ['month', '30 ngày'], ['all', 'Tất cả']].map(([r, lbl]) => (
            <button key={r} className={"range-tab" + (range === r ? " active" : "")} onClick={() => setRange(r)}>{lbl}</button>
          ))}
        </div>
      </div>

      <div className="kpi-row">
        <KpiCard title="Tổng Phiên Làm Việc" value={overall.totalSessions}
          sub={overall.totalDays + " ngày hoạt động"} accent="#3b82f6"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <KpiCard title="Tổng Lần Chạm Mặt" value={overall.totalTouches}
          sub={"TB " + overall.avgTouchPerSession.toFixed(1) + " lần / phiên"} accent="#ef4444"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14a2 2 0 0 0-2 2v2a6 6 0 0 0 12 0v-5a2 2 0 0 0-2-2H6z"/></svg>} />
        <KpiCard title="Tổng Thời Gian" value={fmtMs(overall.totalDuration)}
          sub={"TB " + fmtMs(derived.avgSessionMs) + " / phiên"} accent="#10b981"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <KpiCard title="Streak Hiện Tại" value={derived.streak + " ngày"}
          sub={derived.bestStreak > derived.streak ? "Kỷ lục: " + derived.bestStreak + " ngày" : "🏆 Đang giữ kỷ lục!"}
          accent="#f59e0b" icon={<span style={{fontSize:"1.3rem",lineHeight:1}}>🔥</span>} />
      </div>

      <div className="row-primary">
        <div className="chart-card">
          <div className="chart-card__head">
            <div>
              <h3 className="chart-card__title">👋 Lần Chạm Mặt Theo Ngày</h3>
              <p className="chart-card__meta">{rangeLabel} &nbsp;&middot;&nbsp; Tổng: <strong>{derived.periodTouches}</strong> lần</p>
            </div>
          </div>
          <BarChart data={touchData} accent="#ef4444" />
        </div>
        <div className="chart-card chart-card--side">
          <h3 className="chart-card__title">🎯 Ngày An Toàn</h3>
          <div className="donut-block">
            <Donut pct={derived.safeRate} color="#10b981" />
            <div className="donut-stats">
              <div className="donut-stat">
                <span className="donut-stat__val" style={{color:"#10b981"}}>{derived.safeDays}</span>
                <span className="donut-stat__lbl">ngày an toàn</span>
              </div>
              <div className="donut-divider" />
              <div className="donut-stat">
                <span className="donut-stat__val">{derived.activeDays}</span>
                <span className="donut-stat__lbl">ngày hoạt động</span>
              </div>
            </div>
          </div>
          <p className="donut-verdict">
            {derived.safeRate >= 70 ? "🌟 Xuất sắc!"
              : derived.safeRate >= 40 ? "💪 Đang cải thiện tốt"
              : hasData ? "📈 Hãy cố gắng hơn!"
              : "—"}
          </p>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <h3 className="chart-card__title">⏱️ Thời Gian Làm Việc Theo Ngày</h3>
            <p className="chart-card__meta">{rangeLabel} &nbsp;&middot;&nbsp; Tổng: <strong>{fmtMs(derived.periodDuration)}</strong> &nbsp;&middot;&nbsp; {derived.periodSessions} phiên</p>
          </div>
        </div>
        <LineChart data={durationData} color="#3b82f6" />
      </div>

      <div className="row-bottom">
        <div className="records-card">
          <h3 className="records-card__title">🏅 Kỷ Lục &amp; Thành Tích</h3>
          <div className="rec-list">
            <RecordItem icon="🔥" label="Streak hiện tại" value={derived.streak + " ngày liên tiếp"} />
            <RecordItem icon="🏆" label="Streak kỷ lục" value={derived.bestStreak + " ngày"} />
            <RecordItem icon="📅" label="Tổng ngày sử dụng" value={overall.totalDays + " ngày"} />
            <RecordItem icon="⏱️" label="Thời gian TB / phiên" value={fmtMs(derived.avgSessionMs)} />
            {derived.bestDay && (
              <RecordItem icon="🌟" label="Ngày ít chạm nhất"
                value={fmtShort(derived.bestDay[0]) + " — " + derived.bestDay[1].touchCount + " lần"} />
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card__head"><h3 className="chart-card__title">📋 Chi Tiết Hàng Ngày</h3></div>
          <div className="detail-wrap">
            {!hasData ? (
              <div className="empty-state"><span>📊</span><p>Bắt đầu sử dụng để xem thống kê</p></div>
            ) : (
              <table className="detail-tbl">
                <thead><tr><th>Ngày</th><th className="tc">Phiên</th><th className="tc">Chạm mặt</th><th className="tr">Thời gian</th></tr></thead>
                <tbody>
                  {Object.entries(daily).sort(([a], [b]) => b.localeCompare(a)).map(([date, d]) => (
                    <tr key={date}>
                      <td className="date-col">{fmtFull(date)}</td>
                      <td className="tc">{d.sessions || 0}</td>
                      <td className="tc">
                        <span className={"tpill" + (!d.touchCount ? " tpill--zero" : d.touchCount > 10 ? " tpill--high" : " tpill--med")}>
                          {d.touchCount === 0 ? "✓ 0" : d.touchCount}
                        </span>
                      </td>
                      <td className="tr">{fmtMs(d.totalDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="dash-actions">
        <button className="dash-btn dash-btn--export" onClick={handleExport}>📥 Xuất JSON</button>
        <button className="dash-btn dash-btn--clear" onClick={handleClear}>🗑️ Xóa tất cả dữ liệu</button>
      </div>
    </div>
  );
}

export default Statistics;
