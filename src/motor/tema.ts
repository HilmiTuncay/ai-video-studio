// SABİT TASARIM — her videoda aynı. Değişiklik yalnızca docs/TASARIM.md'deki kuralla birlikte yapılır.
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Easing } from "remotion";

const poppins = loadPoppins("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] });
const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin", "latin-ext"] });
export const fontlarHazir: Promise<unknown> = Promise.all([poppins, mono].map((x) => x.waitUntilDone()));

export const DISPLAY = poppins.fontFamily; // başlık, altyazı
export const MONO = mono.fontFamily; // etiket, seri adı, sayılar

// Zemin ve arayüz: koyu "teknik çizim" lacivert, ince ızgara
export const C = {
  zemin: "#0B1B33",
  zeminKoyu: "#071226",
  izgara: "rgba(120,170,230,.07)",
  kasa: "#16294A", // aygıt gövdesi dolgusu
  kasaCizgi: "#3B5A8A",
  parca: "#1F3A63", // parça dolgusu
  parcaCizgi: "#7FA6D9",
  yazi: "#EAF2FF",
  soluk: "#8FA6C8",
  vurgu: "#FFD24A", // odak halkası, etiket çizgisi, başlıkta vurgulu kelime
  beyaz: "#FFFFFF",
};

// Akış renkleri: anlamı her aygıtta aynıdır (docs/TASARIM.md › Renk anlamları)
export const AKIS = {
  sicak: "#FF5B3A", // sıcak su / sıcak akışkan (gidiş)
  donus: "#3DA5FF", // soğumuş su (dönüş)
  soguk: "#7FE3FF", // şebeke / soğuk su
  gaz: "#FFC83D", // yakıt gazı
  duman: "#9AA7B8", // baca gazı / egzoz
  hava: "#CFE8FF", // taze hava
  elektrik: "#5CF2A6", // elektrik / sinyal
  yogusma: "#8FD3C8", // yoğuşma suyu
} as const;
export type AkisTip = keyof typeof AKIS;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1); // hızlı çıkış, yumuşak iniş
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const SERI = "NASIL ÇALIŞIR?";
