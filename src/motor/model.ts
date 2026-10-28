// Veri modeli + zaman çizelgesi. İçerik (icerik/<aygit>/aygit.json) bu tiplere uyar; motor her aygıtta aynıdır.
import { interpolate } from "remotion";
import { clamp, easeInOut } from "./tema";

export const FPS = 30;
export const BOYUT = { "9:16": [1080, 1920], "16:9": [1920, 1080] } as const; // varsayılan 9:16
export const GIRIS = 0; // ilk sahne kapak başlığını da taşır; ayrı sessiz giriş yok
export const KAPANIS = 54; // son kart (sessiz)
export const NEFES = 8; // seslendirme bitince sahnenin sürdüğü kare
export const SES_GECIKME = 3; // sahne başından sesin başlamasına kadar
export const DURUM_GECIS = 15; // akış/vana/odak değişimi süresi
export const KAMERA_GECIS = 26;
export const HECE_SN = 5.0; // ses yokken süre tahmini: ElevenLabs Türkçe, speed 1.1 ölçümü (docs/SES.md)

/** Kamera: dünya merkezi + yakınlaşma (z = 1 → dünya genişliği ekran genişliğine sığar) */
export type Kamera = { x: number; y: number; z: number };
/** İçerikte kamera: tercihen çerçevelenecek parça kimlikleri (biçimden bağımsız); ya da tek kimlik / açık Kamera */
export type KameraHedef = Kamera | string | string[];
export type Etiket = { parca: string; metin: string; yon?: "sol" | "sag" | "ust" | "alt"; soz?: string };
export type Sahne = {
  id: string;
  baslik: string; // sol üstteki adım başlığı
  ses: string; // seslendirme (resmi yazım; altyazı bunu gösterir)
  kamera: KameraHedef; // ["pompa","vana"] → bu parçalar güvenli alana sığdırılır (9:16 ve 16:9'da ayrı hesaplanır)
  durum: string[]; // şemadaki açık durumlar (akışlar, alev, vana konumu…)
  vurgu?: string[]; // boşsa her şey net; doluysa bunlar dışındaki parçalar soluklaşır
  etiketler?: Etiket[];
};
export type Aygit = {
  id: string;
  baslik: string; // "Kombi nasıl çalışır?"
  vurguKelime?: string; // başlıkta sarı yazılan kelime
  altBaslik?: string;
  sema: string; // src/aygitlar/index.ts kaydındaki şema
  format: keyof typeof BOYUT;
  hedefSn?: number;
  ses: { saglayici: "eleven"; kimlik: string; model?: string };
  okunus?: { yazim: string; okunus: string }[];
  muzik?: "sakin" | "yok";
  sahneler: Sahne[];
};
export type Kelime = { k: string; bas: number; son: number }; // kare (ses dosyası başına göre)
export type SesKaydi = { src: string; frames: number; metin: string; okunan: string; kimlik: string; kelimeler?: Kelime[] };
export type Uretim = { ses?: Record<string, SesKaydi>; muzik?: string };

export type Yer = { sahne: Sahne; i: number; start: number; end: number; ses?: SesKaydi };
export type Cizelge = { yerler: Yer[]; toplam: number; kapanisBas: number };

export const heceSay = (t: string) => (t.match(/[aeıioöuüâîû]/gi) ?? []).length;

export const cizelge = (a: Aygit, u: Uretim): Cizelge => {
  let t = GIRIS;
  const yerler = a.sahneler.map((sahne, i) => {
    const ses = u.ses?.[sahne.id];
    // ses metni değiştiyse eski kayıt kullanılmaz (süre tahminden gelir, `uret ses` ile yenilenir)
    const gecerli = ses && ses.metin === sahne.ses.trim() ? ses : undefined;
    const konusma = gecerli ? gecerli.frames : Math.ceil((heceSay(sahne.ses) / HECE_SN) * FPS);
    const frames = SES_GECIKME + konusma + NEFES;
    const y = { sahne, i, start: t, end: t + frames, ses: gecerli };
    t += frames;
    return y;
  });
  return { yerler, toplam: t + KAPANIS, kapanisBas: t };
};

// Hangi sahnedeyiz (kapanışta son sahne geçerli kalır)
export const aktif = (c: Cizelge, f: number) => {
  for (let i = c.yerler.length - 1; i >= 0; i--) if (f >= c.yerler[i].start) return i;
  return 0;
};

// Sahneye bağlı bir değerin kareye göre yumuşak geçişi: her sahne başında öncekinden DURUM_GECIS karede geçer
export const gecisli = (c: Cizelge, f: number, deger: (s: Sahne) => number, sure = DURUM_GECIS) => {
  const i = aktif(c, f);
  const simdi = deger(c.yerler[i].sahne);
  if (i === 0) return simdi;
  const once = deger(c.yerler[i - 1].sahne);
  const bas = c.yerler[i].start;
  return interpolate(f, [bas, bas + sure], [once, simdi], { ...clamp, easing: easeInOut });
};

// Değerin 0..f arası birikimi (dönen pompa, akan boru: hız değişince sıçramasın)
export const birikim = (c: Cizelge, f: number, deger: (s: Sahne) => number) => {
  let toplam = 0;
  for (let k = 0; k < f; k++) toplam += gecisli(c, k, deger);
  return toplam;
};
