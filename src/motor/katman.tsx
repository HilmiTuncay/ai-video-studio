// SABİT EKRAN KATMANLARI: kamera, etiketler, adım başlığı, ilerleme, altyazı, kapak, kapanış.
// Etiket ve yazılar ekran uzayında çizilir: kamera yakınlaşsa da yazı boyu sabit kalır.
import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { aktif, Aygit, Cizelge, Etiket, Kamera, KAMERA_GECIS, Kelime, SES_GECIKME, Yer } from "./model";
import { C, DISPLAY, MONO, SERI, clamp, ease, easeInOut } from "./tema";

export type Kutu = { x: number; y: number; w: number; h: number };
export const DUNYA = { w: 1920, h: 1080 };
const TAM: Kamera = { x: DUNYA.w / 2, y: DUNYA.h / 2, z: 1 };

// ---------------- kamera ----------------
export const kameraCoz = (k: Kamera | string, parcalar: Record<string, Kutu>): Kamera => {
  if (typeof k !== "string") return k;
  const p = parcalar[k];
  if (!p) throw new Error(`Kamera hedefi bulunamadı: ${k}`);
  return { x: p.x + p.w / 2, y: p.y + p.h / 2, z: Math.min(2.2, (DUNYA.w * 0.5) / p.w, (DUNYA.h * 0.5) / p.h) };
};

export const kameraAn = (c: Cizelge, f: number, parcalar: Record<string, Kutu>): Kamera => {
  const i = aktif(c, f);
  const k = (n: number) => kameraCoz(c.yerler[n].sahne.kamera, parcalar);
  let cam = k(i);
  if (i > 0) {
    const once = k(i - 1);
    const t = interpolate(f, [c.yerler[i].start, c.yerler[i].start + KAMERA_GECIS], [0, 1], { ...clamp, easing: easeInOut });
    cam = { x: once.x + (cam.x - once.x) * t, y: once.y + (cam.y - once.y) * t, z: once.z + (cam.z - once.z) * t };
  }
  // kapanışta geri çekil
  const g = interpolate(f, [c.kapanisBas, c.kapanisBas + 30], [0, 1], { ...clamp, easing: easeInOut });
  const son = { ...TAM, z: 0.92 };
  return { x: cam.x + (son.x - cam.x) * g, y: cam.y + (son.y - cam.y) * g, z: cam.z + (son.z - cam.z) * g };
};

// Dünya → ekran
export const useEkran = (cam: Kamera) => {
  const { width, height } = useVideoConfig();
  const s = Math.min(width / DUNYA.w, height / DUNYA.h) * cam.z;
  return {
    s,
    donusum: `translate(${width / 2} ${height / 2}) scale(${s}) translate(${-cam.x} ${-cam.y})`,
    nokta: (x: number, y: number) => [(x - cam.x) * s + width / 2, (y - cam.y) * s + height / 2] as const,
    width,
    height,
  };
};

// ---------------- zemin ----------------
export const Zemin: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const { width, height } = useVideoConfig();
  const ara = 48 * cam.z;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: C.zeminKoyu,
        backgroundImage: `linear-gradient(${C.izgara} 1px, transparent 1px), linear-gradient(90deg, ${C.izgara} 1px, transparent 1px), radial-gradient(ellipse at 50% 40%, ${C.zemin} 0%, ${C.zeminKoyu} 100%)`,
        backgroundSize: `${ara}px ${ara}px, ${ara}px ${ara}px, ${width}px ${height}px`,
        backgroundPosition: `${(-cam.x * cam.z) % ara}px ${(-cam.y * cam.z) % ara}px`,
      }}
    />
  );
};

// ---------------- kelime zamanları ----------------
const kucuk = (s: string) => s.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr");
/** sözün seslendirmede başladığı kare (sahne başına göre); bulunamazsa undefined */
export const sozKaresi = (y: Yer, soz?: string) => {
  if (!soz || !y.ses?.kelimeler) return undefined;
  const k = y.ses.kelimeler.find((w) => kucuk(w.k).replace(/[^\p{L}\d]/gu, "").startsWith(kucuk(soz)));
  return k ? SES_GECIKME + k.bas : undefined;
};

// ---------------- etiketler ----------------
const ETIKET_BOY = 32;
const EtiketKutu: React.FC<{ e: Etiket; kutu: Kutu; bas: number; son: number; f: number; cam: Kamera }> = ({ e, kutu, bas, son, f, cam }) => {
  const E = useEkran(cam);
  const [x1, y1] = E.nokta(kutu.x, kutu.y);
  const [x2, y2] = E.nokta(kutu.x + kutu.w, kutu.y + kutu.h);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const yon = e.yon ?? (cx < E.width / 2 ? "sol" : "sag");
  const [ax, ay] = yon === "sol" ? [x1, cy] : yon === "sag" ? [x2, cy] : yon === "ust" ? [cx, y1] : [cx, y2];
  const uzak = 90;
  const [bx, by] = yon === "sol" ? [ax - uzak, ay] : yon === "sag" ? [ax + uzak, ay] : yon === "ust" ? [ax, ay - uzak * 0.8] : [ax, ay + uzak * 0.8];
  const g = interpolate(f, [bas, bas + 12], [0, 1], { ...clamp, easing: ease });
  const cik = interpolate(f, [son - 8, son], [1, 0], clamp);
  if (g <= 0 || cik <= 0) return null;
  const cizgi = interpolate(f, [bas, bas + 10], [0, 1], clamp);
  const kutuG = interpolate(f, [bas + 6, bas + 16], [0, 1], { ...clamp, easing: ease });
  const genis = e.metin.length * ETIKET_BOY * 0.58 + 44;
  const sol = yon === "sol" ? bx - genis : yon === "sag" ? bx : bx - genis / 2;
  const ust = yon === "ust" ? by - 60 : yon === "alt" ? by : by - 30;
  // ekran dışına taşmasın (üst bant ve altyazı alanı dahil)
  const L = Math.max(40, Math.min(E.width - genis - 40, sol));
  const T = Math.max(150, Math.min(E.height - 230, ust));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: cik }}>
      <svg width={E.width} height={E.height} style={{ position: "absolute", inset: 0 }}>
        <rect x={x1 - 10} y={y1 - 10} width={x2 - x1 + 20} height={y2 - y1 + 20} rx={18} fill="none" stroke={C.vurgu} strokeWidth={3} strokeDasharray="10 8" opacity={0.85 * g} />
        <line x1={ax} y1={ay} x2={ax + (bx - ax) * cizgi} y2={ay + (by - ay) * cizgi} stroke={C.vurgu} strokeWidth={3} />
        <circle cx={ax} cy={ay} r={7 * g} fill={C.vurgu} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: L,
          top: T,
          height: 60,
          padding: "0 22px",
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          background: "rgba(7,18,38,.92)",
          border: `2px solid ${C.vurgu}`,
          borderRadius: 14,
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: ETIKET_BOY,
          color: C.yazi,
          opacity: kutuG,
          translate: `0 ${(1 - kutuG) * 10}px`,
        }}
      >
        {e.metin}
      </div>
    </div>
  );
};

export const Etiketler: React.FC<{ c: Cizelge; f: number; cam: Kamera; parcalar: Record<string, Kutu> }> = ({ c, f, cam, parcalar }) => {
  const y = c.yerler[aktif(c, f)];
  if (f >= c.kapanisBas) return null;
  return (
    <>
      {(y.sahne.etiketler ?? []).map((e, i) => {
        const kutu = parcalar[e.parca];
        if (!kutu) throw new Error(`Etiket parçası bulunamadı: ${e.parca}`);
        const bas = y.start + (sozKaresi(y, e.soz) ?? KAMERA_GECIS + i * 16);
        return <EtiketKutu key={`${y.sahne.id}-${i}`} e={e} kutu={kutu} bas={Math.max(y.start + 10, bas)} son={y.end} f={f} cam={cam} />;
      })}
    </>
  );
};

// ---------------- üst bant: seri + adım başlığı + ilerleme ----------------
export const UstBant: React.FC<{ c: Cizelge; f: number }> = ({ c, f }) => {
  const i = aktif(c, f);
  const y = c.yerler[i];
  const { width } = useVideoConfig();
  if (i === 0) return null; // ilk sahnede kapak başlığı var
  const op = interpolate(f, [c.yerler[1].start, c.yerler[1].start + 14, c.kapanisBas, c.kapanisBas + 12], [0, 1, 1, 0], clamp);
  const g = interpolate(f, [y.start, y.start + 14], [0, 1], { ...clamp, easing: ease });
  const adimlar = c.yerler.slice(1);
  return (
    <div style={{ position: "absolute", left: 64, right: 64, top: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-start", opacity: op }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 5, color: C.vurgu }}>{SERI}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6, opacity: g, translate: `${(1 - g) * -20}px 0` }}>
          <span style={{ fontFamily: MONO, fontSize: 30, color: C.soluk }}>{String(i).padStart(2, "0")}</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, color: C.yazi }}>{y.sahne.baslik}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, maxWidth: width * 0.4 }}>
        {adimlar.map((x, k) => {
          const dolu = f >= x.end ? 1 : f >= x.start ? (f - x.start) / (x.end - x.start) : 0;
          return (
            <div key={x.sahne.id} style={{ width: k + 1 === i ? 56 : 24, height: 6, borderRadius: 3, background: "rgba(255,255,255,.2)", overflow: "hidden" }}>
              <div style={{ width: `${dolu * 100}%`, height: "100%", background: C.vurgu }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------- kapak (ilk sahne) ve kapanış ----------------
const Baslik: React.FC<{ a: Aygit; boy: number }> = ({ a, boy }) => {
  const parca = a.vurguKelime ? a.baslik.split(new RegExp(`(${a.vurguKelime})`, "i")) : [a.baslik];
  return (
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: boy, lineHeight: 1.05, color: C.beyaz }}>
      {parca.map((p, i) => (
        <span key={i} style={{ color: a.vurguKelime && p.toLowerCase() === a.vurguKelime.toLowerCase() ? C.vurgu : undefined }}>
          {p}
        </span>
      ))}
    </div>
  );
};

export const Kapak: React.FC<{ a: Aygit; c: Cizelge; f: number }> = ({ a, c, f }) => {
  const y = c.yerler[0];
  const cik = interpolate(f, [y.end - 14, y.end], [1, 0], clamp);
  if (cik <= 0) return null;
  const g = interpolate(f, [2, 22], [0, 1], { ...clamp, easing: ease });
  const g2 = interpolate(f, [12, 30], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: cik }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${C.zeminKoyu} 0%, rgba(7,18,38,.85) 38%, rgba(7,18,38,0) 62%)` }} />
      <div style={{ position: "absolute", left: 110, top: 300, width: 820 }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: C.vurgu, opacity: g }}>{SERI}</div>
        <div style={{ marginTop: 18, opacity: g, translate: `0 ${(1 - g) * 30}px` }}>
          <Baslik a={a} boy={104} />
        </div>
        {a.altBaslik && <div style={{ marginTop: 26, fontFamily: DISPLAY, fontWeight: 500, fontSize: 36, color: C.soluk, opacity: g2 }}>{a.altBaslik}</div>}
        <div style={{ marginTop: 34, width: 140 * g2, height: 6, borderRadius: 3, background: C.vurgu }} />
      </div>
    </div>
  );
};

export const Kapanis: React.FC<{ a: Aygit; c: Cizelge; f: number }> = ({ a, c, f }) => {
  const g = interpolate(f, [c.kapanisBas + 6, c.kapanisBas + 26], [0, 1], { ...clamp, easing: ease });
  if (g <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `rgba(7,18,38,${0.78 * g})` }}>
      <div style={{ opacity: g, scale: String(0.94 + 0.06 * g), textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: C.vurgu }}>{SERI}</div>
        <div style={{ marginTop: 16 }}>
          <Baslik a={a} boy={84} />
        </div>
      </div>
    </div>
  );
};

// ---------------- altyazı ----------------
type Parca = { metin: string; bas: number; kelimeler?: Kelime[] };
const ENCOK = 58; // karakter (iki satıra taşmadan tek satır hedefi)

/** Seslendirmeyi kısa parçalara böl: noktalamada kır, uzun cümleciği eşit böl */
const parcala = (metin: string, frames: number, kelimeler?: Kelime[]): Parca[] => {
  const yazilan = metin.split(/\s+/).filter(Boolean);
  // ses motorunun kelimeleri yazımla bire bir eşleşiyorsa zamanlar kelimeden; değilse karakter oranından
  const esli = kelimeler && kelimeler.length === yazilan.length ? kelimeler : undefined;
  const gruplar: number[][] = [];
  let cur: number[] = [];
  const uzun = (ix: number[]) => ix.map((i) => yazilan[i]).join(" ").length;
  yazilan.forEach((w, i) => {
    if (cur.length && uzun([...cur, i]) > ENCOK) {
      gruplar.push(cur);
      cur = [];
    }
    cur.push(i);
    if (/[.!?…]$/.test(w) || (/[,;:]$/.test(w) && uzun(cur) > ENCOK * 0.45)) {
      gruplar.push(cur);
      cur = [];
    }
  });
  if (cur.length) gruplar.push(cur);
  const toplam = metin.length;
  let t = 0;
  return gruplar.map((g) => {
    const m = g.map((i) => yazilan[i]).join(" ");
    const bas = esli ? esli[g[0]].bas : t;
    t += (m.length / toplam) * frames;
    return { metin: m, bas, kelimeler: esli ? g.map((i) => ({ ...esli[i], k: yazilan[i] })) : undefined };
  });
};

export const Altyazi: React.FC<{ y: Yer; f: number }> = ({ y, f }) => {
  const { width, height } = useVideoConfig();
  const yerel = f - y.start - SES_GECIKME;
  const frames = y.ses?.frames ?? y.end - y.start - SES_GECIKME;
  if (yerel < 0 || yerel > frames + 8) return null;
  const parcalar = parcala(y.sahne.ses, frames, y.ses?.kelimeler);
  let k = 0;
  for (let i = 0; i < parcalar.length; i++) if (yerel >= parcalar[i].bas) k = i;
  const p = parcalar[k];
  const g = interpolate(yerel - p.bas, [0, 5], [0, 1], clamp);
  const op = interpolate(yerel, [0, 4, frames + 2, frames + 8], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: height > width ? 260 : 56, display: "flex", justifyContent: "center", opacity: op }}>
      <div
        style={{
          maxWidth: width - 160,
          padding: "12px 30px",
          borderRadius: 16,
          background: "rgba(7,18,38,.86)",
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 42,
          lineHeight: 1.3,
          color: C.yazi,
          textAlign: "center",
        }}
      >
        <span style={{ opacity: g }}>
          {p.kelimeler
            ? p.kelimeler.map((w, i) => (
                <span key={i} style={{ color: yerel >= w.bas ? C.beyaz : C.soluk }}>
                  {w.k}
                  {i < p.kelimeler!.length - 1 ? " " : ""}
                </span>
              ))
            : p.metin}
        </span>
      </div>
    </div>
  );
};
