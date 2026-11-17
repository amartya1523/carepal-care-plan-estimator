// Small inline icon set (stroke icons, 24x24) so we do not ship an icon font.
const paths = {
  elderly: 'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 22l1.5-7L8 13V9.5L11 8h2l2 3 3 1M10.5 15l2.5 2v5M18 12v10',
  dementia: 'M12 3a6 6 0 0 0-6 6c0 2.2 1 3.4 2 4.5V17h8v-3.5c1-1.1 2-2.3 2-4.5a6 6 0 0 0-6-6zM9 21h6M10 9.5c0-1 .9-2 2-2s2 1 2 2-1 1.5-2 2',
  baby: 'M12 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM9.5 10h.01M14.5 10h.01M10 13.5c1.2 1 2.8 1 4 0M12 4c0-1 .7-2 2-2',
  post_surgery: 'M4 14h16M6 14V9a2 2 0 0 1 2-2h3v7M20 14v-3a3 3 0 0 0-3-3h-4M4 18v-8M20 18v-4M8 4h0M15 4h-3M13.5 2.5v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrowLeft: 'M15 18l-6-6 6-6',
  arrowRight: 'M9 18l6-6-6-6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  rupee: 'M7 5h10M7 9h10M7 5c5 0 6 1.8 6 4s-1.5 4-6 4l7 6',
  compare: 'M4 6h7v14H4zM13 4h7v14h-7',
  share: 'M16 6l-4-4-4 4M12 2v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  print: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.check} />
    </svg>
  );
}
