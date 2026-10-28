// SABİT PARÇA KÜTÜPHANESİ — tüm aygıtların şemaları bu parçalarla çizilir (docs/ANIMASYON.md).
// Dünya koordinatı: 1920×1080 tuval. Hepsi kareye bağlı (useCurrentFrame → useSema().f); CSS animasyonu, Math.random yok.
import { noise2D } from "@remotion/noise";
import React from "react";
import { interpolate, interpolateColors } from "remotion";
import { useSema } from "./baglam";
import { AKIS, AkisTip, C, clamp } from "./tema";

export type Nokta = [number, number];

// Dik köşeli nokta listesinden yuvarlatılmış köşeli yol
export const yol = (n: Nokta[], r = 26) => {
  let d = `M${n[0][0]} ${n[0][1]}`;
  for (let i = 1; i < n.length - 1; i++) {
    const [ax, ay] = n[i - 1];
    const [px, py] = n[i];
    const [bx, by] = n[i + 1];
    const l1 = Math.hypot(px - ax, py - ay);
    const l2 = Math.hypot(bx - px, by - py);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${px - ((px - ax) / l1) * rr} ${py - ((py - ay) / l1) * rr} Q${px} ${py} ${px + ((bx - px) / l2) * rr} ${py + ((by - py) / l2) * rr}`;
  }
  const s = n[n.length - 1];
  return `${d} L${s[0]} ${s[1]}`;
};

// Akış deseni: renk tek başına anlam taşımasın diye ortamlar desenle de ayrılır
const DESEN: Record<AkisTip, string> = {
  sicak: "26 18",
  donus: "26 18",
  soguk: "26 18",
  gaz: "10 12",
  duman: "34 26",
  hava: "34 26",
  elektrik: "0 14",
  yogusma: "6 22",
};
const HIZ = 3.2; // px/kare (akış 1 iken)

/** Odak grubu: vurguda olmayan parçalar soluklaşır */
export const Parca: React.FC<{ id: string | string[]; children: React.ReactNode }> = ({ id, children }) => {
  const { v } = useSema();
  return <g opacity={v(...(Array.isArray(id) ? id : [id]))}>{children}</g>;
};

/**
 * Boru: `akis` durum anahtarı ("isitma", "isitma|kullanim"); `grup` odak kimlikleri.
 * Geç çizilen boru öncekinin üstünden "köprü" gibi geçer (koyu kenar).
 */
export const Boru: React.FC<{ n: Nokta[]; tip: AkisTip; akis: string; grup: string[]; kalin?: number; ters?: boolean }> = ({
  n,
  tip,
  akis,
  grup,
  kalin = 14,
  ters,
}) => {
  const { d, b, v } = useSema();
  const a = d(akis);
  const ofset = (ters ? 1 : -1) * b(akis) * HIZ;
  const p = yol(n);
  if (tip === "elektrik") {
    return (
      <g opacity={v(...grup)}>
        <path d={p} fill="none" stroke={AKIS.elektrik} strokeOpacity={0.18 + 0.2 * a} strokeWidth={3} />
        <path d={p} fill="none" stroke={AKIS.elektrik} strokeOpacity={a} strokeWidth={6} strokeLinecap="round" strokeDasharray={DESEN.elektrik} strokeDashoffset={ofset * 1.6} />
      </g>
    );
  }
  return (
    <g opacity={v(...grup)}>
      <path d={p} fill="none" stroke={C.zeminKoyu} strokeWidth={kalin + 8} strokeLinecap="round" />
      <path d={p} fill="none" stroke="#2A4672" strokeWidth={kalin} strokeLinecap="round" />
      <path d={p} fill="none" stroke={AKIS[tip]} strokeOpacity={0.75 * a} strokeWidth={kalin} strokeLinecap="round" />
      <path d={p} fill="none" stroke="#FFFFFF" strokeOpacity={0.6 * a} strokeWidth={kalin * 0.4} strokeDasharray={DESEN[tip]} strokeDashoffset={ofset} />
    </g>
  );
};

/** Aygıt gövdesi (önü açık kesit) */
export const Kasa: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <g>
    <rect x={x + 10} y={y + 14} width={w} height={h} rx={36} fill="rgba(0,0,0,.25)" />
    <rect x={x} y={y} width={w} height={h} rx={36} fill={C.kasa} stroke={C.kasaCizgi} strokeWidth={6} />
    <rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} rx={24} fill="none" stroke={C.kasaCizgi} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 10" />
  </g>
);

/** Sirkülasyon pompası: çark `akis` birikimiyle döner */
export const Pompa: React.FC<{ x: number; y: number; r?: number; akis: string }> = ({ x, y, r = 36, akis }) => {
  const { d, b } = useSema();
  const aci = b(akis) * 14;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 4} fill={C.zeminKoyu} />
      <circle cx={x} cy={y} r={r} fill={C.parca} stroke={interpolateColors(d(akis), [0, 1], [C.parcaCizgi, C.vurgu])} strokeWidth={4} />
      <g transform={`rotate(${aci} ${x} ${y})`}>
        {[0, 72, 144, 216, 288].map((t) => (
          <path key={t} d={`M${x} ${y} q ${r * 0.35} ${-r * 0.2} ${r * 0.7} ${-r * 0.05}`} transform={`rotate(${t} ${x} ${y})`} stroke={C.yazi} strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
      </g>
      <circle cx={x} cy={y} r={6} fill={C.yazi} />
    </g>
  );
};

/** Fan: dört kanat, `akis` birikimiyle döner */
export const Fan: React.FC<{ x: number; y: number; r?: number; akis: string }> = ({ x, y, r = 38, akis }) => {
  const { d, b } = useSema();
  const aci = b(akis) * 22;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 4} fill={C.zeminKoyu} />
      <circle cx={x} cy={y} r={r} fill={C.parca} stroke={interpolateColors(d(akis), [0, 1], [C.parcaCizgi, C.vurgu])} strokeWidth={4} />
      <g transform={`rotate(${aci} ${x} ${y})`}>
        {[0, 90, 180, 270].map((t) => (
          <ellipse key={t} cx={x + r * 0.42} cy={y} rx={r * 0.42} ry={r * 0.16} fill={C.yazi} fillOpacity={0.85} transform={`rotate(${t} ${x} ${y})`} />
        ))}
      </g>
      <circle cx={x} cy={y} r={7} fill={C.zeminKoyu} />
    </g>
  );
};

/** Brülör ve alev: yükseklik `akis` ile, titreme @remotion/noise ile (deterministik) */
export const Alev: React.FC<{ x1: number; x2: number; y: number; akis: string; boy?: number }> = ({ x1, x2, y, akis, boy = 56 }) => {
  const { d, f } = useSema();
  const a = d(akis);
  const adet = Math.max(4, Math.round((x2 - x1) / 30));
  const ara = (x2 - x1) / adet;
  return (
    <g>
      <defs>
        <linearGradient id="alevRenk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3D7BFF" />
          <stop offset="0.25" stopColor="#FFB13D" />
          <stop offset="1" stopColor="#FF5B3A" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      {Array.from({ length: adet }, (_, i) => {
        const cx = x1 + ara * (i + 0.5);
        const h = boy * a * (0.82 + 0.22 * noise2D("alev", i * 0.9, f * 0.09));
        const w = ara * 0.38;
        return h > 1 ? <path key={i} d={`M${cx - w} ${y} Q${cx - w} ${y - h * 0.55} ${cx} ${y - h} Q${cx + w} ${y - h * 0.55} ${cx + w} ${y} Z`} fill="url(#alevRenk)" /> : null;
      })}
      <rect x={x1 - 6} y={y} width={x2 - x1 + 12} height={14} rx={7} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={3} />
    </g>
  );
};

/** Isı eşanjörü (kangal): `isi` 0..1 kangalı ısıtır */
export const Esanjor: React.FC<{ x: number; y: number; w: number; h: number; isi: number }> = ({ x, y, w, h, isi }) => {
  const kivrim = 5;
  const pts: Nokta[] = [[x + 18, y + h - 20]];
  for (let i = 0; i < kivrim; i++) {
    const yy = y + h - 20 - ((h - 40) * (i + 1)) / kivrim;
    pts.push([i % 2 ? x + 18 : x + w - 18, pts[pts.length - 1][1]], [i % 2 ? x + 18 : x + w - 18, yy]);
  }
  const renk = interpolateColors(isi, [0, 1], [C.parcaCizgi, AKIS.sicak]);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={4} />
      <path d={yol(pts, 14)} fill="none" stroke={renk} strokeWidth={10} strokeLinecap="round" />
      <rect x={x} y={y} width={w} height={h} rx={16} fill={AKIS.sicak} fillOpacity={0.12 * isi} />
    </g>
  );
};

/** Plakalı eşanjör: plakalar sırayla sıcak/soğuk akışkan taşır (iki su karışmaz) */
export const Plaka: React.FC<{ x: number; y: number; w: number; h: number; akis: string }> = ({ x, y, w, h, akis }) => {
  const { d, f } = useSema();
  const a = d(akis);
  const n = 9;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={4} />
      {Array.from({ length: n }, (_, i) => {
        const yy = y + 10 + ((h - 20) * (i + 0.5)) / n;
        const sicak = i % 2 === 0;
        const renk = interpolateColors(a, [0, 1], [C.parcaCizgi, sicak ? AKIS.sicak : AKIS.soguk]);
        return <line key={i} x1={x + 8} x2={x + w - 8} y1={yy} y2={yy} stroke={renk} strokeWidth={5} strokeLinecap="round" strokeDasharray={a > 0.01 ? "10 6" : undefined} strokeDashoffset={(sicak ? -1 : 1) * f * 1.5 * a} />;
      })}
    </g>
  );
};

/** Üç yollu vana: giriş üstten; çıkış `konum` 0 → sağ (ısıtma), 1 → alt (sıcak su) */
export const Vana3: React.FC<{ x: number; y: number; r?: number; konum: number; aktif: number }> = ({ x, y, r = 38, konum, aktif }) => {
  const aci = interpolate(konum, [0, 1], [0, 90], clamp);
  return (
    <g>
      <circle cx={x} cy={y} r={r + 4} fill={C.zeminKoyu} />
      <circle cx={x} cy={y} r={r} fill={C.parca} stroke={interpolateColors(aktif, [0, 1], [C.parcaCizgi, C.vurgu])} strokeWidth={4} />
      <line x1={x} y1={y - r + 6} x2={x} y2={y} stroke={C.yazi} strokeWidth={10} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + r - 6} y2={y} stroke={C.yazi} strokeWidth={10} strokeLinecap="round" transform={`rotate(${aci} ${x} ${y})`} />
      <circle cx={x} cy={y} r={7} fill={C.vurgu} />
    </g>
  );
};

/** Elektronik kart: aktifken ışıklar yanıp söner */
export const Kart: React.FC<{ x: number; y: number; w: number; h: number; aktif: number }> = ({ x, y, w, h, aktif }) => {
  const { f } = useSema();
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#123A3A" stroke={interpolateColors(aktif, [0, 1], [C.parcaCizgi, AKIS.elektrik])} strokeWidth={4} />
      <rect x={x + w * 0.25} y={y + h * 0.3} width={w * 0.5} height={h * 0.35} rx={4} fill={C.zeminKoyu} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + w * (0.25 + i * 0.25)} cy={y + h * 0.82} r={5} fill={AKIS.elektrik} fillOpacity={0.15 + 0.85 * aktif * (Math.floor(f / 8 + i) % 3 === 0 ? 1 : 0.35)} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={x + 10} x2={x + w * 0.22} y1={y + 18 + i * 12} y2={y + 18 + i * 12} stroke={AKIS.elektrik} strokeOpacity={0.35} strokeWidth={2} />
      ))}
    </g>
  );
};

/** Akış sensörü: çalışınca dışa yayılan halka */
export const Sensor: React.FC<{ x: number; y: number; r?: number; akis: string }> = ({ x, y, r = 18, akis }) => {
  const { d, f, b } = useSema();
  const a = d(akis);
  const nabiz = (f % 24) / 24;
  return (
    <g>
      <circle cx={x} cy={y} r={r + nabiz * 30} fill="none" stroke={AKIS.elektrik} strokeOpacity={a * (1 - nabiz)} strokeWidth={3} />
      <circle cx={x} cy={y} r={r} fill={C.parca} stroke={interpolateColors(a, [0, 1], [C.parcaCizgi, AKIS.elektrik])} strokeWidth={4} />
      <g transform={`rotate(${b(akis) * 20} ${x} ${y})`}>
        <line x1={x - r + 6} x2={x + r - 6} y1={y} y2={y} stroke={C.yazi} strokeWidth={4} strokeLinecap="round" />
        <line y1={y - r + 6} y2={y + r - 6} x1={x} x2={x} stroke={C.yazi} strokeWidth={4} strokeLinecap="round" />
      </g>
    </g>
  );
};

/** Petek (radyatör): `isi` ile soldan sağa ısınır, üstünden ısı dalgaları yükselir */
export const Petek: React.FC<{ x: number; y: number; w: number; h: number; isi: number }> = ({ x, y, w, h, isi }) => {
  const { f } = useSema();
  const n = 9;
  const dw = w / n;
  return (
    <g>
      <defs>
        <linearGradient id="petekIsi" x1="0" x2="1">
          <stop offset="0" stopColor={AKIS.sicak} />
          <stop offset="1" stopColor={AKIS.donus} />
        </linearGradient>
      </defs>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={x + i * dw + 4} y={y} width={dw - 8} height={h} rx={(dw - 8) / 2} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={3} />
          <rect x={x + i * dw + 4} y={y} width={dw - 8} height={h} rx={(dw - 8) / 2} fill="url(#petekIsi)" fillOpacity={0.7 * isi} />
        </g>
      ))}
      {isi > 0.02 &&
        [0.2, 0.5, 0.8].map((t, i) => {
          const k = ((f * 1.2 + i * 40) % 120) / 120;
          const xx = x + w * t;
          const yy = y - 20 - k * 90;
          return <path key={i} d={`M${xx} ${yy} q 12 -15 0 -30 q -12 -15 0 -30`} fill="none" stroke={AKIS.sicak} strokeOpacity={isi * Math.sin(Math.PI * k) * 0.8} strokeWidth={5} strokeLinecap="round" />;
        })}
    </g>
  );
};

/** Musluk + lavabo: `acik` ile kol döner ve su akar */
export const Musluk: React.FC<{ x: number; y: number; acik: number; tip?: AkisTip }> = ({ x, y, acik, tip = "sicak" }) => {
  const { f } = useSema();
  const akan = interpolate(acik, [0.2, 1], [0, 1], clamp);
  return (
    <g>
      <rect x={x - 70} y={y + 105} width={140} height={22} rx={11} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={3} />
      <path d={`M${x - 70} ${y + 116} q 0 34 34 34 h 72 q 34 0 34 -34`} fill={C.parca} stroke={C.parcaCizgi} strokeWidth={3} />
      <rect x={x - 6} y={y + 30} width={12} height={75 * akan} fill={AKIS[tip]} fillOpacity={0.85} />
      <line x1={x} x2={x} y1={y + 30} y2={y + 30 + 75 * akan} stroke="#FFFFFF" strokeOpacity={0.7 * akan} strokeWidth={4} strokeDasharray="8 10" strokeDashoffset={-f * 6} />
      {/* boru (x-56, y) noktasından gelir, ağız (x, y+30) */}
      <path d={`M${x - 56} ${y} h 40 q 16 0 16 16 v 14`} fill="none" stroke={C.parcaCizgi} strokeWidth={14} strokeLinecap="round" />
      <g transform={`rotate(${-35 * acik} ${x - 36} ${y - 8})`}>
        <line x1={x - 36} y1={y - 8} x2={x + 6} y2={y - 24} stroke={C.yazi} strokeWidth={8} strokeLinecap="round" />
      </g>
    </g>
  );
};

/** Damlalar (yoğuşma suyu): x boyunca y1'den y2'ye düşer */
export const Damlalar: React.FC<{ x: number; y1: number; y2: number; akis: string; adet?: number }> = ({ x, y1, y2, akis, adet = 4 }) => {
  const { d, f } = useSema();
  const a = d(akis);
  if (a < 0.01) return null;
  return (
    <g>
      {Array.from({ length: adet }, (_, i) => {
        const k = ((f + (i * 60) / adet) % 60) / 60;
        const yy = y1 + (y2 - y1) * k;
        const xx = x + (i - (adet - 1) / 2) * 26;
        return <path key={i} d={`M${xx} ${yy - 12} q 8 10 0 16 q -8 -6 0 -16`} fill={AKIS.yogusma} fillOpacity={a * Math.min(1, 4 * (1 - k))} />;
      })}
    </g>
  );
};
