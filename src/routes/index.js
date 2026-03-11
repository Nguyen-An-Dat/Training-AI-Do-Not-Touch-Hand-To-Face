import HandDetection from '../pages/HandDetection/HandDetection';
import Statistics from '../pages/Statistics/Statistics';
import Settings from '../pages/Settings/Settings';
import Modes from '../pages/Modes/Modes';
import DataManagement from '../pages/DataManagement/DataManagement';

// ============================================================
// ROUTES CONFIG — thêm màn hình mới tại đây
//
// Mỗi route là một object với:
//   path      — đường dẫn URL
//   label     — tên hiển thị trên sidebar
//   icon      — SVG icon (JSX)
//   component — React component của màn hình đó
//
// Ví dụ thêm màn hình mới:
//   {
//     path: '/settings',
//     label: 'Cài đặt',
//     icon: <SettingsIcon />,
//     component: Settings,
//   }
// ============================================================

const HandIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
    <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
    <path d="M6 14a2 2 0 0 0-2 2v2a6 6 0 0 0 12 0v-5a2 2 0 0 0-2-2H6z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m2.12-2.12l4.24-4.24" />
  </svg>
);

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const routes = [
  {
    path: '/',
    label: 'Hand Detection',
    icon: <HandIcon />,
    component: HandDetection,
  },
  {
    path: '/modes',
    label: 'Chế Độ',
    icon: <PlayIcon />,
    component: Modes,
  },
  {
    path: '/statistics',
    label: 'Thống Kê',
    icon: <ChartIcon />,
    component: Statistics,
  },
  {
    path: '/settings',
    label: 'Cài Đặt',
    icon: <SettingsIcon />,
    component: Settings,
  },
  {
    path: '/data',
    label: 'Quản Lý Dữ Liệu',
    icon: <DatabaseIcon />,
    component: DataManagement,
  },

  // --- Thêm route mới bên dưới đây ---
];

export default routes;
