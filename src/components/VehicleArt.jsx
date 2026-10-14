/**
 * A drawing of the vehicle's TYPE (user, 2026-10-14: "CarInfo shows the vehicle's image").
 * Our own simple side views, never a maker's photo. `kind` comes from the server
 * (site/vehicleView.js kindOf): car · hatchback · suv · bike · scooter · auto · truck ·
 * bus · tractor · vehicle. `tone` 'dark' for the teal card tops, 'light' on white.
 */
const TONES = {
  dark: { body: '#ffffff', glass: '#9fd8cf', trim: '#ffd84d', wheel: '#06302c', hub: '#d7efe9' },
  light: { body: '#0f766e', glass: '#cdeee8', trim: '#f2b705', wheel: '#0b2e2b', hub: '#e3f2ef' },
};

function Wheel({ x, y = 50, r = 8, c }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c.wheel} />
      <circle cx={x} cy={y} r={r * 0.42} fill={c.hub} />
    </g>
  );
}

const SHAPES = {
  car: (c) => (
    <>
      <path d="M8 46 L10 36 Q12 32 18 31 L34 30 L44 20 Q47 18 52 18 L74 18 Q79 18 82 21 L92 30 L106 32 Q112 33 113 38 L114 46 Z" fill={c.body} />
      <path d="M47 22 L70 22 L70 30 L39 30 Z" fill={c.glass} />
      <path d="M74 22 L80 22 Q82 22 84 24 L89 30 L74 30 Z" fill={c.glass} />
      <rect x="106" y="35" width="6" height="3" rx="1.5" fill={c.trim} />
      <Wheel x={30} c={c} /><Wheel x={92} c={c} />
    </>
  ),
  hatchback: (c) => (
    <>
      <path d="M12 46 L13 36 Q15 31 22 30 L36 29 L46 19 Q49 17 54 17 L80 17 Q86 17 90 22 L98 32 Q103 34 104 39 L104 46 Z" fill={c.body} />
      <path d="M49 21 L66 21 L66 29 L41 29 Z" fill={c.glass} />
      <path d="M70 21 L81 21 Q84 21 86 24 L91 29 L70 29 Z" fill={c.glass} />
      <rect x="98" y="35" width="5" height="3" rx="1.5" fill={c.trim} />
      <Wheel x={32} c={c} /><Wheel x={86} c={c} />
    </>
  ),
  suv: (c) => (
    <>
      <path d="M8 46 L8 32 Q9 27 15 26 L30 25 L40 13 Q42 11 47 11 L94 11 Q99 11 101 15 L106 25 Q113 27 113 33 L113 46 Z" fill={c.body} />
      <path d="M44 15 L64 15 L64 25 L35 25 Z" fill={c.glass} />
      <path d="M68 15 L95 15 L99 25 L68 25 Z" fill={c.glass} />
      <rect x="47" y="7" width="40" height="3" rx="1.5" fill={c.trim} />
      <Wheel x={30} r={9} c={c} /><Wheel x={92} r={9} c={c} />
    </>
  ),
  bike: (c) => (
    <>
      <Wheel x={26} y={46} r={11} c={c} /><Wheel x={94} y={46} r={11} c={c} />
      <path d="M26 46 L50 30 L74 30 L94 46" fill="none" stroke={c.body} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 30 L60 44 L74 30" fill="none" stroke={c.body} strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 25 Q54 20 66 25 L66 29 L46 29 Z" fill={c.body} />
      <rect x="54" y="33" width="12" height="9" rx="2" fill={c.trim} />
      <path d="M82 30 L86 18 L94 17" fill="none" stroke={c.body} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  scooter: (c) => (
    <>
      <Wheel x={28} y={48} r={9} c={c} /><Wheel x={92} y={48} r={9} c={c} />
      <path d="M16 46 Q16 32 32 32 L52 32 L56 40 L80 40 L86 22 L92 20 L94 24 L90 26 L86 42 Q98 42 102 48 L80 48 Q60 48 54 46 Z" fill={c.body} />
      <path d="M22 30 Q30 24 48 26 L50 31 L24 32 Z" fill={c.trim} />
      <rect x="88" y="14" width="10" height="4" rx="2" fill={c.body} />
    </>
  ),
  auto: (c) => (
    <>
      <path d="M22 46 L22 22 Q22 12 34 12 L78 12 Q88 12 92 20 L100 34 Q104 38 104 46 Z" fill={c.trim} />
      <path d="M22 26 L82 26 L82 46 L22 46 Z" fill={c.body} />
      <path d="M30 16 L62 16 L62 26 L30 26 Z" fill={c.glass} />
      <path d="M68 16 L80 16 Q86 16 88 22 L90 26 L68 26 Z" fill={c.glass} />
      <Wheel x={36} c={c} /><Wheel x={90} c={c} />
    </>
  ),
  truck: (c) => (
    <>
      <rect x="8" y="12" width="70" height="32" rx="3" fill={c.trim} />
      <path d="M80 44 L80 20 Q80 16 84 16 L100 16 Q104 16 106 20 L113 32 L113 44 Z" fill={c.body} />
      <path d="M86 20 L99 20 L106 31 L86 31 Z" fill={c.glass} />
      <rect x="8" y="42" width="105" height="5" rx="2" fill={c.body} />
      <Wheel x={24} c={c} /><Wheel x={44} c={c} /><Wheel x={98} c={c} />
    </>
  ),
  bus: (c) => (
    <>
      <rect x="6" y="10" width="108" height="36" rx="6" fill={c.body} />
      {[12, 30, 48, 66, 84].map((x) => <rect key={x} x={x} y="15" width="14" height="12" rx="2" fill={c.glass} />)}
      <rect x="100" y="15" width="10" height="22" rx="2" fill={c.glass} />
      <rect x="6" y="31" width="92" height="4" fill={c.trim} />
      <Wheel x={26} c={c} /><Wheel x={92} c={c} />
    </>
  ),
  tractor: (c) => (
    <>
      <path d="M40 40 L40 12 L64 12 L66 28 L100 28 Q106 28 106 34 L106 40 Z" fill={c.body} />
      <path d="M44 16 L60 16 L61 27 L44 27 Z" fill={c.glass} />
      <rect x="92" y="14" width="4" height="14" fill={c.trim} />
      <Wheel x={36} y={42} r={15} c={c} /><Wheel x={96} y={48} r={9} c={c} />
    </>
  ),
};
SHAPES.vehicle = SHAPES.car;

export default function VehicleArt({ kind, tone = 'dark', className = '', title }) {
  const draw = SHAPES[kind] || SHAPES.vehicle;
  const c = TONES[tone] || TONES.dark;
  return (
    <svg viewBox="0 0 120 64" className={className} role="img" aria-label={title || `${kind || 'vehicle'} illustration`} data-test="vehicle-art">
      <ellipse cx="60" cy="59" rx="54" ry="3" fill="#000" opacity="0.12" />
      {draw(c)}
    </svg>
  );
}
