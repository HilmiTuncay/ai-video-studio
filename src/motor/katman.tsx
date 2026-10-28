// SABİT EKRAN KATMANLARI: kamera, etiketler, adım başlığı, ilerleme, altyazı, kapak, kapanış.
// Etiket ve yazılar ekran uzayında çizilir: kamera yakınlaşsa da yazı boyu sabit kalır.
// Her şey biçime duyarlıdır (9:16 varsayılan, 16:9); yerleşim değerleri `yerlesim()` içindedir.
import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { aktif, Aygit, Cizelge, Etiket, Kamera, KAMERA_GECIS, KameraHedef, Kelime, SES_GECIKME, Yer } from "./model";
import { C, DISPLAY, MONO, SERI, clamp, ease, easeInOut } from "./tema";

export type Kutu = { x: number; y: number; w: number; h: number };
export const DUNYA = { w: 1920, h: 1080 };

// ---------------- biçime göre yerleşim ----------------
type Alan = { l: number; t: number; r: number; b: number };
export const yerlesim = (width: number, height: number) => {
  const dikey = height > width;
  return {
    dikey,
    // odaktaki parçaların sığdırıldığı alan (üst bant, altyazı ve Reels/Shorts arayüzü dışında)
    guvenli: (dikey ? { l: 60, t: 360, r: width - 60, b: height - 520 } : { l: 110, t: 180, r: width - 110, b: height - 170 }) as Alan,
    // kapak sahnesinde başlığın dışında kalan alan
    kapakAlan: (dikey ? { l: 50, t: 800, r: width - 50, b: height - 400 } : { l: 900, t: 140, r: width - 60, b: height - 150 }) as Alan,
    ustBant: dikey ? 120 : 48,
    yanBosluk: dikey ? 60 : 64,
    baslikBoy: dikey ? 52 : 46,
    altyaziBoy: dikey ? 48 : 42,
    altyaziAlt: dikey ? 330 : 56,
    altyaziKarakter: dikey ? 34 : 58,
    etiketBoy: dikey ? 34 : 32,
    etiketUzak: dikey ? 70 : 90,
    kapakBoy: dikey ? 112 : 104,
  };
};

// ---------------- kamera ----------------
const EN_YAKIN = 2.6; // z üst sınırı (dünya genişliği ekranın 2.6 katı)

/** Parça listesini güvenli alana sığdıran kamera (biçimden bağımsız içerik) */
export const kameraCoz = (k: KameraHedef, parcalar: Record<string, Kutu>, width: number, height: number, kapak = false): Kamera => {
  if (typeof k === "object" && !Array.isArray(k)) return k;
  const ids = Array.isArray(k) ? k : [k];
  const kutular = ids.map((id) => {
    const p = parcalar[id];
    if (!p) throw new Error(`Kamera hedefi bulunamadı: ${id}`);
    return p;
  });
  const pay = 50;
  const x0 = Math.min(...kutular.map((p) => p.x)) - pay;
  const y0 = Math.min(...kutular.map((p) => p.y)) - pay;
  const x1 = Math.max(...kutular.map((p) => p.x + p.w)) + pay;
  const y1 = Math.max(...kutular.map((p) => p.y + p.h)) + pay;
  const Y = yerlesim(width, height);
  const a = kapak ? Y.kapakAlan : Y.guvenli;
  const taban = width / DUNYA.w;
  const s = Math.min((a.r - a.l) / (x1 - x0), (a.b - a.t) / (y1 - y0), EN_YAKIN * taban);
  return {
    x: (x0 + x1) / 2 - ((a.l + a.r) / 2 - width / 2) / s,
    y: (y0 + y1) / 2 - ((a.t + a.b) / 2 - height / 2) / s,
    z: s / taban,
  };
};

export const kameraAn = (c: Cizelge, f: number, parcalar: Record<string, Kutu>, width: number, height: number): Kamera => {
  const i = aktif(c, f);
  const k = (n: number) => kameraCoz(c.yerler[n].sahne.kamera, parcalar, width, height, n === 0);
  let cam = k(i);
  if (i > 0) {
    const once = k(i - 1);
    const t = interpolate(f, [c.yerler[i].start, c.yerler[i].start + KAMERA_GECIS], [0, 1], { ...clamp, easing: easeInOut });
    cam = { x: once.x + (cam.x - once.x) * t, y: once.y + (cam.y - once.y) * t, z: once.z + (cam.z - once.z) * t };
  }
  // kapanışta geri çekil: bütün parçalar ortada
  const g = interpolate(f, [c.kapanisBas, c.kapanisBas + 30], [0, 1], { ...clamp, easing: easeInOut });
  if (g <= 0) return cam;
  const son = kameraCoz(Object.keys(parcalar), parcalar, width, height);
  return { x: cam.x + (son.x - cam.x) * g, y: cam.y + (son.y - cam.y) * g, z: cam.z + (son.z * 0.9 - cam.z) * g };
};

// Dünya → ekran
export const useEkran = (cam: Kamera) => {
  const { width, height } = useVideoConfig();
  const s = (width / DUNYA.w) * cam.z;
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
  const E = useEkran(cam);
  const ara = 48 * E.s;
  const [ox, oy] = E.nokta(0, 0);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: C.zeminKoyu,
        backgroundImage: `linear-gradient(${C.izgara} 1px, transparent 1px), linear-gradient(90deg, ${C.izgara} 1px, transparent 1px), radial-gradient(ellipse at 50% 40%, ${C.zemin} 0%, ${C.zeminKoyu} 100%)`,
        backgroundSize: `${ara}px ${ara}px, ${ara}px ${ara}px, ${E.width}px ${E.height}px`,
        backgroundPosition: `${ox % ara}px ${oy % ara}px, ${ox % ara}px ${oy % ara}px, 0 0`,
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
type Yon = NonNullable<Etiket["yon"]>;
const EtiketKutu: React.FC<{ e: Etiket; kutu: Kutu; bas: number; son: number; f: number; cam: Kamera }> = ({ e, kutu, bas, son, f, cam }) => {
  const E = useEkran(cam);
  const Y = yerlesim(E.width, E.height);
  const [x1, y1] = E.nokta(kutu.x, kutu.y);
  const [x2, y2] = E.nokta(kutu.x + kutu.w, kutu.y + kutu.h);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const boy = Y.etiketBoy;
  const genis = e.metin.length * boy * 0.58 + 44;
  const yuk = boy + 28;
  const uzak = Y.etiketUzak;
  const yerles = (yon: Yon) => {
    const [ax, ay] = yon === "sol" ? [x1, cy] : yon === "sag" ? [x2, cy] : yon === "ust" ? [cx, y1] : [cx, y2];
    const [bx, by] = yon === "sol" ? [ax - uzak, ay] : yon === "sag" ? [ax + uzak, ay] : yon === "ust" ? [ax, ay - uzak] : [ax, ay + uzak];
    const sol = yon === "sol" ? bx - genis : yon === "sag" ? bx : bx - genis / 2;
    const ust = yon === "ust" ? by - yuk : yon === "alt" ? by : by - yuk / 2;
    return { ax, ay, bx, by, sol, ust, sigar: sol >= 30 && sol + genis <= E.width - 30 };
  };
  // istenen yön sığmıyorsa (dar 9:16 ekranda sık) önce karşı yan, sonra üst/alt denenir
  const istenen: Yon = e.yon ?? (cx < E.width / 2 ? "sol" : "sag");
  const sira: Yon[] = [istenen, istenen === "sol" ? "sag" : istenen === "sag" ? "sol" : istenen, cy > E.height / 2 ? "ust" : "alt", cy > E.height / 2 ? "alt" : "ust"];
  const y = sira.map(yerles).find((x) => x.sigar) ?? yerles(istenen);
  const g = interpolate(f, [bas, bas + 12], [0, 1], { ...clamp, easing: ease });
  const cik = interpolate(f, [son - 8, son], [1, 0], clamp);
  if (g <= 0 || cik <= 0) return null;
  const cizgi = interpolate(f, [bas, bas + 10], [0, 1], clamp);
  const kutuG = interpolate(f, [bas + 6, bas + 16], [0, 1], { ...clamp, easing: ease });
  // ekran dışına taşmasın (üst bant ve altyazı alanı dahil)
  const L = Math.max(30, Math.min(E.width - genis - 30, y.sol));
  const T = Math.max(Y.guvenli.t - 150, Math.min(E.height - Y.altyaziAlt - 150, y.ust));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: cik }}>
      <svg width={E.width} height={E.height} style={{ position: "absolute", inset: 0 }}>
        <rect x={x1 - 10} y={y1 - 10} width={x2 - x1 + 20} height={y2 - y1 + 20} rx={18} fill="none" stroke={C.vurgu} strokeWidth={3} strokeDasharray="10 8" opacity={0.85 * g} />
        <line x1={y.ax} y1={y.ay} x2={y.ax + (y.bx - y.ax) * cizgi} y2={y.ay + (y.by - y.ay) * cizgi} stroke={C.vurgu} strokeWidth={3} />
        <circle cx={y.ax} cy={y.ay} r={7 * g} fill={C.vurgu} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: L,
          top: T,
          height: yuk,
          padding: "0 22px",
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          background: "rgba(7,18,38,.92)",
          border: `2px solid ${C.vurgu}`,
          borderRadius: 14,
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: boy,
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
  const { width, height } = useVideoConfig();
  const Y = yerlesim(width, height);
  if (i === 0) return null; // ilk sahnede kapak başlığı var
  const op = interpolate(f, [c.yerler[1].start, c.yerler[1].start + 14, c.kapanisBas, c.kapanisBas + 12], [0, 1, 1, 0], clamp);
  const g = interpolate(f, [y.start, y.start + 14], [0, 1], { ...clamp, easing: ease });
  const adimlar = c.yerler.slice(1);
  const ilerleme = (
    <div style={{ display: "flex", gap: 8, marginTop: Y.dikey ? 22 : 10 }}>
      {adimlar.map((x, k) => {
        const dolu = f >= x.end ? 1 : f >= x.start ? (f - x.start) / (x.end - x.start) : 0;
        return (
          <div key={x.sahne.id} style={{ width: k + 1 === i ? 56 : 24, height: 6, borderRadius: 3, background: "rgba(255,255,255,.2)", overflow: "hidden" }}>
            <div style={{ width: `${dolu * 100}%`, height: "100%", background: C.vurgu }} />
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: Y.yanBosluk, right: Y.yanBosluk, top: Y.ustBant, display: "flex", flexDirection: Y.dikey ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", opacity: op }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: Y.dikey ? 24 : 20, letterSpacing: 5, color: C.vurgu }}>{SERI}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6, opacity: g, translate: `${(1 - g) * -20}px 0` }}>
          <span style={{ fontFamily: MONO, fontSize: Y.baslikBoy * 0.65, color: C.soluk }}>{String(i).padStart(2, "0")}</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: Y.baslikBoy, color: C.yazi }}>{y.sahne.baslik}</span>
        </div>
      </div>
      {ilerleme}
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
  const { width, height } = useVideoConfig();
  const Y = yerlesim(width, height);
  const y = c.yerler[0];
  const cik = interpolate(f, [y.end - 14, y.end], [1, 0], clamp);
  if (cik <= 0) return null;
  const g = interpolate(f, [2, 22], [0, 1], { ...clamp, easing: ease });
  const g2 = interpolate(f, [12, 30], [0, 1], { ...clamp, easing: ease });
  const perde = Y.dikey
    ? `linear-gradient(180deg, ${C.zeminKoyu} 0%, rgba(7,18,38,.85) 40%, rgba(7,18,38,0) 55%)`
    : `linear-gradient(90deg, ${C.zeminKoyu} 0%, rgba(7,18,38,.85) 38%, rgba(7,18,38,0) 62%)`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: cik }}>
      <div style={{ position: "absolute", inset: 0, background: perde }} />
      <div style={{ position: "absolute", left: Y.dikey ? 70 : 110, top: Y.dikey ? 330 : 300, width: Y.dikey ? width - 140 : 820 }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: C.vurgu, opacity: g }}>{SERI}</div>
        <div style={{ marginTop: 18, opacity: g, translate: `0 ${(1 - g) * 30}px` }}>
          <Baslik a={a} boy={Y.kapakBoy} />
        </div>
        {a.altBaslik && <div style={{ marginTop: 26, fontFamily: DISPLAY, fontWeight: 500, fontSize: Y.dikey ? 40 : 36, color: C.soluk, opacity: g2 }}>{a.altBaslik}</div>}
        <div style={{ marginTop: 34, width: 140 * g2, height: 6, borderRadius: 3, background: C.vurgu }} />
      </div>
    </div>
  );
};

export const Kapanis: React.FC<{ a: Aygit; c: Cizelge; f: number }> = ({ a, c, f }) => {
  const { width, height } = useVideoConfig();
  const Y = yerlesim(width, height);
  const g = interpolate(f, [c.kapanisBas + 6, c.kapanisBas + 26], [0, 1], { ...clamp, easing: ease });
  if (g <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, background: `rgba(7,18,38,${0.78 * g})` }}>
      <div style={{ opacity: g, scale: String(0.94 + 0.06 * g), textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: C.vurgu }}>{SERI}</div>
        <div style={{ marginTop: 16 }}>
          <Baslik a={a} boy={Y.dikey ? 92 : 84} />
        </div>
      </div>
    </div>
  );
};

// ---------------- altyazı ----------------
type Parca = { metin: string; bas: number; kelimeler?: Kelime[] };

/** Seslendirmeyi kısa parçalara böl: noktalamada kır, uzun cümleciği böl */
const parcala = (metin: string, frames: number, enCok: number, kelimeler?: Kelime[]): Parca[] => {
  const yazilan = metin.split(/\s+/).filter(Boolean);
  // ses motorunun kelimeleri yazımla bire bir eşleşiyorsa zamanlar kelimeden; değilse karakter oranından
  const esli = kelimeler && kelimeler.length === yazilan.length ? kelimeler : undefined;
  const gruplar: number[][] = [];
  let cur: number[] = [];
  const uzun = (ix: number[]) => ix.map((i) => yazilan[i]).join(" ").length;
  yazilan.forEach((w, i) => {
    if (cur.length && uzun([...cur, i]) > enCok) {
      gruplar.push(cur);
      cur = [];
    }
    cur.push(i);
    if (/[.!?…]$/.test(w) || (/[,;:]$/.test(w) && uzun(cur) > enCok * 0.45)) {
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
  const Y = yerlesim(width, height);
  const yerel = f - y.start - SES_GECIKME;
  const frames = y.ses?.frames ?? y.end - y.start - SES_GECIKME;
  if (yerel < 0 || yerel > frames + 8) return null;
  const parcalar = parcala(y.sahne.ses, frames, Y.altyaziKarakter, y.ses?.kelimeler);
  let k = 0;
  for (let i = 0; i < parcalar.length; i++) if (yerel >= parcalar[i].bas) k = i;
  const p = parcalar[k];
  const g = interpolate(yerel - p.bas, [0, 5], [0, 1], clamp);
  const op = interpolate(yerel, [0, 4, frames + 2, frames + 8], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: Y.altyaziAlt, display: "flex", justifyContent: "center", opacity: op }}>
      <div
        style={{
          maxWidth: width - (Y.dikey ? 100 : 160),
          padding: "12px 30px",
          borderRadius: 16,
          background: "rgba(7,18,38,.86)",
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: Y.altyaziBoy,
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
