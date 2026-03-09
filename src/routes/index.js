import HandDetection from '../pages/HandDetection/HandDetection';

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

const routes = [
  {
    path: '/',
    label: 'Hand Detection',
    icon: <HandIcon />,
    component: HandDetection,
  },

  // --- Thêm route mới bên dưới đây ---
];

export default routes;
