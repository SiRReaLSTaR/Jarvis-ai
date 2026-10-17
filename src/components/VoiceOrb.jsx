import { useId } from 'react';
const labels = { idle: 'Hazır', connecting: 'Bağlanıyor', listening: 'Dinliyor', thinking: 'Düşünüyor', speaking: 'Konuşuyor', error: 'Bağlantıyı kontrol et' };
const polar = (r, a) => [240 + Math.cos(a) * r, 240 + Math.sin(a) * r];
const waves = Array.from({ length: 3 }, (_, i) => Array.from({ length: 241 }, (_, j) => {
  const a = j / 240 * Math.PI * 2, r = 94 + i * 15 + Math.sin(a * 7 + i) * 4 + Math.cos(a * 3) * 3;
  const [x, y] = polar(r, a); return `${j ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
}).join(' ') + 'Z');
const ticks = Array.from({ length: 100 }, (_, i) => {
  const a = i * Math.PI / 50, [x1,y1] = polar(i % 5 ? 202 : 197, a), [x2,y2] = polar(208, a);
  return { x1, y1, x2, y2, major: i % 5 === 0 };
});
const dots = Array.from({ length: 28 }, (_, i) => { const [cx,cy] = polar(145 + i % 4 * 18, i * 2.39996); return { cx,cy }; });
export default function VoiceOrb({ phase, name, role }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <section className={`voiceOrb phase-${phase}`} aria-label={`${name}: ${labels[phase] || labels.idle}`}>
    <div className="hudCoreLabel" aria-hidden="true"><span>JARVIS</span><span>VOICE INTERFACE</span></div>
    <svg className="hudReactor" viewBox="0 0 480 480" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}halo`}><stop offset="0" stopColor="currentColor" stopOpacity=".5"/><stop offset=".3" stopColor="currentColor" stopOpacity=".15"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${id}core`}><stop offset="0" stopColor="#f0ffff"/><stop offset=".16" stopColor="currentColor" stopOpacity=".95"/><stop offset=".55" stopColor="currentColor" stopOpacity=".18"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
        <filter id={`${id}glow`} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <circle cx="240" cy="240" r="230" fill={`url(#${id}halo)`}/>
      <g className="hudOrbits" fill="none" stroke="currentColor">
        <ellipse cx="240" cy="240" rx="230" ry="112" transform="rotate(-24 240 240)"/>
        <ellipse cx="240" cy="240" rx="223" ry="160" transform="rotate(45 240 240)"/>
        <circle cx="240" cy="240" r="226" strokeDasharray="1 8"/>
      </g>
      <g className="hudTicks" stroke="currentColor">{ticks.map((t,i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} opacity={t.major ? '.8' : '.3'} strokeWidth={t.major ? '1.5' : '.8'}/>)}</g>
      <g className="hudSpin" fill="none" stroke="currentColor">
        <circle cx="240" cy="240" r="191" strokeWidth="2" strokeDasharray="180 38 9 22 95 80"/>
        <circle cx="240" cy="240" r="183" strokeWidth=".6"/>
        <circle cx="240" cy="240" r="175" strokeWidth="4" strokeDasharray="1 6" opacity=".5"/>
      </g>
      <g className="hudSpinReverse" fill="none" stroke="currentColor">
        <circle cx="240" cy="240" r="160" strokeWidth="1.3" strokeDasharray="110 36 40 17"/>
        <circle cx="240" cy="240" r="149" strokeWidth=".5"/>
        <circle cx="240" cy="240" r="139" strokeWidth="2" strokeDasharray="2 8 24 8" opacity=".7"/>
      </g>
      <g className="hudEnergy" fill="none" stroke="currentColor">{waves.map((d,i) => <path d={d} key={i} opacity={.3 + i * .15} strokeWidth={i === 0 ? 1.5 : .7}/>)}</g>
      <g fill="currentColor">{dots.map((dot,i) => <circle key={i} {...dot} r={i % 4 ? '1' : '2.3'} opacity={i % 4 ? '.45' : '.9'}/>)}</g>
      <g className="hudAmber" fill="none" stroke="#edbb61"><path d="M278 38 A206 206 0 0 1 350 67"/><path d="M88 375 A206 206 0 0 0 111 399" strokeWidth="2"/><path d="m391 108 4-7 4 7Z"/></g>
      <circle cx="240" cy="240" r="90" fill={`url(#${id}core)`}/>
      <g className="hudInner" fill="none" stroke="currentColor"><circle cx="240" cy="240" r="65" strokeDasharray="45 9"/><circle cx="240" cy="240" r="49" opacity=".65"/><circle cx="240" cy="240" r="31" strokeDasharray="1 4"/></g>
      <path d="M212 240h56M240 212v56" stroke="#d0fbff" strokeWidth=".7" opacity=".7"/>
      <circle className="hudPulse" cx="240" cy="240" r="12" fill="currentColor" filter={`url(#${id}glow)`}/>
      <circle cx="240" cy="240" r="4" fill="#e8ffff"/>
    </svg>
    <p className="orbStatus" role="status">{labels[phase] || labels.idle}</p>
    <small>{name} · {role}</small>
    <div className="hudSignal" aria-hidden="true">{Array.from({length:45},(_,i) => <i key={i} style={{'--bar': `${5 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .25)) * 27}px`, '--delay': `${i * -.07}s`}}/>)}</div>
  </section>;
}
