
// ---------- d47: one monochrome line-icon set (1.5px stroke, currentColor) + no emoji anywhere in the UI
var I47 = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  building: '<path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M8 9h2M14 9h2M8 13h2M14 13h2"/>',
  bank: '<path d="M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M2.5 9.5 12 4l9.5 5.5z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  clip: '<path d="m20.5 11.5-8.4 8.4a5 5 0 0 1-7.1-7.1l8.4-8.4a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 19.5l1-4z"/>',
  alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  chat: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
  receipt: '<path d="M5 3v18l3-2 2 2 2-2 2 2 2-2 3 2V3l-3 2-2-2-2 2-2-2-2 2z"/><path d="M9 9h6M9 13h6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18.5h2"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cam: '<path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M16 7l3 3M18.5 4.5l2 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  bug: '<rect x="7.5" y="8" width="9" height="12" rx="4.5"/><path d="M12 8V5.5M9.5 4.5l1.3 1.3M14.5 4.5l-1.3 1.3M3.5 13h4M16.5 13h4M5 19l2.5-1.5M19 19l-2.5-1.5M5 7.5l2.5 1.5M19 7.5l-2.5 1.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  tag: '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2l8.8 8.8-9.2 9.2z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.7-4.3L3 9M3 4v5h5M4 13a8 8 0 0 0 14.7 4.3L21 15M21 20v-5h-5"/>',
  spark: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.3l-1.8-5.6-5.7-1.9L10.2 9z"/><path d="M19 3.5v3M17.5 5h3"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3.5 21h17M14.5 12h.01"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
  plug: '<path d="M9 2.5v5M15 2.5v5M6 7.5h12v4a6 6 0 0 1-12 0zM12 17.5v4"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2-4.7.2 1.7 1 2.7 2 2.7 0-3 .3-5.5 1-8z"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  battery: '<rect x="2.5" y="7" width="16" height="10" rx="2"/><path d="M21.5 11v2M6 10v4M9.5 10v4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  thumb: '<path d="M7 10.5V21M7 10.5l3.8-7a2 2 0 0 1 3.2 1.7V9h5.2a2 2 0 0 1 2 2.3l-1.3 7.9a2 2 0 0 1-2 1.8H7M3 10.5h4V21H3z"/>',
  fan: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  ladder: '<path d="M8 3v18M16 3v18M8 7.5h8M8 12h8M8 16.5h8"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  cdown: '<path d="m6 9 6 6 6-6"/>',
  arrUR: '<path d="M7 17 17 7M8 7h9v9"/>',
  arrDR: '<path d="M7 7l10 10M17 8v9H8"/>',
  arrUD: '<path d="M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-12.2 4.7L3 15.5a1.6 1.6 0 0 1 2.4-2L8 15"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bath: '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 3.5-1.3M7 20l-1 1.5M17 20l1 1.5"/>',
  broom: '<path d="m14 4 6-1-1 6M19.5 3.5 11 12M7 12l5 5-2.5 4.5L3 15z"/>',
  bucket: '<path d="M4 7h16l-1.8 12.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8zM4 7a8 3 0 0 1 16 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  heart: '<path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
  floor: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  brush: '<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L13 13.8l-2.8-2.8z"/><path d="M10.2 11a3.5 3.5 0 0 0-4.7 3.2c0 1.8-1.5 3.3-3 3.8 4.2 1.6 8.3.4 9.2-2.5a3.2 3.2 0 0 0-1.5-4.5"/>',
  tree: '<path d="M12 21v-5M12 3 6 11h3l-4 5h14l-4-5h3z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  car: '<path d="M4 16.5h16M5 16.5V19M19 16.5V19M4 16.5l1.6-6a2 2 0 0 1 1.9-1.5h9a2 2 0 0 1 1.9 1.5l1.6 6"/><path d="M7.5 13.5h.01M16.5 13.5h.01"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
  scale: '<path d="M12 3v18M7.5 21h9M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0zM12 12v6.5a2 2 0 0 0 4 0"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7.5 12.5 2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  inbox: '<path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  msg: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
  pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  adown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  aup: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  layout: '<rect x="3" y="3.5" width="18" height="17" rx="2"/><path d="M3 9h18M9 9v11.5"/>',
  mega: '<path d="M3 10.5v3a1 1 0 0 0 1 1h2l6 4.5v-14L6 9.5H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6M7 14.5l1.5 5h2.5L10 15"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
};
var EMAP47 = { '💳': 'card', '🏦': 'bank', '🏠': 'home', '🏡': 'home', '🏘': 'home', '📎': 'clip', '📄': 'file', '📃': 'file', '📋': 'file', '📑': 'file', '🗂': 'folder', '📁': 'folder', '✍': 'pen', '🖊': 'pen', '✏': 'pen', '📝': 'pen', '🚨': 'alert', '⚠': 'alert', '❗': 'alert', '✅': 'checkc', '☑': 'checkc', '✓': 'check', '✔': 'check', '💬': 'chat', '🗨': 'chat', '🧾': 'receipt', '✉': 'mail', '📨': 'mail', '📧': 'mail', '📩': 'mail', '✕': 'x', '✖': 'x', '❌': 'x', '✗': 'x', '📞': 'phone', '☎': 'phone', '📲': 'mobile', '📱': 'mobile', '📅': 'cal', '📆': 'cal', '🗓': 'cal', '🎉': 'checkc', '🔧': 'wrench', '🛠': 'wrench', '🧰': 'wrench', '🔨': 'wrench', '👷': 'user', '☆': 'star', '★': 'star', '⭐': 'star', '○': 'circle', '⚪': 'circle', '🔘': 'dot', '🔴': 'dot', '🟢': 'dot', '🟡': 'dot', '●': 'dot', '⚡': 'zap', '⏳': 'clock', '⌛': 'clock', '⏰': 'clock', '🕒': 'clock', '🤝': 'users', '👥': 'users', '🏢': 'building', '🏬': 'building', '💵': 'cash', '💰': 'cash', '💲': 'cash', '👤': 'user', '🙋': 'user', '📷': 'cam', '📸': 'cam', '🔑': 'key', '🗝': 'key', '🔒': 'lock', '🔐': 'lock', '🔗': 'link', '⛓': 'link', '🚰': 'drop', '💧': 'drop', '🚿': 'drop', '🚽': 'drop', '🪠': 'drop', '🫧': 'drop', '🛁': 'bath', '🧊': 'snow', '❄': 'snow', '🐜': 'bug', '🐀': 'bug', '🐭': 'bug', '🪳': 'bug', '💡': 'bulb', '🔦': 'bulb', '↩': 'undo', '🏷': 'tag', '🔀': 'swap', '↔': 'swap', '⇄': 'swap', '⇆': 'swap', '🔁': 'refresh', '🔄': 'refresh', '↻': 'refresh', '🌡': 'thermo', '🚪': 'door', '✨': 'spark', '🌟': 'spark', '↗': 'arrUR', '↘': 'arrDR', '↕': 'arrUD', '🔌': 'plug', '🔥': 'flame', '♨': 'flame', '⛔': 'ban', '🚫': 'ban', '✋': 'hand', '🫳': 'hand', '💪': 'hand', '👋': 'hand', '🔋': 'battery', '👀': 'eye', '👁': 'eye', '🔍': 'search', '🔎': 'search', '👍': 'thumb', '👉': 'chev', '▶': 'play', '👇': 'cdown', '🌀': 'fan', '🎚': 'sliders', '🪜': 'ladder', '🧹': 'broom', '🧽': 'broom', '🪣': 'bucket', '🎙': 'mic', '🎤': 'mic', 'ℹ': 'info', '📍': 'pin', '❤': 'heart', '📊': 'chart', '📈': 'chart', '📉': 'chart', '⚙': 'gear', '☀': 'sun', '➕': 'plus', '⚖': 'scale', '🔔': 'bell', '📜': 'file', '🛡': 'shield', '☂': 'umbrella', '📐': 'ruler', '🏗': 'building', '☰': 'menu', '❓': 'help', '❔': 'help', '🪟': 'window', '🦠': 'drop', '🪵': 'floor', '🎨': 'brush', '🌳': 'tree', '🌲': 'tree', '🗑': 'trash', '🚗': 'car', '🅿': 'car', '🔊': 'speaker', '🔈': 'speaker', '🌊': 'drop', '📦': 'box', '🚱': 'ban', '🧒': 'user', '🥶': 'snow', '🧥': 'thermo', '🗺': 'pin', '⏱': 'clock', '🐾': 'bug', '📥': 'inbox' };
var RXE47 = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B50\u2B55\u2194-\u2199\u21A9\u21AA\u21BB\u21C4\u21C6\u2139\u23E9-\u23FA\u231A\u231B\u25B6\u25CB\u25CF\uFE0F\u200D\u20E3]/u;
var RXG47 = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B50\u2B55\u2194-\u2199\u21A9\u21AA\u21BB\u21C4\u21C6\u2139\u23E9-\u23FA\u231A\u231B\u25B6\u25CB\u25CF\uFE0F\u200D\u20E3]+/gu;
function svg47(n, s) { s = Math.max(16, Math.min(18, +s || 18)); return '<svg class="i47" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (I47[n] || I47.dot) + '</svg>'; }
function noEmo47(s) { return String(s == null ? '' : s).replace(RXG47, '').replace(/\s{2,}/g, ' ').trim(); }
function emoFix47(root) {
  try {
    if (!root) return;
    if (root.nodeType === 3) { emoText47(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) emoAttr47(root);
    if (root.querySelectorAll) root.querySelectorAll('[placeholder],[title],[aria-label],[alt],input[type=button],input[type=submit]').forEach(emoAttr47);
    if (!RXE47.test(root.textContent || '')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = []; let n;
    while ((n = w.nextNode())) if (RXE47.test(n.data)) list.push(n);
    list.forEach(emoText47);
  } catch (e) { }
}
function emoAttr47(el) { for (const a of ['placeholder', 'title', 'aria-label', 'alt']) { const v = el.getAttribute && el.getAttribute(a); if (v && RXE47.test(v)) el.setAttribute(a, noEmo47(v)); } if ((el.type === 'button' || el.type === 'submit') && el.tagName === 'INPUT' && RXE47.test(el.value)) el.value = noEmo47(el.value); }
function emoText47(t) {
  const p = t.parentNode; if (!p) return; const d = t.data; if (!RXE47.test(d)) return;
  const tag = p.nodeName;
  if (tag === 'OPTION' || tag === 'TITLE' || tag === 'TEXTAREA' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'text' || tag === 'tspan' || (p.isContentEditable)) { t.data = d.replace(RXG47, '').replace(/^\s+/, tag === 'OPTION' ? '' : ' '); return; }
  const fr = document.createDocumentFragment(); let last = 0; RXG47.lastIndex = 0; let m;
  while ((m = RXG47.exec(d))) {
    if (m.index > last) fr.appendChild(document.createTextNode(d.slice(last, m.index)));
    const ch = [...m[0]].filter(c => !/[\uFE0F\u200D\u20E3]/.test(c));
    const k = ch.map(c => EMAP47[c]).find(Boolean);
    if (k) { const sp = document.createElement('span'); sp.className = 'i47w'; sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = svg47(k, 16); fr.appendChild(sp); }
    last = m.index + m[0].length;
  }
  if (last < d.length) fr.appendChild(document.createTextNode(d.slice(last)));
  p.replaceChild(fr, t);
}
(function () {
  const start = () => { emoFix47(document.body); try { new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') emoText47(m.target); else if (m.type === 'attributes') emoAttr47(m.target); else m.addedNodes.forEach(emoFix47); } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'] }); } catch (e) { } if (document.title && RXE47.test(document.title)) document.title = noEmo47(document.title); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f]; if (typeof o === 'function') window[f] = function (msg, ...a) { return o.call(window, typeof msg === 'string' ? noEmo47(msg) : msg, ...a); }; }
})();

(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem('fx_' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('fx_' + k, JSON.stringify(v)); } catch (e) {} } };
let LANG = LS.get('lang', /^es\b/i.test(navigator.language || '') ? 'es' : 'en');
const coQ = () => { const c = new URLSearchParams(location.hash.slice(1)).get('co'); return c && /^\d+$/.test(c) ? '?co=' + c : ''; };
const tx = (en, es) => LANG === 'es' && es ? es : en;
const S = { info: null, mode: '', tok: '', problem: null, photos: [], unit_id: null, entry: 'yes', urgent: false, tried: [] };
async function api(path, opts = {}) {
  const o = { method: opts.method || (opts.body ? 'POST' : 'GET'), credentials: 'same-origin', headers: {} };
  const co = new URLSearchParams(location.hash.slice(1)).get('co'); if (co && /^\d+$/.test(co)) o.headers['x-co'] = co;
  if (opts.body instanceof FormData) o.body = opts.body; else if (opts.body) { o.body = JSON.stringify(opts.body); o.headers['content-type'] = 'application/json'; }
  const r = await fetch('/api/' + path, o); const j = await r.json().catch(() => ({ error: tx('Network problem. Please try again.', 'Problema de red. Intente de nuevo.') }));
  if (!r.ok) throw new Error(j.error || 'Error'); return j;
}
// ---------- the repair guides (step-by-step, simple words) ----------
// each step: [emoji, title EN, detail EN, title ES, detail ES]
const G = {
  breaker: { e: '⚡', c: '#fff4d6', t: ['Power out in part of the home', 'Sin luz en parte de la casa'], time: 2,
    steps: [['🔦', 'Find the breaker panel', 'A gray metal box, usually in the basement, garage, hallway or a closet.', 'Busque el panel de breakers', 'Una caja de metal gris, casi siempre en el sótano, garaje, pasillo o un clóset.'],
      ['👀', 'Look for the switch that is different', 'One switch is in the middle, or points the other way from the rest.', 'Busque el interruptor diferente', 'Uno está en el medio, o apunta al lado contrario de los demás.'],
      ['🔁', 'Push it all the way OFF, then ON', 'Push it firmly to OFF first, then back to ON. You will feel a click.', 'Muévalo a OFF y luego a ON', 'Primero empújelo firme a OFF y luego a ON. Va a sentir un clic.'],
      ['🔌', 'Unplug the big stuff', 'Space heaters, microwaves and hair dryers on one circuit can trip it again.', 'Desconecte aparatos grandes', 'Calentadores, microondas y secadoras de pelo en el mismo circuito lo pueden volver a disparar.']],
    warn: ['If it trips again right away, or you see burn marks or smell burning, stop and send a request.', 'Si se vuelve a disparar enseguida, o ve marcas quemadas o huele a quemado, pare y envíe una solicitud.'] },
  gfci: { e: '🔌', c: '#fff4d6', t: ['Outlet not working', 'Enchufe no funciona'], time: 1,
    steps: [['🔍', 'Find an outlet with TEST and RESET buttons', 'In the kitchen, bathroom, garage or outside. It can be a different outlet in the same room.', 'Busque un enchufe con botones TEST y RESET', 'En la cocina, baño, garaje o afuera. Puede ser otro enchufe en el mismo cuarto.'],
      ['👉', 'Press RESET firmly', 'Push until it clicks and stays in.', 'Presione RESET con fuerza', 'Empuje hasta que haga clic y se quede adentro.'],
      ['⚡', 'Check the breaker panel', 'Reset any switch that is in the middle (see “Power out”).', 'Revise el panel de breakers', 'Reinicie cualquier interruptor que esté en el medio.'],
      ['💡', 'Test it', 'Plug in a lamp or phone charger to see if it works now.', 'Pruébelo', 'Conecte una lámpara o cargador para ver si ya funciona.']] },
  toilet_clog: { e: '🚽', c: '#e6f1ff', t: ['Toilet clogged', 'Inodoro tapado'], time: 5,
    steps: [['✋', 'Don’t flush again', 'Flushing again can make it overflow.', 'No jale la cadena otra vez', 'Puede desbordarse.'],
      ['⏳', 'If the water is high, wait 10 minutes', 'Let the water go down a little first.', 'Si el agua está alta, espere 10 minutos', 'Deje que el agua baje un poco.'],
      ['🪠', 'Use a plunger', 'A bell-shaped plunger works best. Cover the hole completely.', 'Use un destapador', 'El de forma de campana funciona mejor. Cubra todo el hoyo.'],
      ['💪', 'Push slowly, pull hard — 15 times', 'Push down gently, then pull up fast. Keep going, it often takes a few tries.', 'Empuje despacio, jale fuerte — 15 veces', 'Empuje suave y jale rápido. Siga, a veces toma varios intentos.']],
    warn: ['Never use chemical drain cleaner in a toilet. If water comes up in the tub or shower, it’s a sewage backup — tap Emergency.', 'Nunca use químicos destapacaños en el inodoro. Si sale agua en la tina o ducha, es un retorno de aguas negras — toque Emergencia.'] },
  toilet_run: { e: '🚽', c: '#e6f1ff', t: ['Toilet keeps running', 'El inodoro no para de correr'], time: 3,
    steps: [['🫳', 'Lift the tank lid', 'The lid on the back of the toilet. Set it on a towel — it’s heavy.', 'Levante la tapa del tanque', 'La tapa de atrás del inodoro. Póngala sobre una toalla — pesa.'],
      ['⛓️', 'Check the chain', 'The chain on the rubber flap at the bottom. If it’s caught or tangled, free it.', 'Revise la cadena', 'La cadena de la tapita de goma del fondo. Si está enredada, suéltela.'],
      ['👇', 'Push the rubber flap down', 'Press it so it closes the hole and seals.', 'Empuje la tapita de goma', 'Presiónela para que tape bien el hoyo.'],
      ['🔧', 'Still running? Shut off the water', 'Turn the small valve behind the toilet to the right (clockwise).', '¿Sigue corriendo? Cierre el agua', 'Gire la llave pequeña detrás del inodoro a la derecha.']] },
  drain: { e: '🚰', c: '#e6f1ff', t: ['Slow or clogged drain', 'Desagüe lento o tapado'], time: 15,
    steps: [['🧽', 'Clean the stopper', 'Pull out hair or food stuck in the drain or stopper.', 'Limpie el tapón', 'Saque pelo o comida atorada en el desagüe o el tapón.'],
      ['♨️', 'Run very hot water for 1 minute', 'Hot water melts grease.', 'Deje correr agua bien caliente 1 minuto', 'El agua caliente derrite la grasa.'],
      ['🪠', 'Use a sink plunger 10 times', 'Double sink? Cover the other drain with a wet rag first.', 'Use un destapador 10 veces', '¿Fregadero doble? Tape el otro desagüe con un trapo mojado.'],
      ['🫧', 'Baking soda + vinegar', '½ cup baking soda, then 1 cup vinegar. Wait 15 minutes, then hot water.', 'Bicarbonato + vinagre', '½ taza de bicarbonato, luego 1 taza de vinagre. Espere 15 minutos y eche agua caliente.']],
    warn: ['Don’t mix chemical drain cleaners with plunging or other cleaners.', 'No mezcle químicos destapacaños con el destapador ni con otros limpiadores.'] },
  disposal: { e: '🌀', c: '#e6f1ff', t: ['Garbage disposal not working', 'Triturador no funciona'], time: 3,
    steps: [['⛔', 'Turn it OFF. Never put your hand inside', 'Use tongs if something is stuck at the top.', 'Apáguelo. Nunca meta la mano', 'Use pinzas si algo está atorado arriba.'],
      ['🔴', 'Press the red RESET button', 'It’s on the bottom of the disposal, under the sink.', 'Presione el botón rojo RESET', 'Está abajo del triturador, debajo del fregadero.'],
      ['🔧', 'Hums but won’t spin? Unjam it', 'Put an Allen key in the hole in the bottom center and turn it back and forth.', '¿Zumba pero no gira? Destrábelo', 'Meta una llave Allen en el hoyo del centro de abajo y gírela de un lado a otro.'],
      ['▶️', 'Run cold water and turn it on', 'Let cold water run, then switch it on again.', 'Abra el agua fría y préndalo', 'Deje correr agua fría y préndalo otra vez.']] },
  hot_water: { e: '🛁', c: '#ffe9e2', t: ['No hot water', 'No hay agua caliente'], time: 5,
    steps: [['⏳', 'Wait 30–60 minutes', 'If a lot of hot water was just used, the tank needs time to heat up.', 'Espere 30–60 minutos', 'Si se usó mucha agua caliente, el tanque necesita tiempo.'],
      ['⚡', 'Electric heater: check the breaker', 'Look for “water heater” in the breaker panel and switch it OFF then ON.', 'Calentador eléctrico: revise el breaker', 'Busque “water heater” en el panel y póngalo en OFF y luego ON.'],
      ['🌡️', 'Check the dial', 'Make sure the dial on the tank isn’t on VACATION or the lowest setting.', 'Revise la perilla', 'Que la perilla del tanque no esté en VACATION o en lo más bajo.'],
      ['🔥', 'Gas heater: pilot light', 'Only if you feel safe: look in the small window at the bottom. If it’s out, follow the lighting steps printed on the tank label.', 'Calentador de gas: piloto', 'Solo si se siente seguro: mire por la ventanita de abajo. Si está apagado, siga las instrucciones de la etiqueta del tanque.']],
    warn: ['If you smell gas, stop. Leave the home and call the gas company.', 'Si huele a gas, pare. Salga de la casa y llame a la compañía de gas.'] },
  thermostat: { e: '🌡️', c: '#ffe9e2', t: ['Heat or AC not working right', 'Calefacción o aire no funciona bien'], time: 10,
    steps: [['🔋', 'Change the thermostat batteries', 'Most use AA or AAA. A blank screen usually means dead batteries.', 'Cambie las baterías del termostato', 'Casi todos usan AA o AAA. Pantalla en blanco = baterías muertas.'],
      ['🎚️', 'Set it to HEAT (or COOL)', 'Set the temperature 3 degrees warmer (or cooler) than the room. Fan on AUTO.', 'Póngalo en HEAT (o COOL)', 'Ponga la temperatura 3 grados más alta (o más baja) que el cuarto. Ventilador en AUTO.'],
      ['⚡', 'Check the switch and breaker', 'The furnace has an ON/OFF switch like a light switch nearby. Check the breaker too.', 'Revise el switch y el breaker', 'El calentador tiene un interruptor como de luz cerca. Revise también el breaker.'],
      ['🧹', 'Check the air filter', 'If it’s gray and dusty, replace it. A clogged filter can stop the system.', 'Revise el filtro de aire', 'Si está gris y sucio, cámbielo. Un filtro tapado puede parar el sistema.'],
      ['⏳', 'Wait 10 minutes', 'It can take a few minutes to start.', 'Espere 10 minutos', 'Puede tardar unos minutos en arrancar.']] },
  smoke: { e: '🚨', c: '#fdecea', t: ['Smoke detector chirping', 'Detector de humo pitando'], time: 5,
    steps: [['🔋', 'A chirp every minute = low battery', 'It’s not a fire — it needs a new battery.', 'Un pitido cada minuto = batería baja', 'No es un incendio — necesita batería nueva.'],
      ['🪜', 'Twist it off the ceiling', 'Use a sturdy step stool. Turn it to the left.', 'Gírelo para quitarlo del techo', 'Use un banco firme. Gírelo a la izquierda.'],
      ['🔄', 'Put in a new battery', 'Usually a 9-volt or AA — match the old one.', 'Ponga una batería nueva', 'Casi siempre 9 voltios o AA — igual a la vieja.'],
      ['🔘', 'Hold TEST for 5 seconds', 'It beeps loud, then resets. Twist it back on.', 'Mantenga TEST 5 segundos', 'Suena fuerte y se reinicia. Vuelva a ponerlo.']],
    warn: ['Never leave a detector without a battery. If it says “10 year sealed”, send a request.', 'Nunca deje un detector sin batería. Si dice “10 year sealed”, envíe una solicitud.'] },
  appliance: { e: '🧊', c: '#ECFDF5', t: ['Appliance not working', 'Electrodoméstico no funciona'], time: 3,
    steps: [['🔌', 'Check the plug', 'Push it in all the way. Try another device in the same outlet.', 'Revise el enchufe', 'Empújelo bien. Pruebe otro aparato en el mismo enchufe.'],
      ['⚡', 'Check the breaker panel', 'Reset any switch that is in the middle.', 'Revise el panel de breakers', 'Reinicie cualquier interruptor que esté en el medio.'],
      ['🚪', 'Check the door and lock', 'Washer, dryer and dishwasher won’t start if the door isn’t fully closed. Ovens can be in “lock” mode.', 'Revise la puerta y el seguro', 'La lavadora, secadora y lavaplatos no arrancan si la puerta no está bien cerrada. El horno puede estar en “lock”.'],
      ['🔄', 'Unplug for 1 minute', 'Then plug it back in. This resets it.', 'Desconéctelo 1 minuto', 'Luego conéctelo otra vez. Así se reinicia.']] },
  leak: { e: '💧', c: '#e6f1ff', t: ['Water leak', 'Fuga de agua'], time: 2, sendFirst: true,
    steps: [['🔧', 'Shut off the water to it', 'Under the sink or behind the toilet there’s a small valve. Turn it to the right.', 'Cierre el agua', 'Debajo del fregadero o detrás del inodoro hay una llave. Gírela a la derecha.'],
      ['🪣', 'Catch the water', 'Put a bucket or towels under it.', 'Recoja el agua', 'Ponga un balde o toallas debajo.'],
      ['📷', 'Take a photo', 'It helps us bring the right part.', 'Tome una foto', 'Nos ayuda a traer la pieza correcta.']],
    warn: ['Water coming through the ceiling or a lot of water on the floor? Tap Emergency → Flooding.', '¿Sale agua del techo o hay mucha agua en el piso? Toque Emergencia → Inundación.'] },
};
const EM = {
  gas: { e: '🔥', t: ['I smell gas', 'Huele a gas'], steps: [['🚪', 'Leave the home now', 'Take everyone and pets with you. Leave the door open.', 'Salga de la casa ahora', 'Saque a todos y a las mascotas. Deje la puerta abierta.'], ['🚫', 'Don’t touch switches or flames', 'No lights on or off, no lighters, no matches, don’t start a car.', 'No toque interruptores ni fuego', 'No prenda ni apague luces, no use encendedores ni fósforos, no arranque el carro.'], ['📞', 'Call from outside', 'Once you are outside, call the gas company.', 'Llame desde afuera', 'Ya afuera, llame a la compañía de gas.']], gas: true },
  co: { e: '🚨', t: ['Carbon monoxide alarm', 'Alarma de monóxido de carbono'], steps: [['🚪', 'Get everyone outside now', 'Go to fresh air right away, with pets.', 'Salgan todos ahora', 'Vayan al aire libre enseguida, con las mascotas.'], ['⛔', 'Don’t go back in', 'Wait until the fire department says it’s safe.', 'No vuelva a entrar', 'Espere a que los bomberos digan que es seguro.']], gas: true },
  sparks: { e: '⚡', t: ['Sparks or burning smell', 'Chispas u olor a quemado'], steps: [['⚡', 'If it’s safe, turn off the breaker', 'Switch that area OFF at the breaker panel. Don’t touch the outlet.', 'Si es seguro, apague el breaker', 'Apague esa área en el panel. No toque el enchufe.'], ['💧', 'Never use water on it', 'Water and electricity are dangerous together.', 'Nunca le eche agua', 'El agua y la electricidad son peligrosas juntas.']] },
  flood: { e: '🌊', t: ['Flooding or burst pipe', 'Inundación o tubo roto'], steps: [['🔧', 'Turn off the main water', 'The main valve is where the water pipe comes in, near the meter (often the basement). Turn it to the right.', 'Cierre la llave principal', 'Está donde entra el tubo de agua, cerca del medidor (casi siempre en el sótano). Gírela a la derecha.'], ['⚡', 'Stay away from wet outlets', 'Don’t touch electric things near the water.', 'Aléjese de enchufes mojados', 'No toque cosas eléctricas cerca del agua.'], ['📦', 'Move things up', 'Lift valuables and electronics off the floor.', 'Suba sus cosas', 'Levante cosas de valor y aparatos del piso.']] },
  sewage: { e: '🚽', t: ['Sewage backup', 'Retorno de aguas negras'], steps: [['🚱', 'Stop using water', 'No flushing, showers, laundry or dishes until it’s fixed.', 'No use agua', 'No jale la cadena, ni ducha, ni lavadora, ni platos hasta que se arregle.'], ['🧒', 'Keep kids and pets away', 'Don’t touch it. Sewage water can make you sick.', 'Aleje a niños y mascotas', 'No lo toque. Puede enfermarlo.']] },
  no_heat: { e: '🥶', t: ['No heat', 'No hay calefacción'], steps: [['🌡️', 'Quick check', 'Thermostat on HEAT, set above room temperature, fresh batteries.', 'Revisión rápida', 'Termostato en HEAT, más alto que el cuarto, baterías nuevas.'], ['🧥', 'Stay warm safely', 'Never use the oven, stove or a grill to heat the home.', 'Manténgase caliente con seguridad', 'Nunca use el horno, la estufa ni una parrilla para calentar la casa.']] },
  lockout: { e: '🔑', t: ['Locked out', 'Me quedé afuera'], steps: [['📞', 'Call the office', 'We’ll get someone to you.', 'Llame a la oficina', 'Le mandamos a alguien.']], office: true },
};
const DIRECT = { door: ['🚪', 'Door, lock or window', 'Puerta, cerradura o ventana'], pest: ['🐜', 'Bugs or mice', 'Insectos o ratones'], other: ['🛠️', 'Something else', 'Otra cosa'] };
const EM_ORDER = ['gas', 'sparks', 'flood', 'co', 'sewage', 'no_heat', 'lockout'];
const KW = [['gas', /gas|natural gas|huele a gas|olor a gas|rotten egg/], ['co', /carbon|monox|co alarm|co detector|monóxido|monoxido/], ['sparks', /spark|burn|smok|fire|chispa|quemad|humo|fuego/], ['flood', /flood|burst|pipe broke|water everywhere|ceiling.*water|water.*ceiling|inunda|tubo roto/], ['sewage', /sewage|sewer|backed up|backing up|aguas negras|drenaje/], ['no_heat', /no heat|heat.*(not|isn|won|doesn)|cold.*(house|apartment|home)|sin calefac|no hay calefac|no calienta/], ['lockout', /locked out|lost.*key|lock(ed)? myself|me quede afuera|me quedé afuera|perd.*llave/], ['smoke', /chirp|beep|smoke detector|smoke alarm|pita|detector/], ['toilet_run', /toilet.*(run|running)|running toilet|inodoro.*corr/], ['toilet_clog', /toilet|inodoro|baño tapado|commode/], ['disposal', /disposal|garbage|triturador/], ['hot_water', /hot water|water heater|pilot|agua caliente|calentador de agua/], ['thermostat', /thermostat|heat|furnace|\bac\b|a\/c|air con|cool|termostato|calefac|aire/], ['breaker', /breaker|power|lights? out|no light|electric|sin luz|no hay luz|luz/], ['gfci', /outlet|plug|socket|gfci|enchufe|toma/], ['drain', /drain|sink|tub|shower|slow|clog|desag|tapad|fregadero|lavamanos|ducha/], ['leak', /leak|drip|gote|fuga|mojad/], ['appliance', /fridge|refrigerat|stove|oven|washer|dryer|dishwasher|microwave|nevera|estufa|horno|lavadora|secadora/], ['door', /door|lock|window|key|puerta|cerradura|ventana/], ['pest', /mice|mouse|rat|roach|bug|ant|bed ?bug|pest|rata|ratón|cucaracha|insecto/]];
function matchText(q) { const l = q.toLowerCase(); const m = KW.find(([, re]) => re.test(l)); return m ? m[0] : 'other'; }
const isEm = k => !!EM[k];
const pT = k => EM[k] ? tx(...EM[k].t) : G[k] ? tx(...G[k].t) : DIRECT[k] ? tx(DIRECT[k][1], DIRECT[k][2]) : tx('Repair', 'Reparación');
const pE = k => EM[k] ? EM[k].e : G[k] ? G[k].e : DIRECT[k] ? DIRECT[k][0] : '🛠️';
// ---------- shell ----------
function top({ back } = {}) {
  const i = S.info || {};
  return `<div class="top">${back ? `<button class="bk" data-back aria-label="Back">←</button>` : `<div class="lg42" aria-hidden="true">${esc(((i.company || 'P').trim()[0] || 'P').toUpperCase())}</div>`}<div><div class="co">${esc(i.company || '')}${S.mode === 'portal' ? ' · ' + tx('Tenant portal', 'Portal del inquilino') : ''}</div><div class="pl">${esc(i.property ? i.property.name : '')}</div></div><div class="sp"></div>${S.mode === 'portal' ? `<a class="pt42" href="/#/">${tx('My portal', 'Mi portal')}</a>` : ''}<button class="lang" data-lang>${LANG === 'es' ? 'English' : 'Español'}</button></div>`;
}
function wireTop(back) { const b = $('[data-back]'); if (b) b.onclick = back; $('[data-lang]').onclick = () => { LANG = LANG === 'es' ? 'en' : 'es'; LS.set('lang', LANG); S.redraw && S.redraw(); }; }
function draw(fn) { S.redraw = fn; fn(); window.scrollTo(0, 0); }
function loading() { app.innerHTML = '<div class="loading"><div class="spin"></div></div>'; }
function fail(msg) { app.innerHTML = `<div class="wrap"><div class="done"><div class="big" style="background:var(--badbg)">🔗</div><h2>${esc(msg)}</h2>${S.info && S.info.office_phone ? `<p class="sub">${tx('Please call the office.', 'Por favor llame a la oficina.')}</p><a class="btn" href="tel:${esc(S.info.office_phone)}">📞 ${tx('Call the office', 'Llamar a la oficina')}</a>` : ''}</div></div>`; }
function lightbox(src) { const d = document.createElement('div'); d.className = 'lb'; d.innerHTML = `<img src="${esc(src)}" alt="">`; d.onclick = () => d.remove(); document.body.appendChild(d); }
async function resizeImage(file, max = 1600) {
  if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return file;
  try { const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); if (k === 1 && file.size < 1.5e6) return file; const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .82)); return b ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file; } catch (e) { return file; }
}
// ---------- tenant: home ----------
// ---------- tenant: step-by-step guide ----------
async function fixedIt() {
  const b = $('[data-fixed]'); if (b) b.disabled = true;
  try { if (S.mode === 'portal') await api('t/selfhelp', { body: { problem: S.problem, lang: LANG } }); else await api(`pub/fix/${S.tok}/fixed`, { body: { problem: S.problem, unit_id: LS.get('unit_' + S.tok, null), name: LS.get('name', ''), phone: LS.get('phone', ''), lang: LANG } }); } catch (e) {}
  draw(() => {
    app.innerHTML = `<div class="wrap">${top()}<div class="done"><div class="big">🎉</div><h1>${tx('Nice work!', '¡Muy bien!')}</h1><p class="sub">${tx('Glad it’s working. No repair visit needed — thanks for trying it yourself.', 'Qué bueno que ya funciona. No hace falta una visita — gracias por intentarlo.')}</p></div>
      <div class="bar"><div class="in"><button class="btn white" data-home>${tx('Something else?', '¿Algo más?')}</button></div></div></div>`;
    wireTop(); $('[data-home]').onclick = () => { reset41(); home(); };
  });
}
// ---------- tenant: emergency (no self-help: straight to an URGENT request) ----------
function emergency(k) {
  S.problem = k; S.urgent = true; const em = EM[k]; const i = S.info || {};
  draw(() => {
    const gasLine = (k === 'gas' || k === 'co') ? `<p class="emline">⚠️ ${tx('Smell gas or CO alarm? Get everyone outside first.', '¿Huele a gas o suena la alarma de CO? Primero saque a todos afuera.')}${k === 'gas' && i.gas ? `<br><small>${esc(i.gas.name)}: <a href="tel:${esc(i.gas.phone.replace(/[^\d]/g, ''))}">${esc(i.gas.phone)}</a></small>` : ''}</p>` : '';
    app.innerHTML = `<div class="wrap">${top({ back: 1 })}
      <div class="redbox"><div class="pill" style="background:rgba(255,255,255,.2);color:#fff">🚨 ${tx('Urgent', 'Urgente')}</div><h1 style="margin-top:10px">${em.e} ${esc(tx(...em.t))}</h1><p style="margin:0;color:#ffe5e2;font-weight:600">${tx('We send this right away as URGENT to maintenance and the owner.', 'Lo enviamos enseguida como URGENTE a mantenimiento y al dueño.')}</p>${gasLine}</div>
      <div class="card">${contactFields()}</div>
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn red big" id="go">🚨 ${tx('Send URGENT request to the owner', 'Enviar solicitud URGENTE al dueño')}</button></div></div></div>`;
    wireTop(home); wireContact();
    $('#go').onclick = () => submit({ urgency: 'urgent' });
  });
}
// ---------- tenant: request form ----------
function contactFields() {
  const i = S.info; const units = i.units || [];
  const savedU = S.unit_id || LS.get('unit_' + S.tok, null) || (units.length === 1 ? units[0].id : null); S.unit_id = savedU;
  const portal = S.mode === 'portal';
  return `${units.length > 1 && !portal ? `<fieldset class="q41"><legend class="l">${tx('Your unit', 'Su unidad')}</legend><div class="chips41" id="un">${units.map(u => radio41('un41', u.id, +savedU === u.id, esc(/^\d|^[a-z]$/i.test(u.name) ? tx('Unit ', 'Unidad ') + u.name : u.name))).join('')}</div></fieldset>` : ''}
    ${portal ? '' : `<label class="l" for="nm">${tx('Your name', 'Su nombre')}</label><input class="t" id="nm" autocomplete="name" value="${esc(LS.get('name', ''))}" placeholder="${tx('First and last name', 'Nombre y apellido')}">`}
    <label class="l" for="ph">${tx('Your phone', 'Su teléfono')} <small>${tx('so we can reach you', 'para comunicarnos')}</small></label><input class="t" id="ph" type="tel" inputmode="tel" autocomplete="tel" value="${esc(portal ? (i.phone || '') : LS.get('phone', ''))}" placeholder="(609) 555-0123">`;
}
function wireContact() { const un = $('#un'); if (un) wireChips41(un, 'un41', inp => { S.unit_id = +inp.value; }); }
function drawPhotos() {
  const el = $('#phs'); if (!el) return;
  el.innerHTML = S.photos.map((p, n) => `<div class="im ${p.id ? '' : 'up'}" style="background-image:url(${p.url})"><b data-rm="${n}">✕</b></div>`).join('') + (S.photos.length < 6 ? `<button type="button" class="add" id="pa"><span>📷</span>${tx('Add photo', 'Agregar foto')}</button>` : '');
  const a = $('#pa'); if (a) a.onclick = () => $('#pf').click();
  $$('[data-rm]', el).forEach(b => b.onclick = () => { S.photos.splice(+b.dataset.rm, 1); drawPhotos(); });
}
async function addPhotos(files) {
  for (const f0 of files.slice(0, 6 - S.photos.length)) {
    const p = { url: URL.createObjectURL(f0), id: null }; S.photos.push(p); drawPhotos();
    p.job = (async () => { const f = await resizeImage(f0); const fd = new FormData(); fd.append('file', f, f.name || 'photo.jpg'); fd.append('kind', 'photo'); const r = await api(S.mode === 'portal' ? 'files' : `pub/fix/${S.tok}/upload`, { body: fd }); p.id = r.id; drawPhotos(); })().catch(e => { p.err = e.message; S.photos.splice(S.photos.indexOf(p), 1); drawPhotos(); alert(e.message); });
  }
}
async function submit(extra) {
  const er = $('#er'); const go = $('#go'); er.hidden = true;
  const units = S.info.units || [];
  const name = $('#nm') ? $('#nm').value.trim() : ''; const phone = $('#ph') ? $('#ph').value.trim() : '';
  const bad = m => { er.textContent = m; er.hidden = false; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  if (S.mode !== 'portal') {
    if (units.length > 1 && !S.unit_id) return bad(tx('Pick your unit', 'Escoja su unidad'));
    if (!name) return bad(tx('Add your name', 'Escriba su nombre'));
  }
  if (phone.replace(/\D/g, '').length < 10) return bad(tx('Add your phone number so we can reach you', 'Escriba su teléfono para comunicarnos'));
  if (S.mode !== 'portal') { LS.set('name', name); LS.set('phone', phone); if (S.unit_id) LS.set('unit_' + S.tok, S.unit_id); }
  go.disabled = true; go.innerHTML = '<div class="spin"></div>';
  try {
    await Promise.all(S.photos.map(p => p.job).filter(Boolean));
    const ds = $('#ds') ? $('#ds').value.trim() : '';
    const b = { problem: S.problem || 'other', title: S.freeText && !G[S.problem] && !EM[S.problem] ? S.freeText.slice(0, 120) : pT(S.problem || 'other'), description: ds, unit_id: S.unit_id, name, phone, entry: S.entry, urgency: extra.urgency || (S.urgent ? 'urgent' : 'normal'), ...(extra.v40 ? { cat40: S.cat, subcat: S.subcat || '', cat_other: S.catOther || '', urg40: S.urg, entry_times: [(S.tpicks || []).join(', '), String(S.times || '').trim()].filter(Boolean).join(' · '), pets: S.pets === 'yes' ? (String(S.petsWhat || '').trim() || 'yes') : S.pets === 'no' ? 'no' : '' } : extra.urgency === 'urgent' ? { urg40: 'emergency', cat40: (P2C4[S.problem] || [''])[0] || undefined, subcat: (P2C4[S.problem] || ['', ''])[1] || undefined } : {}), photo_ids: S.photos.map(p => p.id).filter(Boolean), tried: S.tried, lang: LANG };
    if (LANG === 'es') b.title = (G[b.problem] || EM[b.problem] || DIRECT[b.problem]) ? (EM[b.problem] ? EM[b.problem].t[0] : G[b.problem] ? G[b.problem].t[0] : DIRECT[b.problem][1]) : b.title;
    if (extra.v40 && !S.freeText) { const c4 = CATS4.find(z => z[0] === S.cat); b.title = S.cat === 'other' ? (String(S.catOther || '').trim() || b.title) : [c4 ? c4[1] : '', S.subcat].filter(Boolean).join(' – ') || b.title; }
    const r = await api(S.mode === 'portal' ? 't/workorders' : `pub/fix/${S.tok}/submit`, { body: b });
    S.photos = []; S.freeText = '';
    if (r.status_token) { const mine = LS.get('mine', []); mine.unshift({ t: r.status_token, title: b.title, at: Date.now() }); LS.set('mine', mine.slice(0, 10)); }
    sent(r);
  } catch (e) { go.disabled = false; go.textContent = tx('Send request', 'Enviar solicitud'); bad(e.message); }
}
function sent(r) {
  draw(() => {
    app.innerHTML = `<div class="wrap">${top()}<div class="done"><div class="big" style="${r.urgent ? 'background:var(--badbg)' : ''}">${r.urgent ? '🚨' : '✅'}</div>
      <h1>${r.urgent ? tx('URGENT request sent', 'Solicitud URGENTE enviada') : tx('Request sent', 'Solicitud enviada')}</h1>
      <p class="sub">${r.assignee ? tx(`${esc(r.assignee)} from maintenance gets it now. You’ll see when it’s scheduled.`, `${esc(r.assignee)} de mantenimiento la recibe ahora. Verá cuando esté programada.`) : (S.mode === 'portal' ? tx('The office has it now. You can chat with them about it and send photos.', 'La oficina ya la tiene. Puede chatear con ellos y enviar fotos.') : tx('The office has it now. You’ll see here when it’s scheduled.', 'La oficina ya la tiene. Aquí verá cuando esté programada.'))}</p></div>
      <div class="bar"><div class="in">${S.mode === 'portal' && r.id ? `<a class="btn" href="/#/t/request/${+r.id}">💬 ${tx('Open the chat', 'Abrir el chat')}</a>` : `<a class="btn" href="#s=${esc(r.status_token)}">${tx('Track my request', 'Ver mi solicitud')}</a>`}<button class="btn white" data-home>${tx('Done', 'Listo')}</button></div></div></div>`;
    wireTop(); $('[data-home]').onclick = () => { reset41(); home(); };
  });
}
// ---------- tenant: status page ----------
function track(st, sched) {
  const steps = [['📨', tx('Sent', 'Enviada')], ['📅', tx('Scheduled', 'Programada')], ['✅', tx('Fixed', 'Arreglada')]];
  const at = ['completed', 'closed'].includes(st) ? 2 : (st === 'scheduled' || sched) ? 1 : 0;
  return `<div class="track"><span class="fill" style="width:calc(${at * 50}% - ${at ? 16 : 0}px)"></span>${steps.map((s, n) => `<div class="${n <= at ? 'on' : ''}"><i>${n <= at ? '✓' : s[0]}</i>${s[1]}</div>`).join('')}</div>`;
}
const fdt = iso => new Date(iso).toLocaleString(LANG === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fday = d => new Date(d + 'T12:00:00').toLocaleDateString(LANG === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
async function status(tok) {
  loading();
  let w; try { w = await api('pub/status/' + tok); } catch (e) { return fail(e.message); }
  S.info = S.info || { company: w.company, office_phone: w.office_phone, property: { name: w.property } };
  draw(() => {
    const fixed = ['completed', 'closed'].includes(w.status);
    app.innerHTML = `<div class="wrap">${top()}
      <div class="hero"><div class="e">${fixed ? '✅' : w.urgent ? '🚨' : '🛠️'}</div><div><h2>${esc(w.title)}</h2><span class="pill ${fixed ? '' : w.status === 'scheduled' ? 'brand' : 'warn'}">${fixed ? tx('Fixed', 'Arreglada') : w.status === 'scheduled' ? tx('Scheduled', 'Programada') : tx('Sent to maintenance', 'Enviada a mantenimiento')}</span></div></div>
      <div class="card">${track(w.status, w.sched_date)}
       ${w.sched_date && !fixed ? `<p style="margin:16px 0 0;font-size:17px;text-align:center">📅 <b>${esc(fday(w.sched_date))}</b>${w.sched_time ? ' · ' + esc(w.sched_time) : ''}${w.assignee ? `<br><span class="mut" style="font-size:15px">${esc(w.assignee)} ${tx('is coming', 'va a venir')}</span>` : ''}</p>` : ''}</div>
      <div class="card"><dl class="kv"><dt>${tx('Where', 'Dónde')}</dt><dd>${esc(w.property)}${w.unit ? ' · ' + esc(/^\d|^[a-z]$/i.test(w.unit) ? tx('Unit ', 'Unidad ') + w.unit : w.unit) : ''}</dd><dt>${tx('Sent', 'Enviada')}</dt><dd>${esc(fdt(w.created))}</dd>${w.description ? `<dt>${tx('Details', 'Detalles')}</dt><dd style="font-weight:500">${esc(w.description)}</dd>` : ''}</dl>
       ${w.photos.length ? `<div class="photos" style="margin-top:14px">${w.photos.map(p => `<img src="/api/pub/status/${tok}/photo/${p.id}${coQ()}" alt="" loading="lazy">`).join('')}</div>` : ''}</div>
      <div class="sec">${tx('Updates', 'Novedades')}</div><div class="card"><ul class="tl">${w.events.slice().reverse().map(e => `<li>${esc(e.body)}<small>${esc([e.author, fdt(e.created)].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul></div>
      ${fixed ? `<div class="bar"><div class="in"><button class="btn white" id="ro">${tx('Still not fixed?', '¿Sigue sin arreglarse?')}</button></div></div>` : `<p class="foot">${tx('Bookmark this page to check your request.', 'Guarde esta página para ver su solicitud.')}</p>`}</div>`;
    wireTop();
    $$('.photos img').forEach(im => im.onclick = () => lightbox(im.src));
    const ro = $('#ro'); if (ro) ro.onclick = async () => { if (!confirm(tx('Tell maintenance it is still not fixed?', '¿Avisar a mantenimiento que sigue sin arreglarse?'))) return; try { await api('pub/status/' + tok, { body: { action: 'reopen' } }); status(tok); } catch (e) { alert(e.message); } };
  });
}
// ---------- maintenance person: job page (no login) ----------
async function job(tok) {
  loading();
  let w; try { w = await api('pub/job/' + tok); } catch (e) { return fail(e.message); }
  S.info = { company: w.company, office_phone: w.office_phone, property: { name: '' } };
  const fixed = ['completed', 'closed'].includes(w.status);
  const tp = w.tenant_phone ? w.tenant_phone.replace(/[^\d+]/g, '') : '';
  draw(() => {
    app.innerHTML = `<div class="wrap">${top()}
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${w.urgent ? `<span class="pill red">🚨 ${tx('URGENT', 'URGENTE')}</span>` : ''}<span class="pill ${fixed ? '' : w.status === 'scheduled' ? 'brand' : 'warn'}">${fixed ? tx('Fixed', 'Arreglado') : w.status === 'scheduled' ? tx('Scheduled', 'Programado') : tx('New', 'Nuevo')}</span><span class="mut" style="margin-left:auto;font-size:14px">#${w.id}</span></div>
      <h1>${esc(w.title)}</h1>
      <div class="card"><div class="addr">${esc(w.address)}</div><div class="row2"><a class="btn sm white" href="${esc(w.map)}" target="_blank" rel="noopener">🗺️ ${tx('Directions', 'Cómo llegar')}</a>${w.office_phone ? `<a class="btn sm white" href="tel:${esc(w.office_phone)}">📞 ${tx('Office', 'Oficina')}</a>` : '<span></span>'}</div></div>
      ${w.tenant || tp ? `<div class="card"><div style="display:flex;align-items:center;gap:12px"><div style="width:46px;height:46px;border-radius:50%;background:var(--brandbg);display:grid;place-items:center;font-size:22px">👤</div><div style="flex:1;min-width:0"><b style="font-size:17px">${esc(w.tenant || tx('Tenant', 'Inquilino'))}</b><div class="mut" style="font-size:14px">${w.entry_ok ? '👍 ' + tx('OK to enter', 'Puede entrar') : '📞 ' + tx('Call before going in', 'Llamar antes de entrar')}</div></div></div>${tp ? `<div class="row2"><a class="btn sm" href="tel:${esc(tp)}">📞 ${tx('Call', 'Llamar')}</a><a class="btn sm white" href="sms:${esc(tp)}">💬 ${tx('Text', 'Mensaje')}</a></div>` : ''}</div>` : ''}
      <div class="card"><b>${tx('Problem', 'Problema')}</b><p style="margin:6px 0 0">${esc(w.description || w.title)}</p>
       ${w.selfhelp && w.selfhelp.steps_tried && w.selfhelp.steps_tried.length ? `<p class="mut" style="font-size:14px;margin:10px 0 0">✓ ${tx('Tenant already tried', 'El inquilino ya probó')}: ${esc(w.selfhelp.steps_tried.join(' · '))}</p>` : ''}
       ${w.photos.length ? `<div class="photos" style="margin-top:14px">${w.photos.map(p => `<img src="/api/pub/job/${tok}/photo/${p.id}${coQ()}" alt="" loading="lazy">`).join('')}</div>` : ''}</div>
      <div class="card">${track(w.status, w.sched_date)}${w.sched_date ? `<p class="center" style="margin:14px 0 0">📅 <b>${esc(fday(w.sched_date))}</b>${w.sched_time ? ' · ' + esc(w.sched_time) : ''}</p>` : ''}${w.fixed_cost != null ? `<p class="center" style="margin:6px 0 0">💵 ${tx('Cost', 'Costo')}: <b>$${(w.fixed_cost / 100).toFixed(2)}</b></p>` : ''}</div>
      <div class="sec">${tx('Updates', 'Novedades')}</div><div class="card"><ul class="tl">${w.events.slice().reverse().map(e => `<li>${esc(e.body)}<small>${esc([e.author, fdt(e.created)].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul></div>
      <div class="bar"><div class="in">${fixed ? `<button class="btn white" id="nt">💬 ${tx('Add a note', 'Agregar nota')}</button>` : `<div class="two"><button class="btn white" id="sc">📅 ${tx('Schedule', 'Programar')}</button><button class="btn good" id="fx">✅ ${tx('Fixed', 'Arreglado')}</button></div>`}</div></div></div>`;
    wireTop();
    $$('.photos img').forEach(im => im.onclick = () => lightbox(im.src));
    const sc = $('#sc'); if (sc) sc.onclick = () => schedSheet(tok, w);
    const fx = $('#fx'); if (fx) fx.onclick = () => fixSheet(tok, w);
    const nt = $('#nt'); if (nt) nt.onclick = () => noteSheet(tok);
  });
}
function sheet(html, wire) {
  const bg = document.createElement('div'); bg.className = 'sheetbg'; bg.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); }; document.body.appendChild(bg); wire(bg.firstChild, () => bg.remove());
}
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function schedSheet(tok, w) {
  const days = [...Array(7)].map((_, n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; });
  let day = w.sched_date || isoD(days[0]), tm = w.sched_time || '';
  const times = [tx('Morning', 'Mañana'), tx('Afternoon', 'Tarde'), tx('Evening', 'Noche')];
  sheet(`<h2>${tx('When will you go?', '¿Cuándo va a ir?')}</h2>
    <label class="l">${tx('Day', 'Día')}</label><div class="seg" id="dd">${days.map((d, n) => `<button type="button" data-d="${isoD(d)}" class="${isoD(d) === day ? 'on' : ''}">${n === 0 ? tx('Today', 'Hoy') : n === 1 ? tx('Tomorrow', 'Mañana') : d.toLocaleDateString(LANG === 'es' ? 'es-US' : 'en-US', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div>
    <label class="l">${tx('Other day', 'Otro día')}</label><input class="t" type="date" id="od">
    <label class="l">${tx('Time', 'Hora')} <small>${tx('optional', 'opcional')}</small></label><div class="seg" id="tt">${times.map(t => `<button type="button" data-t="${t}" class="${t === tm ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div style="height:16px"></div><button class="btn" id="ok">📅 ${tx('Save', 'Guardar')}</button>`, (sh, close) => {
    $$('#dd [data-d]', sh).forEach(b => b.onclick = () => { day = b.dataset.d; $('#od', sh).value = ''; $$('#dd [data-d]', sh).forEach(x => x.classList.toggle('on', x === b)); });
    $('#od', sh).onchange = e => { if (e.target.value) { day = e.target.value; $$('#dd [data-d]', sh).forEach(x => x.classList.remove('on')); } };
    $$('#tt [data-t]', sh).forEach(b => b.onclick = () => { tm = tm === b.dataset.t ? '' : b.dataset.t; $$('#tt [data-t]', sh).forEach(x => x.classList.toggle('on', x.dataset.t === tm)); });
    $('#ok', sh).onclick = async () => { try { await api('pub/job/' + tok, { body: { action: 'scheduled', date: day, time: tm } }); close(); job(tok); } catch (e) { alert(e.message); } };
  });
}
function fixSheet(tok, w) {
  const photos = [];
  sheet(`<h2>${tx('Mark it fixed', 'Marcar arreglado')}</h2>
    <label class="l">${tx('Cost (parts + labor)', 'Costo (piezas + trabajo)')} <small>${tx('optional', 'opcional')}</small></label><div class="money"><span>$</span><input id="ct" inputmode="decimal" placeholder="0.00"></div>
    <label class="l">${tx('Photo of the work', 'Foto del trabajo')}</label><div class="ph" id="fp"></div><input type="file" id="ff" accept="image/*" multiple hidden>
    <label class="l">${tx('Note', 'Nota')} <small>${tx('optional', 'opcional')}</small></label><textarea class="t" id="nt2" placeholder="${tx('What did you do?', '¿Qué hizo?')}" style="min-height:70px"></textarea>
    <div style="height:16px"></div><button class="btn good" id="ok">✅ ${tx('Mark fixed', 'Marcar arreglado')}</button>`, (sh, close) => {
    const dp = () => { const el = $('#fp', sh); el.innerHTML = photos.map(p => `<div class="im ${p.id ? '' : 'up'}" style="background-image:url(${p.url})"></div>`).join('') + (photos.length < 4 ? `<button type="button" class="add" id="fa"><span>📷</span>${tx('Add photo', 'Agregar foto')}</button>` : ''); const a = $('#fa', sh); if (a) a.onclick = () => $('#ff', sh).click(); };
    dp();
    $('#ff', sh).onchange = e => { for (const f0 of [...e.target.files].slice(0, 4 - photos.length)) { const p = { url: URL.createObjectURL(f0) }; photos.push(p); p.job = (async () => { const f = await resizeImage(f0); const fd = new FormData(); fd.append('file', f, f.name); const r = await api(`pub/job/${tok}/upload`, { body: fd }); p.id = r.id; dp(); })().catch(err => { photos.splice(photos.indexOf(p), 1); dp(); alert(err.message); }); } dp(); e.target.value = ''; };
    $('#ok', sh).onclick = async () => { const b = $('#ok', sh); b.disabled = true; try { await Promise.all(photos.map(p => p.job)); await api('pub/job/' + tok, { body: { action: 'fixed', cost: $('#ct', sh).value.trim(), note: $('#nt2', sh).value.trim() } }); close(); job(tok); } catch (e) { b.disabled = false; alert(e.message); } };
  });
}
function noteSheet(tok) {
  sheet(`<h2>${tx('Add a note', 'Agregar nota')}</h2><textarea class="t" id="n"></textarea><div style="height:14px"></div><button class="btn" id="ok">${tx('Save', 'Guardar')}</button>`, (sh, close) => {
    $('#ok', sh).onclick = async () => { const v = $('#n', sh).value.trim(); if (!v) return; try { await api('pub/job/' + tok, { body: { note: v } }); close(); job(tok); } catch (e) { alert(e.message); } };
  });
}
// ---------- company link: choose your home ----------
function choose(list) {
  draw(() => {
    app.innerHTML = `<div class="wrap">${top()}<h1>${tx('Which home?', '¿Cuál casa?')}</h1><p class="sub">${tx('Pick your address.', 'Escoja su dirección.')}</p>
      <div class="card" style="padding:6px">${list.map(p => `<a href="#p=${esc(p.token)}" style="display:flex;align-items:center;gap:12px;padding:14px 12px;color:var(--ink);border-bottom:1px solid var(--line)"><span style="font-size:22px">🏠</span><div><b>${esc(p.name)}</b><div class="mut" style="font-size:14px">${esc(p.city || '')}</div></div><span style="margin-left:auto;color:var(--mut)">›</span></a>`).join('')}</div></div>`;
    wireTop();
  });
}

// ---------- tenant portal invite (no login yet) ----------
async function invite(tok) {
  loading();
  let x; try { x = await api('pub/invite/' + tok); } catch (e) { return fail(e.message); }
  S.info = { company: x.company, property: { name: [x.property, x.unit && !/^(1|main)$/i.test(x.unit) ? tx('Unit ', 'Unidad ') + x.unit : ''].filter(Boolean).join(' · ') } };
  draw(() => {
    app.innerHTML = `<div class="wrap">${top()}
      <div class="done" style="padding-top:8px"><div class="big" style="background:var(--brandbg)">🏠</div><h1>${tx('Welcome', 'Bienvenido')}, ${esc(x.first)}!</h1><p class="sub">${tx('Set up your tenant portal: see your balance, pay rent, request repairs and get your lease — all from your phone.', 'Active su portal: vea su saldo, pague la renta, pida reparaciones y vea su contrato — todo desde su teléfono.')}</p></div>
      <div class="card">${x.existing ? `<p style="margin:0 0 6px"><b>${esc(x.email)}</b></p>` : `<label class="l" style="margin-top:0">${tx('Your email', 'Su correo')}</label><input class="t" id="em" type="email" autocomplete="email" value="${esc(x.email)}" placeholder="you@email.com">`}
       <label class="l">${x.existing ? tx('New password', 'Nueva contraseña') : tx('Create a password', 'Cree una contraseña')} <small>${tx('8+ characters', '8 o más caracteres')}</small></label>
       <div style="position:relative"><input class="t" id="pw" type="password" autocomplete="new-password" placeholder="••••••••"><button type="button" id="sh" style="position:absolute;right:8px;top:8px;border:0;background:#f1f2f6;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer">👁</button></div></div>
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn" id="go">${tx('Open my portal', 'Abrir mi portal')} →</button></div></div></div>`;
    wireTop();
    $('#sh').onclick = () => { const p = $('#pw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#go').onclick = async () => {
      const er = $('#er'); er.hidden = true; const go = $('#go'); go.disabled = true;
      try { await api('pub/invite/' + tok, { body: { email: $('#em') ? $('#em').value.trim() : '', password: $('#pw').value } }); LS.set('lang', LANG); try { localStorage.setItem('pm_lang', LANG); } catch (e) {} location.href = '/#/'; }
      catch (e) { er.textContent = e.message; er.hidden = false; go.disabled = false; }
    };
  });
}
// ---------- lease e-sign (tenant, no login) ----------
function sigPad(el) {
  const c = document.createElement('canvas'); el.appendChild(c); const ctx = c.getContext('2d'); let drawing = false, dirty = false, last = null;
  const size = () => { const r = el.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; c.width = r.width * dpr; c.height = 180 * dpr; c.style.width = r.width + 'px'; c.style.height = '180px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, 180); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#13205c'; dirty = false; };
  size();
  const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', e => { drawing = true; last = pos(e); c.setPointerCapture(e.pointerId); e.preventDefault(); });
  c.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; dirty = true; el.classList.add('signed'); e.preventDefault(); });
  const end = () => { drawing = false; }; c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  c.style.touchAction = 'none';
  return { clear() { size(); el.classList.remove('signed'); }, empty: () => !dirty, jpeg() { const o = document.createElement('canvas'); o.width = 600; o.height = Math.round(600 * c.height / c.width); const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.85); } };
}
function leaseHtml(body, opts = {}) {
  const lines = String(body || '').split('\n'); let first = true; const out = [];
  for (const raw of lines) {
    const ln = raw.trim(); if (!ln) continue;
    if (first) { out.push(`<h2 class="lt">${esc(ln)}</h2>`); first = false; continue; }
    if (/^REVIEW WITH YOUR ATTORNEY/.test(ln)) { out.push(`<p class="lwarn">${esc(ln)}</p>`); continue; }
    const m = /^(\d+)\.\s+([A-Z][A-Z ,&'\/-]+\.)\s*(.*)$/.exec(ln);
    if (m) { const n = +m[1]; out.push(`<div class="lsec" id="sec${n}"><p><b>${n}. ${esc(m[2])}</b> ${esc(m[3])}</p>${opts.tag ? opts.tag(n) : ''}</div>`); continue; }
    out.push(`<p>${esc(ln)}</p>`);
  }
  return out.join('').replace(/\[\[([^\]]+)\]\]/g, '<mark>$1</mark>');
}
function typedSig(name, h = 180) {
  const c = document.createElement('canvas'); c.width = 600; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, h);
  let size = 72; const font = s => `italic ${s}px "Snell Roundhand","Segoe Script","Brush Script MT","Apple Chancery","URW Chancery L","Z003",cursive`;
  x.font = font(size); while (x.measureText(name).width > 560 && size > 24) { size -= 4; x.font = font(size); }
  x.fillStyle = '#13205c'; x.textBaseline = 'middle'; x.fillText(name, 20, h / 2 + 6); return c.toDataURL('image/jpeg', 0.9);
}
async function signDoc(tok) {
  loading();
  let x; try { x = await api('pub/sign/' + tok); } catch (e) { return fail(e.message); }
  S.info = { company: x.company, property: { name: [x.property, x.unit && !/^(1|main)$/i.test(x.unit) ? tx('Unit ', 'Unidad ') + x.unit : ''].filter(Boolean).join(' · ') } };
  const others = x.signers.filter(s => !s.me);
  const chips = () => `<div class="schips">${x.signers.map(s => `<span class="schip ${s.status === 'signed' ? 'ok' : ''}">${s.status === 'signed' ? '✓' : '○'} ${esc(s.me ? tx('You', 'Usted') : s.name.split(' ')[0])}</span>`).join('')}<span class="schip">○ ${tx('Landlord', 'Propietario')}</span></div>`;
  if (x.status !== 'sent' || x.me.status === 'signed') return draw(() => {
    const waiting = x.signers.filter(s => s.status !== 'signed' && !s.me).map(s => s.name.split(' ')[0]);
    app.innerHTML = `<div class="wrap">${top()}<div class="done"><div class="big">${x.status === 'completed' ? '✅' : '✍️'}</div><h1>${x.status === 'completed' ? tx('Lease signed by everyone', 'Contrato firmado por todos') : tx('You signed it!', '¡Ya lo firmó!')}</h1><p class="sub">${x.status === 'completed' ? tx('Your signed copy is ready below and in your tenant portal.', 'Su copia firmada está abajo y en su portal.') : waiting.length ? tx(`Waiting for ${waiting.join(' and ')} to sign, then your landlord countersigns. You'll get the final copy.`, `Esperando la firma de ${waiting.join(' y ')}, luego firma el propietario. Recibirá la copia final.`) : tx('Your landlord will countersign. The final copy will be here and in your portal.', 'El propietario lo firmará también. La copia final estará aquí y en su portal.')}</p>${chips()}</div>
      ${x.has_pdf ? `<div class="bar"><div class="in"><a class="btn" href="/api/pub/sign/${tok}/pdf${new URLSearchParams(location.hash.slice(1)).get('co') ? '?co=' + new URLSearchParams(location.hash.slice(1)).get('co') : ''}" target="_blank" rel="noopener">📄 ${tx('Download signed lease (PDF)', 'Descargar contrato firmado (PDF)')}</a></div></div>` : ''}</div>`; wireTop();
  });
  const need = x.sections.filter(s => s.initials).map(s => s.n);
  const st = { consent: false, name: x.me.name, initials: x.me.initials, mode: 'type', sig: null, ini: new Set(), signed: false };
  const intro = () => draw(() => {
    app.innerHTML = `<div class="wrap">${top()}
      <div class="sintro"><div class="sico">✍️</div><h1>${tx('Your lease is ready to sign', 'Su contrato está listo para firmar')}</h1><p class="sub">${esc(x.company || '')} ${tx('sent you', 'le envió')} <b>${esc(x.title)}</b></p>${chips()}</div>
      <div class="card"><ol class="ssteps"><li>${tx('Adopt your signature (type or draw)', 'Adopte su firma (escrita o dibujada)')}</li><li>${tx(`Read the lease and tap <b>Initial</b> on ${need.length} key sections`, `Lea el contrato y toque <b>Iniciales</b> en ${need.length} secciones`)}</li><li>${tx('Tap <b>Sign here</b> and Finish', 'Toque <b>Firme aquí</b> y Terminar')}</li></ol><p class="mut" style="font-size:13px;margin:8px 0 0">${tx('About 2 minutes.', 'Unos 2 minutos.')}${LANG === 'es' ? ' El contrato está en inglés.' : ''}</p></div>
      <div class="card"><label class="cbox"><input type="checkbox" id="cs" ${st.consent ? 'checked' : ''}><span><b>${tx('I agree to use electronic records and signatures.', 'Acepto usar registros y firmas electrónicas.')}</b><details><summary>${tx('Read the ESIGN / UETA disclosure', 'Leer la divulgación ESIGN / UETA')}</summary><small>${esc(x.disclosure)}</small></details></span></label></div>
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn" id="go">${tx('Continue', 'Continuar')} →</button></div></div></div>`;
    wireTop();
    $('#go').onclick = () => { if (!$('#cs').checked) { const er = $('#er'); er.textContent = tx('Check the box to agree to sign electronically.', 'Marque la casilla para aceptar firmar electrónicamente.'); er.hidden = false; return; } st.consent = true; adopt(); };
  });
  const adopt = () => draw(() => {
    app.innerHTML = `<div class="wrap">${top()}<h1 style="margin-top:6px">${tx('Adopt your signature', 'Adopte su firma')}</h1><p class="sub">${tx('This is how your signature and initials will appear on the lease.', 'Así aparecerán su firma e iniciales en el contrato.')}</p>
      <div class="card"><div class="f2s"><div><label class="l" style="margin-top:0">${tx('Full name', 'Nombre completo')}</label><input class="t" id="nm" autocomplete="name" value="${esc(st.name)}"></div><div style="max-width:110px"><label class="l" style="margin-top:0">${tx('Initials', 'Iniciales')}</label><input class="t" id="in" maxlength="4" autocapitalize="characters" value="${esc(st.initials)}"></div></div>
       <div class="seg" style="margin-top:14px"><button type="button" data-m="type" class="${st.mode === 'type' ? 'on' : ''}">${tx('Type', 'Escribir')}</button><button type="button" data-m="draw" class="${st.mode === 'draw' ? 'on' : ''}">${tx('Draw', 'Dibujar')}</button></div>
       <div id="sbox"></div></div>
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn" id="go">${tx('Adopt and continue', 'Adoptar y continuar')} →</button></div></div></div>`;
    wireTop(); let pad = null;
    const box = () => { const b = $('#sbox'); if (st.mode === 'type') { b.innerHTML = `<div class="tsig"><img id="tsimg" alt=""><span class="tsx">✕</span></div><p class="mut" style="font-size:12.5px;margin:6px 2px 0">${tx('Preview of your typed signature', 'Vista previa de su firma')}</p>`; const upd = () => { $('#tsimg').src = typedSig($('#nm').value.trim() || ' '); }; upd(); $('#nm').oninput = () => { upd(); $('#in').value = $('#nm').value.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 3).join(''); }; pad = null; } else { b.innerHTML = `<label class="l">${tx('Sign with your finger', 'Firme con el dedo')} <a href="javascript:void 0" id="clr" style="float:right;font-weight:600">${tx('Clear', 'Borrar')}</a></label><div class="pad" id="pad"><span>${tx('Sign here', 'Firme aquí')}</span></div>`; pad = sigPad($('#pad')); $('#clr').onclick = () => pad.clear(); $('#nm').oninput = () => { $('#in').value = $('#nm').value.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 3).join(''); }; } };
    box(); $$('.seg button').forEach(bt => bt.onclick = () => { st.mode = bt.dataset.m; $$('.seg button').forEach(z => z.classList.toggle('on', z === bt)); box(); });
    $('#go').onclick = () => {
      const er = $('#er'); er.hidden = true; const bad = m => { er.textContent = m; er.hidden = false; };
      const nm = $('#nm').value.trim(); const ini = $('#in').value.trim().toUpperCase();
      if (nm.length < 3) return bad(tx('Type your full name.', 'Escriba su nombre completo.'));
      if (!ini) return bad(tx('Add your initials.', 'Agregue sus iniciales.'));
      if (st.mode === 'draw' && (!pad || pad.empty())) return bad(tx('Draw your signature in the box.', 'Dibuje su firma en el cuadro.'));
      st.name = nm; st.initials = ini; st.sig = st.mode === 'draw' ? pad.jpeg() : typedSig(nm); docView();
    };
  });
  const docView = () => draw(() => {
    const tag = n => need.includes(n) ? `<button type="button" class="itag ${st.ini.has(n) ? 'done' : ''}" data-ini="${n}">${st.ini.has(n) ? `<span class="istamp">${esc(st.initials)}</span>` : `▶ ${tx('Initial', 'Iniciales')}`}</button>` : '';
    app.innerHTML = `<div class="wrap wide">${top()}
      <div class="sprog"><div><b id="pc">0</b>/${need.length + 1} ${tx('done', 'listo')}</div><div class="pbar"><i id="pb"></i></div></div>
      <div class="card ldoc">${leaseHtml(x.body, { tag })}
        <div class="lsigs"><div class="lsig"><small>${tx('TENANT', 'INQUILINO')}</small><button type="button" class="stag" id="stag">▶ ${tx('Sign here', 'Firme aquí')}</button><b>${esc(st.name)}</b></div>${others.map(o => `<div class="lsig"><small>${tx('TENANT', 'INQUILINO')}</small><div class="lsph">${o.status === 'signed' ? '✓ ' + tx('Signed', 'Firmado') : tx('Waiting', 'Pendiente')}</div><b>${esc(o.name)}</b></div>`).join('')}<div class="lsig"><small>${tx('LANDLORD', 'PROPIETARIO')}</small><div class="lsph">${tx('Signs after you', 'Firma después')}</div></div></div></div>
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn" id="go"></button></div></div></div>`;
    wireTop();
    const next = () => need.find(n => !st.ini.has(n));
    const upd = () => {
      const done = st.ini.size + (st.signed ? 1 : 0); $('#pc').textContent = done; $('#pb').style.width = (100 * done / (need.length + 1)) + '%';
      const go = $('#go'); const n = next();
      if (n != null) go.innerHTML = `↓ ${tx('Next: initial section', 'Siguiente: iniciales sección')} ${n}`; else if (!st.signed) go.innerHTML = `↓ ${tx('Next: sign', 'Siguiente: firmar')}`; else go.innerHTML = `✓ ${tx('Finish', 'Terminar')}`;
      go.classList.toggle('fin', n == null && st.signed);
    };
    const flash = el => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); };
    $$('[data-ini]').forEach(b => b.onclick = () => { const n = +b.dataset.ini; if (st.ini.has(n)) st.ini.delete(n); else st.ini.add(n); b.classList.toggle('done', st.ini.has(n)); b.innerHTML = st.ini.has(n) ? `<span class="istamp">${esc(st.initials)}</span>` : `▶ ${tx('Initial', 'Iniciales')}`; upd(); });
    const sb = $('#stag'); sb.onclick = () => { st.signed = !st.signed; sb.classList.toggle('done', st.signed); sb.innerHTML = st.signed ? `<img src="${st.sig}" alt="">` : `▶ ${tx('Sign here', 'Firme aquí')}`; upd(); };
    $('#go').onclick = async () => {
      const n = next(); if (n != null) return flash($(`[data-ini="${n}"]`)); if (!st.signed) return flash(sb);
      const er = $('#er'); er.hidden = true; const go = $('#go'); go.disabled = true; go.innerHTML = '<div class="spin"></div>';
      try { await api('pub/sign/' + tok, { body: { consent: true, name: st.name, sig: st.sig, sig_mode: st.mode, initials: st.initials, initialed: [...st.ini], hash: x.doc_hash } }); signDoc(tok); }
      catch (e) { go.disabled = false; upd(); er.textContent = e.message; er.hidden = false; er.scrollIntoView({ block: 'center' }); }
    };
    upd();
  });
  intro();
}
// ---------- router ----------
// ---------- v40: category + subcategory, urgency in plain words, best times, pets ----------
const CATS4 = [['plumbing', 'Plumbing', 'Plomería', '🚰', ['Leak', 'Clogged drain', 'Toilet', 'Water heater / no hot water', 'Faucet / sink', 'Shower / tub', 'Sewer backup', 'Low water pressure']], ['electrical', 'Electrical', 'Electricidad', '⚡', ['Outlet / switch', 'No power', 'Lights', 'Breaker keeps tripping', 'Sparks / burning smell']], ['heating', 'Heating / Boiler', 'Calefacción / caldera', '🔥', ['No heat', 'Boiler', 'Radiator / baseboard', 'Thermostat', 'Furnace']], ['ac', 'Air conditioning', 'Aire acondicionado', '❄️', ['Not cooling', 'Leaking water', 'Noisy', 'Thermostat']], ['appliances', 'Appliances', 'Electrodomésticos', '🧊', ['Refrigerator', 'Stove / oven', 'Washer', 'Dryer', 'Dishwasher', 'Microwave', 'Garbage disposal']], ['doors', 'Doors / Locks / Keys', 'Puertas / cerraduras / llaves', '🔑', ['Locked out', 'Lock broken', 'Need a key', 'Door won’t close', 'Garage door']], ['windows', 'Windows', 'Ventanas', '🪟', ['Broken glass', 'Won’t open / close', 'Screen', 'Drafty']], ['roof', 'Roof / Leak from ceiling', 'Techo / gotera del techo', '🏠', ['Ceiling leak', 'Roof leak', 'Gutters']], ['pests', 'Pests', 'Plagas', '🐜', ['Mice / rats', 'Roaches', 'Bed bugs', 'Ants', 'Bees / wasps']], ['mold', 'Mold', 'Moho', '🦠', ['Bathroom', 'Basement', 'Walls / ceiling', 'Windows']], ['flooring', 'Flooring', 'Pisos', '🪵', ['Carpet', 'Tile', 'Wood floor', 'Stairs']], ['walls', 'Walls / Paint', 'Paredes / pintura', '🎨', ['Hole in wall', 'Paint', 'Cracks']], ['smoke', 'Smoke / CO detector', 'Detector de humo / CO', '🚨', ['Chirping / low battery', 'Not working', 'Alarm going off']], ['outdoor', 'Outdoor / Yard / Snow', 'Exterior / patio / nieve', '🌳', ['Snow / ice', 'Lawn', 'Trees', 'Walkway / steps', 'Fence']], ['trash', 'Trash', 'Basura', '🗑️', ['Missed pickup', 'Bins', 'Bulk item']], ['parking', 'Parking', 'Estacionamiento', '🚗', ['Spot taken', 'Lot / driveway', 'Lighting']], ['noise', 'Noise / Neighbor', 'Ruido / vecino', '🔊', ['Noise', 'Neighbor issue']], ['other', 'Other', 'Otro', '🛠️', []]];
const URG4 = [['emergency', 'Emergency', 'Emergencia', 'right now', 'ahora mismo', 'No heat, flood, gas smell, no power, fire or CO alarm, locked out', 'Sin calefacción, inundación, olor a gas, sin luz, fuego o alarma de CO, se quedó afuera'], ['urgent', 'Urgent', 'Urgente', 'within 24 hours', 'en 24 horas', 'Needs a fix today or tomorrow', 'Hay que arreglarlo hoy o mañana'], ['soon', 'Soon', 'Pronto', 'within a few days', 'en unos días', 'Annoying but livable', 'Molesto pero se puede vivir'], ['low', 'Not urgent', 'No urgente', 'when convenient', 'cuando se pueda', 'Small fix, no rush', 'Arreglo pequeño, sin prisa']];
const TIMES4 = [['Weekday mornings', 'Entre semana, mañanas'], ['Weekday afternoons', 'Entre semana, tardes'], ['Weekday evenings', 'Entre semana, noches'], ['Weekends', 'Fines de semana'], ['Anytime', 'A cualquier hora']];
const P2C4 = { breaker: ['electrical', 'Breaker keeps tripping'], gfci: ['electrical', 'Outlet / switch'], toilet_clog: ['plumbing', 'Toilet'], toilet_run: ['plumbing', 'Toilet'], drain: ['plumbing', 'Clogged drain'], disposal: ['appliances', 'Garbage disposal'], hot_water: ['plumbing', 'Water heater / no hot water'], thermostat: ['heating', 'Thermostat'], smoke: ['smoke', 'Chirping / low battery'], appliance: ['appliances', ''], leak: ['plumbing', 'Leak'], door: ['doors', ''], pest: ['pests', ''], sparks: ['electrical', 'Sparks / burning smell'], flood: ['plumbing', 'Leak'], co: ['smoke', 'Alarm going off'], sewage: ['plumbing', 'Sewer backup'], no_heat: ['heating', 'No heat'], lockout: ['doors', 'Locked out'] };
// ---------- v41: tappable tiles + chips for the tenant request (no dropdowns), quick fix after the category, then the details ----------
const TINT41 = { plumbing: '#e6f1ff', electrical: '#fff4d6', heating: '#ffe9e0', ac: '#e3f6fb', appliances: '#ECFDF5', doors: '#f3ece4', windows: '#e8f4ff', roof: '#F1F5F9', pests: '#eef6e4', mold: '#e9f5ee', flooring: '#f6efe6', walls: '#fbe9f1', smoke: '#fdecea', outdoor: '#e7f6ea', trash: '#eef1f4', parking: '#F1F5F9', noise: '#FEF3C7', other: '#f1f2f6' };
const SUBES41 = { 'Leak': 'Fuga', 'Clogged drain': 'Desagüe tapado', 'Toilet': 'Inodoro', 'Water heater / no hot water': 'Calentador / sin agua caliente', 'Faucet / sink': 'Llave / lavamanos', 'Shower / tub': 'Ducha / tina', 'Sewer backup': 'Aguas negras', 'Low water pressure': 'Poca presión de agua', 'Outlet / switch': 'Enchufe / interruptor', 'No power': 'Sin luz', 'Lights': 'Luces', 'Breaker keeps tripping': 'El breaker se dispara', 'Sparks / burning smell': 'Chispas / olor a quemado', 'No heat': 'Sin calefacción', 'Boiler': 'Caldera', 'Radiator / baseboard': 'Radiador / zócalo', 'Thermostat': 'Termostato', 'Furnace': 'Calentador central', 'Not cooling': 'No enfría', 'Leaking water': 'Gotea agua', 'Noisy': 'Hace ruido', 'Refrigerator': 'Nevera', 'Stove / oven': 'Estufa / horno', 'Washer': 'Lavadora', 'Dryer': 'Secadora', 'Dishwasher': 'Lavaplatos', 'Microwave': 'Microondas', 'Garbage disposal': 'Triturador', 'Locked out': 'Me quedé afuera', 'Lock broken': 'Cerradura rota', 'Need a key': 'Necesito llave', 'Door won’t close': 'La puerta no cierra', 'Garage door': 'Puerta del garaje', 'Broken glass': 'Vidrio roto', 'Won’t open / close': 'No abre / no cierra', 'Screen': 'Mosquitero', 'Drafty': 'Entra aire', 'Ceiling leak': 'Gotera del techo', 'Roof leak': 'Gotera del tejado', 'Gutters': 'Canaletas', 'Mice / rats': 'Ratones / ratas', 'Roaches': 'Cucarachas', 'Bed bugs': 'Chinches', 'Ants': 'Hormigas', 'Bees / wasps': 'Abejas / avispas', 'Bathroom': 'Baño', 'Basement': 'Sótano', 'Walls / ceiling': 'Paredes / techo', 'Windows': 'Ventanas', 'Carpet': 'Alfombra', 'Tile': 'Baldosa', 'Wood floor': 'Piso de madera', 'Stairs': 'Escaleras', 'Hole in wall': 'Hueco en la pared', 'Paint': 'Pintura', 'Cracks': 'Grietas', 'Chirping / low battery': 'Pita / batería baja', 'Not working': 'No funciona', 'Alarm going off': 'La alarma suena', 'Snow / ice': 'Nieve / hielo', 'Lawn': 'Césped', 'Trees': 'Árboles', 'Walkway / steps': 'Camino / escalones', 'Fence': 'Cerca', 'Missed pickup': 'No recogieron', 'Bins': 'Botes', 'Bulk item': 'Objeto grande', 'Spot taken': 'Lugar ocupado', 'Lot / driveway': 'Lote / entrada', 'Lighting': 'Iluminación', 'Noise': 'Ruido', 'Neighbor issue': 'Problema con vecino' };
const subT41 = s => LANG === 'es' && SUBES41[s] ? SUBES41[s] : s;
// which quick-fix guide(s) fit a category / type; [] = nothing to try, straight to the details
const SG41 = { plumbing: { 'Leak': ['leak'], 'Clogged drain': ['drain'], 'Toilet': ['toilet_clog', 'toilet_run'], 'Water heater / no hot water': ['hot_water'], 'Faucet / sink': ['drain', 'leak'], 'Shower / tub': ['drain'], '': ['drain', 'toilet_clog', 'toilet_run', 'leak', 'hot_water'] },
  electrical: { 'Outlet / switch': ['gfci', 'breaker'], 'No power': ['breaker'], 'Lights': ['breaker'], 'Breaker keeps tripping': ['breaker'], '': ['breaker', 'gfci'] },
  heating: { 'No heat': ['thermostat'], 'Boiler': ['thermostat'], 'Radiator / baseboard': ['thermostat'], 'Thermostat': ['thermostat'], 'Furnace': ['thermostat'], '': ['thermostat'] },
  ac: { 'Not cooling': ['thermostat'], 'Thermostat': ['thermostat'], 'Noisy': [], 'Leaking water': [], '': ['thermostat'] },
  appliances: { 'Garbage disposal': ['disposal'], '': ['appliance'], '*': ['appliance'] },
  smoke: { 'Chirping / low battery': ['smoke'], 'Not working': ['smoke'], '': ['smoke'] } };
// types that are emergencies: picking one pre-selects Emergency (no quick fix)
const EMSUB41 = { 'Sparks / burning smell': 'sparks', 'Sewer backup': 'sewage', 'Locked out': 'lockout', 'Alarm going off': '', 'No heat': 'no_heat' };
function guides41() { const m = SG41[S.cat]; if (!m) return []; const s = S.subcat || ''; const g = s in m ? m[s] : (m['*'] || []); return g.filter(k => G[k]); }
const radio41 = (name, val, on, inner, cls = '') => `<label class="ch41 ${cls} ${on ? 'on' : ''}"><input type="radio" name="${name}" value="${esc(val)}" ${on ? 'checked' : ''}><span>${inner}</span></label>`;
const check41 = (name, val, on, inner) => `<label class="ch41 ${on ? 'on' : ''}"><input type="checkbox" name="${name}" value="${esc(val)}" ${on ? 'checked' : ''}><span>${inner}</span></label>`;
function wireChips41(root, name, fn) { $$(`input[name="${name}"]`, root).forEach(inp => inp.onchange = () => { $$(`input[name="${name}"]`, root).forEach(i => i.closest('label').classList.toggle('on', i.checked)); fn(inp); }); }
function reset41() { Object.assign(S, { askUrg: false, forceG: '', desc41: null, problem: null, tried: [], urgent: false, cat: '', subcat: '', catOther: '', urg: '', freeText: '', gi: 0, tpicks: [], times: '', pets: '', petsWhat: '', entry: 'yes' }); }
function catHtml41() {
  const c = CATS4.find(z => z[0] === S.cat);
  return `<fieldset class="cg41" ${c ? 'hidden' : ''}><legend class="sec">${tx('What is it about?', '¿De qué se trata?')}</legend><div class="cgrid41">${CATS4.map(z => `<label class="ct41"><input type="radio" name="cat41" value="${z[0]}" ${z[0] === S.cat ? 'checked' : ''}><span class="ic41" style="background:${TINT41[z[0]] || '#f1f2f6'}" aria-hidden="true">${z[3]}</span><b>${esc(tx(z[1], z[2]))}</b></label>`).join('')}</div></fieldset>
    ${c ? `<div class="sel41"><span class="ic41" style="background:${TINT41[c[0]] || '#f1f2f6'}" aria-hidden="true">${c[3]}</span><div><small>${tx('About', 'Sobre')}</small><b>${esc(tx(c[1], c[2]))}</b></div><button type="button" class="lnk41" id="chg41">${tx('Change', 'Cambiar')}</button></div>` : ''}`;
}
function moreHtml41() {
  const c = CATS4.find(z => z[0] === S.cat); if (!c) return '';
  const subs = c[4];
  return `${subs.length ? `<fieldset class="q41"><legend class="l">${tx('What exactly?', '¿Qué exactamente?')} <small>${tx('optional', 'opcional')}</small></legend><div class="chips41">${subs.map(s => radio41('sub41', s, s === S.subcat, esc(subT41(s)))).join('')}${radio41('sub41', '', !S.subcat, tx('Not sure', 'No sé'), 'mut41')}</div></fieldset>` : ''}
    ${S.cat === 'other' ? `<label class="l" for="co4">${tx('What is it?', '¿Qué es?')}</label><input class="t" id="co4" maxlength="80" value="${esc(S.catOther || '')}" placeholder="${tx('e.g. Mailbox, intercom', 'p. ej. Buzón, intercomunicador')}">` : ''}
    <fieldset class="q41"><legend class="l">${tx('How urgent is it?', '¿Qué tan urgente es?')}</legend><div class="ug41">${URG4.map(u => `<label class="uc41 u41-${u[0]} ${S.urg === u[0] ? 'on' : ''}"><input type="radio" name="urg41" value="${u[0]}" ${S.urg === u[0] ? 'checked' : ''}><span><b>${esc(tx(u[1], u[2]))} <i>· ${esc(tx(u[3], u[4]))}</i></b><small>${esc(tx(u[5], u[6]))}</small></span></label>`).join('')}</div></fieldset>`;
}
function home() {
  draw(() => {
    const i = S.info;
    app.innerHTML = `<div class="wrap w41 wide41">${top()}
      <h1>${tx('What needs fixing?', '¿Qué hay que arreglar?')}</h1><p class="sub">${tx('Pick what it’s about. If there’s a quick fix, we’ll show it first. If it doesn’t work, it goes to maintenance.', 'Escoja de qué se trata. Si hay un arreglo rápido, se lo mostramos primero. Si no funciona, va a mantenimiento.')}</p>
      <form class="search" id="q"><input name="q" aria-label="${tx('Describe the problem', 'Describa el problema')}" placeholder="${tx('Or type it: “sink won’t drain”', 'O escríbalo: “el fregadero no drena”')}" autocomplete="off" enterkeyhint="go"><button>${tx('Go', 'Ir')}</button></form>
      <div class="sec red">🚨 ${tx('Emergency?', '¿Emergencia?')}</div>
      <div class="etiles">${EM_ORDER.map(k => `<button class="et" data-em="${k}"><span>${EM[k].e}</span>${esc(tx(...EM[k].t))}</button>`).join('')}</div>
      <div id="cat41">${catHtml41()}</div><div id="more41">${moreHtml41()}</div>
      <div class="err" id="er" hidden></div>
      ${S.mode === 'portal' ? `<div class="foot"><a href="/#/t/requests">${tx('My requests', 'Mis solicitudes')}</a></div>` : ''}
      ${i.office_phone ? `<div class="foot">${tx('Questions?', '¿Preguntas?')} <a href="tel:${esc(i.office_phone)}">${tx('Call the office', 'Llame a la oficina')}</a></div>` : ''}
      <div class="bar" id="bar41" ${S.cat ? '' : 'hidden'}><div class="in"><button class="btn" id="nx41">${tx('Continue', 'Continuar')} →</button></div></div></div>`;
    wireTop();
    $$('[data-em]').forEach(b => b.onclick = () => emergency(b.dataset.em));
    $('#q').onsubmit = e => { e.preventDefault(); const q = e.target.q.value.trim(); if (!q) return; S.freeText = q; pick(matchText(q)); };
    wire41();
  });
}
function wire41() {
  wireChips41($('#cat41'), 'cat41', inp => { S.cat = inp.value; S.subcat = ''; S.catOther = ''; S.gi = 0; redraw41(true); });
  const chg = $('#chg41'); if (chg) chg.onclick = () => { $('.cg41').hidden = false; $('.sel41').remove(); const r = $('input[name=cat41]:checked') || $('input[name=cat41]'); r && r.focus(); $('.cg41').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  wireChips41($('#more41'), 'sub41', inp => { S.subcat = inp.value; S.gi = 0; if (S.subcat in EMSUB41 && S.urg !== 'emergency') { S.urg = 'emergency'; syncUrg41(); } });
  wireChips41($('#more41'), 'urg41', inp => { S.urg = inp.value; });
  const co = $('#co4'); if (co) co.oninput = e => { S.catOther = e.target.value; };
  const nx = $('#nx41'); if (nx) nx.onclick = next41;
}
function syncUrg41() { $$('input[name=urg41]').forEach(i => { i.checked = i.value === S.urg; i.closest('label').classList.toggle('on', i.checked); }); }
function redraw41(focusMore) {
  $('#cat41').innerHTML = catHtml41(); $('#more41').innerHTML = moreHtml41(); $('#bar41').hidden = !S.cat; $('#er').hidden = true; wire41();
  if (focusMore) { const s = $('.sel41'); if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
}
function next41() {
  const er = $('#er'); const bad = m => { er.textContent = m; er.hidden = false; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  if (!S.cat) return bad(tx('Pick what it’s about', 'Escoja de qué se trata'));
  if (S.cat === 'other' && !String(S.catOther || '').trim()) return bad(tx('Type what it is', 'Escriba qué es'));
  if (!S.urg) return bad(tx('Pick how urgent it is', 'Escoja qué tan urgente es'));
  S.urgent = S.urg === 'emergency';
  if (S.urgent) { S.tried = []; S.problem = EMSUB41[S.subcat] || (EM[S.problem] ? S.problem : 'other'); return form(); }
  const gs = guides41(); if (!gs.length) { S.tried = []; if (!G[S.problem]) S.problem = 'other'; return form(); }
  if (G[S.problem] && gs.includes(S.problem)) S.gi = gs.indexOf(S.problem);
  quick41();
}
// search / deep link: a problem word picks the category + type
function pick(k) {
  const ft = S.freeText || ''; reset41(); S.freeText = ft;
  if (isEm(k)) return emergency(k);
  S.problem = k; const p = P2C4[k]; if (p) { S.cat = p[0]; S.subcat = p[1]; }
  if (G[k]) { S.askUrg = true; S.gi = Math.max(0, guides41().indexOf(k)); S.forceG = guides41().includes(k) ? '' : k; return quick41(); }
  home();
}
// ---------- the quick fix step ----------
function quick41() {
  const gs = S.forceG ? [S.forceG] : guides41(); const k = gs[Math.min(S.gi || 0, gs.length - 1)]; const g = G[k]; S.problem = k;
  const c = CATS4.find(z => z[0] === S.cat);
  draw(() => {
    app.innerHTML = `<div class="wrap w41">${top({ back: 1 })}
      <div class="hero"><div class="e" style="background:${g.c}">${g.e}</div><div><h1 class="hq41">${tx('Try this first', 'Intente esto primero')}</h1><span class="pill brand">⏱ ${tx('About', 'Unos')} ${g.time} min</span></div></div>
      <p class="mut41">${c ? esc(tx(c[1], c[2])) : ''}${S.subcat ? ' · ' + esc(subT41(S.subcat)) : ''}${S.freeText ? ` · “${esc(S.freeText)}”` : ''}</p>
      ${gs.length > 1 ? `<fieldset class="q41"><legend class="l">${tx('Which one is it?', '¿Cuál es?')}</legend><div class="chips41">${gs.map((x, n) => radio41('g41', n, x === k, `${G[x].e} ${esc(tx(...G[x].t))}`)).join('')}</div></fieldset>` : `<p class="h41">${esc(tx(...g.t))}</p>`}
      <ol class="steps">${g.steps.map((s, n) => `<li class="step"><div class="n">${s[0]}<i>${n + 1}</i></div><div><b>${esc(LANG === 'es' ? s[3] : s[1])}</b><p>${esc(LANG === 'es' ? s[4] : s[2])}</p></div></li>`).join('')}</ol>
      ${g.warn ? `<div class="warnbox">⚠️<div>${esc(tx(...g.warn))}</div></div>` : ''}
      <div class="bar"><div class="in">${g.sendFirst ? `<button class="btn" data-still>${tx('Done. Continue to send it', 'Listo. Continuar para enviarlo')} →</button>` : `<div class="two"><button class="btn good" data-fixed>✅ ${tx('That fixed it', 'Ya se arregló')}</button><button class="btn dark" data-still>${tx('Still need help', 'Todavía necesito ayuda')} →</button></div>`}</div></div></div>`;
    wireTop(() => { S.forceG = ''; home(); });
    wireChips41(app, 'g41', inp => { S.gi = +inp.value; quick41(); });
    const f = $('[data-fixed]'); if (f) f.onclick = () => { S.forceG = ''; fixedIt(); };
    $('[data-still]').onclick = () => { S.tried = g.steps.map(s => s[1]); S.forceG = ''; form(); };
  });
}
function guide(k) { pick(k); }
// ---------- the details (no dropdowns): what's happening, photos, OK to enter, home times, pets, contact ----------
function form() {
  draw(() => {
    const c = CATS4.find(z => z[0] === S.cat); const u = URG4.find(z => z[0] === S.urg); const em = S.urg === 'emergency';
    const tp = S.tpicks || [];
    app.innerHTML = `<div class="wrap w41">${top({ back: 1 })}
      <h1>${tx('Send to maintenance', 'Enviar a mantenimiento')}</h1>
      <div class="sum41">${c ? `<span class="ic41" style="background:${TINT41[c[0]] || '#f1f2f6'}" aria-hidden="true">${c[3]}</span>` : ''}<div><b>${c ? esc(S.cat === 'other' && S.catOther ? S.catOther : tx(c[1], c[2])) : esc(pT(S.problem || 'other'))}${S.subcat ? ' · ' + esc(subT41(S.subcat)) : ''}</b><div class="tags41">${u ? `<span class="ut41 u41-${u[0]}">${esc(tx(u[1], u[2]))} · ${esc(tx(u[3], u[4]))}</span>` : ''}${S.tried.length ? `<span class="tt41">✓ ${tx('Tried the quick fixes', 'Probó los arreglos rápidos')}</span>` : ''}</div></div><button type="button" class="lnk41" id="ed41">${tx('Change', 'Cambiar')}</button></div>
      ${em ? `<div class="emn41">🚨 ${tx('This goes to maintenance and the owner right away as an EMERGENCY.', 'Esto va enseguida a mantenimiento y al dueño como EMERGENCIA.')}</div>` : ''}
      ${S.askUrg || !S.urg ? `<fieldset class="q41"><legend class="l">${tx('How urgent is it?', '¿Qué tan urgente es?')}</legend><div class="ug41">${URG4.map(z => `<label class="uc41 u41-${z[0]} ${S.urg === z[0] ? 'on' : ''}"><input type="radio" name="urg41" value="${z[0]}" ${S.urg === z[0] ? 'checked' : ''}><span><b>${esc(tx(z[1], z[2]))} <i>· ${esc(tx(z[3], z[4]))}</i></b><small>${esc(tx(z[5], z[6]))}</small></span></label>`).join('')}</div></fieldset>` : ''}
      <label class="l" for="ds">${tx('What’s happening?', '¿Qué está pasando?')} <small>${tx('optional', 'opcional')}</small></label><textarea class="t" id="ds" placeholder="${tx('Where is it? Since when?', '¿Dónde está? ¿Desde cuándo?')}">${esc(S.desc41 != null ? S.desc41 : (S.freeText || ''))}</textarea>
      <div class="l" id="phl">${tx('Photos', 'Fotos')} <small>${tx('helps us bring the right part', 'nos ayuda a traer la pieza correcta')}</small></div>
      <div class="ph" id="phs" role="group" aria-labelledby="phl"></div><input type="file" id="pf" accept="image/*" multiple hidden>
      <fieldset class="q41"><legend class="l">${tx('Can we come in if you’re not home?', '¿Podemos entrar si no está en casa?')}</legend><div class="chips41">${radio41('en41', 'yes', S.entry === 'yes', '👍 ' + tx('Yes, come in', 'Sí, pueden entrar'))}${radio41('en41', 'call', S.entry !== 'yes', '📞 ' + tx('Call me first', 'Llámeme antes'))}</div></fieldset>
      <fieldset class="q41"><legend class="l">${tx('What times are you home?', '¿A qué horas está en casa?')} <small>${tx('pick all that fit', 'escoja todas las que apliquen')}</small></legend><div class="chips41 tg41">${TIMES4.map(t => check41('tm41', t[0], tp.includes(t[0]), esc(tx(t[0], t[1])))).join('')}</div>
      <label class="l sm41" for="bt4">${tx('Other times', 'Otras horas')} <small>${tx('optional', 'opcional')}</small></label><input class="t" id="bt4" maxlength="150" value="${esc(S.times || '')}" placeholder="${tx('e.g. Tue after 5pm', 'p. ej. martes después de las 5pm')}"></fieldset>
      <fieldset class="q41"><legend class="l">${tx('Pets in the unit?', '¿Mascotas en la unidad?')}</legend><div class="chips41">${radio41('pt41', 'no', S.pets === 'no', tx('No pets', 'Sin mascotas'))}${radio41('pt41', 'yes', S.pets === 'yes', '🐾 ' + tx('Yes', 'Sí'))}</div>
      <div id="ptw4" ${S.pets === 'yes' ? '' : 'hidden'}><label class="l sm41" for="pw4">${tx('What pets?', '¿Qué mascotas?')} <small>${tx('optional', 'opcional')}</small></label><input class="t" id="pw4" maxlength="100" value="${esc(S.petsWhat || '')}" placeholder="${tx('e.g. 1 dog, friendly', 'p. ej. 1 perro, amigable')}"></div></fieldset>
      ${contactFields()}
      <div class="err" id="er" hidden></div>
      <div class="bar"><div class="in"><button class="btn ${em ? 'red' : ''}" id="go">${em ? '🚨 ' + tx('Send EMERGENCY request', 'Enviar solicitud de EMERGENCIA') : '📨 ' + tx('Send request', 'Enviar solicitud')}</button></div></div></div>`;
    const back = () => { S.desc41 = $('#ds').value; const gs = guides41(); if (S.tried.length && gs.length && !em) quick41(); else home(); };
    wireTop(back); $('#ed41').onclick = () => { S.desc41 = $('#ds').value; home(); };
    wireContact(); drawPhotos();
    $('#pf').onchange = e => { addPhotos([...e.target.files]); e.target.value = ''; };
    wireChips41(app, 'en41', inp => { S.entry = inp.value; });
    wireChips41(app, 'pt41', inp => { S.pets = inp.value; $('#ptw4').hidden = S.pets !== 'yes'; });
    $$('input[name=tm41]').forEach(inp => inp.onchange = () => { inp.closest('label').classList.toggle('on', inp.checked); S.tpicks = $$('input[name=tm41]:checked').map(i => i.value); });
    $('#bt4').oninput = e => { S.times = e.target.value; }; $('#pw4').oninput = e => { S.petsWhat = e.target.value; };
    $('#ds').oninput = e => { S.desc41 = e.target.value; };
    wireChips41(app, 'urg41', inp => { S.urg = inp.value; });
    $('#go').onclick = () => { if (!S.urg) { const er = $('#er'); er.textContent = tx('Pick how urgent it is', 'Escoja qué tan urgente es'); er.hidden = false; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } submit({ v40: 1, ...(S.urg === 'emergency' ? { urgency: 'urgent' } : {}) }); };
  });
}
async function route() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('job')) return job(h.get('job'));
  if (h.get('invite')) return invite(h.get('invite'));
  if (h.get('sign')) { document.title = 'Sign your lease'; return signDoc(h.get('sign')); }
  if (h.get('invite')) document.title = 'Your tenant portal';
  if (h.get('s')) return status(h.get('s'));
  loading();
  try {
    if (h.has('portal')) { S.mode = 'portal'; S.tok = 'portal'; S.info = await api('t/fixinfo'); S.unit_id = S.info.unit_id; }
    else if (h.get('c')) { const r = await api('pub/fix/' + h.get('c')); S.info = { company: r.company, office_phone: r.office_phone }; return choose(r.choose); }
    else if (h.get('p')) { S.mode = 'link'; S.tok = h.get('p'); S.info = await api('pub/fix/' + S.tok); }
    else return fail(tx('This repair link is not complete. Please ask the office for your link.', 'Este enlace no está completo. Pida su enlace a la oficina.'));
  } catch (e) { return fail(/sign in/i.test(e.message) ? tx('Please sign in to your tenant portal first.', 'Primero inicie sesión en su portal.') : e.message); }
  if (h.get('q')) { S.freeText = h.get('q'); return pick(matchText(S.freeText)); }
  home();
}
window.addEventListener('hashchange', route);
route();
})();
