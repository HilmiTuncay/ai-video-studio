// Şema bağlamı: şema bileşenleri kareyi, durum değerlerini ve odak soluklaşmasını buradan okur.
import React, { createContext, useContext, useMemo } from "react";
import { interpolate } from "remotion";
import { Cizelge, gecisli, NEFES, Sahne, SES_GECIKME } from "./model";
import { clamp, easeInOut } from "./tema";

export type Sema = {
  f: number;
  /** durum 0..1 (sahnenin `durum` listesinde varsa 1, geçişte yumuşak) */
  d: (anahtar: string) => number;
  /** d(anahtar)'ın 0..f birikimi: dönme açısı ve akış ofseti hız değişince sıçramasın */
  b: (anahtar: string) => number;
  /** parça/boru net mi (1) soluk mu (SOLUK)? Kimliklerden biri sahnenin vurgusundaysa net */
  v: (...kimlik: string[]) => number;
  /** durum anahtarının sahne ilerlemesi: anahtarı taşıyan her sahne 0→1 ekler (yumuşak); biten sahne 1 sayılır.
   *  Mekanik döngüler bununla sürülür: emme sahnesi bitince p("emme") = 1 → krank 180° dönmüş olur */
  p: (anahtar: string) => number;
};

export const SOLUK = 0.22;
const Ctx = createContext<Sema | null>(null);
export const useSema = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSema yalnız şema içinde kullanılır");
  return s;
};

// "isitma|kullanim": durumlardan biri açıksa 1
const icinde = (s: Sahne, k: string) => (k.split("|").some((x) => s.durum.includes(x)) ? 1 : 0);

// Birikim önbelleği: aynı sekmede kareler sırayla çizilir, her kare yalnız eksik kısmı hesaplar
const onbellek = new WeakMap<Cizelge, Map<string, number[]>>();
const birikimli = (c: Cizelge, k: string, f: number) => {
  let m = onbellek.get(c);
  if (!m) onbellek.set(c, (m = new Map()));
  let dizi = m.get(k);
  if (!dizi) m.set(k, (dizi = [0]));
  for (let i = dizi.length; i <= f; i++) dizi.push(dizi[i - 1] + gecisli(c, i - 1, (s) => icinde(s, k)));
  return dizi[Math.max(0, f)];
};

export const SemaSaglayici: React.FC<{ c: Cizelge; f: number; children: React.ReactNode }> = ({ c, f, children }) => {
  const deger = useMemo<Sema>(
    () => ({
      f,
      d: (k) => gecisli(c, f, (s) => icinde(s, k)),
      b: (k) => birikimli(c, k, f),
      v: (...ids) => gecisli(c, f, (s) => (!s.vurgu?.length || ids.some((x) => s.vurgu!.includes(x)) ? 1 : SOLUK), 18),
      p: (k) =>
        c.yerler
          .filter((y) => icinde(y.sahne, k))
          .reduce((t, y) => t + interpolate(f, [y.start + SES_GECIKME + 4, y.end - NEFES], [0, 1], { ...clamp, easing: easeInOut }), 0),
    }),
    [c, f],
  );
  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
};
