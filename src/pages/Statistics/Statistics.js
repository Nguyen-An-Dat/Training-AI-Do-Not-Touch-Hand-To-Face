import React, { useState, useEffect } from 'react';
import statisticsManager from '../../utils/statisticsManager';
import './Statistics.css';

const ChartBar = ({ label, value, maxValue, color }) => {
  const percentage = (value / maxValue) * 100;
  return (
    <div className="chart-bar">
      <div className="chart-bar__label">{label}</div>
      <div className="chart-bar__container">
        <div 
          className="chart-bar__fill" 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color 
          }}
        />
      </div>
      <div className="chart-bar__value">{value}</div>
    </div>
  );
};

const StatCard = ({ title, value, unit = '', icon, color }) => (
  <div className="stat-card" style={{ borderTopColor: color }}>
    <div className="stat-card__icon" style={{ color }}>
      {icon}
    </div>
    <div className="stat-card__body">
      <div className="stat-card__title">{title}</div>
      <div className="stat-card__value">
        {typeof value === 'number' && value > 1000000 
          ? (value / 1000 / 60).toFixed(0) + ' phút'
          : value}{unit}
      </div>
    </div>
  </div>
);

function Statistics() {
  const [timeRange, setTimeRange] = useState('week'); // week, month, all
  const [stats, setStats] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = () => {
    let data;
    if (timeRange === 'week') {
      data = statisticsManager.getWeekStats();
    } else if (timeRange === 'month') {
      data = statisticsManager.getMonthStats();
    } else {
      data = statisticsManager.stats.daily;
    }

    const chartData = Object.entries(data).map(([date, dayStats]) => ({
      date: new Date(date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
      touches: dayStats.touchCount || 0,
      sessions: dayStats.sessions || 0,
      duration: (dayStats.totalDuration / 1000 / 60).toFixed(0), // phút
    }));

    setChartData(chartData);
    setStats(data);
    setOverallStats(statisticsManager.getOverallStats());
  };

  const formatDuration = (ms) => {
    if (!ms) return '0 phút';
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleClearData = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả dữ liệu thống kê? Hành động này không thể hoàn tác.')) {
      statisticsManager.clearAllData();
      loadStats();
    }
  };

  const handleExportData = () => {
    const data = statisticsManager.exportData();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', `hand-detection-stats-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const maxTouches = Math.max(...chartData.map(d => d.touches), 1);

  return (
    <div className="statistics">
      <div className="statistics__header">
        <h1>Thống Kê & Theo Dõi</h1>
        <p>Xem chi tiết hiệu suất và tiến độ của bạn</p>
      </div>

      {/* Overall Stats */}
      {overallStats && (
        <div className="stats-grid">
          <StatCard
            title="Tổng Phiên"
            value={overallStats.totalSessions}
            unit=""
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
            color="#3498db"
          />
          <StatCard
            title="Lần Chạm Mặt"
            value={overallStats.totalTouches}
            unit=""
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V12a4 4 0 0 1 4-4h1V7a4 4 0 0 1 8 0z"/>
                <line x1="9" y1="9" x2="9" y2="5"/>
                <line x1="15" y1="9" x2="15" y2="5"/>
              </svg>
            }
            color="#e74c3c"
          />
          <StatCard
            title="Tổng Thời Gian"
            value={overallStats.totalDuration}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            }
            color="#2ecc71"
          />
          <StatCard
            title="Chạm/Phiên (TB)"
            value={(overallStats.avgTouchPerSession).toFixed(1)}
            unit=""
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            }
            color="#f39c12"
          />
        </div>
      )}

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <button
          className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`}
          onClick={() => setTimeRange('week')}
        >
          Tuần
        </button>
        <button
          className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`}
          onClick={() => setTimeRange('month')}
        >
          Tháng
        </button>
        <button
          className={`time-range-btn ${timeRange === 'all' ? 'active' : ''}`}
          onClick={() => setTimeRange('all')}
        >
          Tất Cả
        </button>
      </div>

      {/* Lần Chạm Mặt */}
      <div className="chart-section">
        <h2>Lần Chạm Mặt Hàng Ngày</h2>
        <div className="chart">
          {chartData.length > 0 ? (
            chartData.map((item, idx) => (
              <ChartBar
                key={idx}
                label={item.date}
                value={item.touches}
                maxValue={maxTouches}
                color="#e74c3c"
              />
            ))
          ) : (
            <div className="no-data">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Chi tiết theo ngày */}
      <div className="details-section">
        <h2>Chi Tiết Hàng Ngày</h2>
        <table className="details-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th className="text-center">Phiên</th>
              <th className="text-center">Lần Chạm</th>
              <th className="text-right">Thời Gian</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats || {})
              .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
              .map(([date, dayStats]) => (
                <tr key={date}>
                  <td className="date-cell">
                    {new Date(date).toLocaleDateString('vi-VN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </td>
                  <td className="text-center">{dayStats.sessions || 0}</td>
                  <td className="text-center">
                    <span className={`badge ${dayStats.touchCount > 0 ? 'badge-danger' : 'badge-safe'}`}>
                      {dayStats.touchCount || 0}
                    </span>
                  </td>
                  <td className="text-right">{formatDuration(dayStats.totalDuration)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {Object.keys(stats || {}).length === 0 && (
          <div className="no-data">Chưa có phiên làm việc nào</div>
        )}
      </div>

      {/* Actions */}
      <div className="actions-section">
        <button className="btn btn-primary" onClick={handleExportData}>
          📥 Xuất Dữ Liệu
        </button>
        <button className="btn btn-danger" onClick={handleClearData}>
          🗑️ Xóa Tất Cả Dữ Liệu
        </button>
      </div>
    </div>
  );
}

export default Statistics;
