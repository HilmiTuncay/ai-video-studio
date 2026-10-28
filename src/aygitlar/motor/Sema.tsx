// Dört zamanlı benzinli motor (tek silindir) kesit şeması. Dünya: 1920×1080.
// Durum anahtarları (icerik/motor/aygit.json › sahneler[].durum):
//   emme · sikistirma · is · egzoz  → her biri krankı 180° döndürür (sahne ilerlemesiyle, p())
//   calisma                         → motor sürekli döner (dakikada binlerce tur hissi)
// Supap açıklığı, kıvılcım ve silindirdeki gazın rengi krank açısından hesaplanır: sahneler yalnızca zamanı seçer.
import React from "react";
import { interpolate, interpolateColors } from "remotion";
import { useSema } from "../../motor/baglam";
import { Kutu } from "../../motor/katman";
import { Boru, Buji, KrankMekanizma, Parca, Supap, krank } from "../../motor/parcalar";
import { AKIS, C, clamp } from "../../motor/tema";

// geometri
const CX = 960;
const KRANK_Y = 920;
const R = 100;
const L = 330;
const DELIK = 240; // silindir çapı (iç)
const TAVAN = 300; // yanma odası tavanı
const PISTON_H = 130;

export const PARCALAR: Record<string, Kutu> = {
  silindir: { x: 810, y: 300, w: 300, h: 500 },
  yanmaOdasi: { x: 840, y: 300, w: 240, h: 150 },
  piston: { x: 842, y: 440, w: 236, h: 330 },
  buji: { x: 925, y: 110, w: 70, h: 200 },
  emmeSupap: { x: 845, y: 140, w: 70, h: 210 },
  egzozSupap: { x: 1005, y: 140, w: 70, h: 210 },
  emme: { x: 520, y: 205, w: 330, h: 60 },
  egzoz: { x: 1070, y: 205, w: 330, h: 60 },
  biyel: { x: 880, y: 520, w: 160, h: 420 },
  krank: { x: 830, y: 790, w: 260, h: 260 },
  karter: { x: 780, y: 790, w: 360, h: 270 },
};

const pencere = (faz: number, bas: number, son: number) => (faz >= bas && faz <= son ? Math.sin((Math.PI * (faz - bas)) / (son - bas)) : 0);

export const MotorSema: React.FC = () => {
  const { p, b } = useSema();
  // krank açısı: her zaman 180°, çalışırken saniyede ~5 tur görünür hız
  const aci = 180 * (p("emme") + p("sikistirma") + p("is") + p("egzoz")) + 10 * b("calisma");
  const faz = ((aci % 720) + 720) % 720;
  const emmeAc = pencere(faz, 0, 180);
  const egzozAc = pencere(faz, 540, 720);
  const kivilcim = interpolate(Math.abs(faz - 366), [0, 26], [1, 0], clamp);
  const pistonUst = krank(aci, CX, KRANK_Y, R, L).pimY - PISTON_H * 0.38;

  // silindirdeki gaz: karışım → sıkışmış karışım → yanma → egzoz gazı
  const karisim = interpolateColors(0.45, [0, 1], [AKIS.hava, AKIS.gaz]);
  const [renk, opak] =
    faz < 180
      ? [karisim, 0.2 + 0.3 * (faz / 180)]
      : faz < 360
        ? [karisim, 0.5 + 0.35 * ((faz - 180) / 180)]
        : faz < 540
          ? [interpolateColors(faz, [360, 400, 540], ["#FFF3B0", AKIS.sicak, AKIS.duman]), 0.85]
          : [AKIS.duman, 0.85 - 0.65 * ((faz - 540) / 180)];

  const sol = CX - DELIK / 2;
  return (
    <g>
      {/* karter */}
      <Parca id={["karter", "krank"]}>
        <rect x={780} y={790} width={360} height={270} rx={40} fill={C.kasa} stroke={C.kasaCizgi} strokeWidth={6} />
      </Parca>

      {/* emme ve egzoz kanalları: akış supap açıklığıyla */}
      <Boru tip="hava" deger={emmeAc} grup={["emme", "emmeSupap"]} kalin={34} n={[[520, 235], [880, 235], [880, 300]]} />
      <Boru tip="duman" deger={egzozAc} grup={["egzoz", "egzozSupap"]} kalin={34} n={[[1040, 300], [1040, 235], [1400, 235]]} />

      {/* silindir: gaz, cidar, kafa */}
      <Parca id={["silindir", "yanmaOdasi", "piston"]}>
        <rect x={sol} y={TAVAN} width={DELIK} height={pistonUst - TAVAN} fill={renk} fillOpacity={opak} />
      </Parca>
      <Parca id="silindir">
        <rect x={sol - 30} y={TAVAN} width={30} height={500} fill={C.kasa} stroke={C.kasaCizgi} strokeWidth={4} />
        <rect x={sol + DELIK} y={TAVAN} width={30} height={500} fill={C.kasa} stroke={C.kasaCizgi} strokeWidth={4} />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={sol - 30} x2={sol - 60} y1={TAVAN + 40 + i * 50} y2={TAVAN + 40 + i * 50} stroke={C.kasaCizgi} strokeWidth={8} strokeLinecap="round" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={sol + DELIK + 30} x2={sol + DELIK + 60} y1={TAVAN + 40 + i * 50} y2={TAVAN + 40 + i * 50} stroke={C.kasaCizgi} strokeWidth={8} strokeLinecap="round" />
        ))}
        {/* silindir kapağı (kanallar açıklık olarak bırakılır) */}
        <path d={`M${sol - 30} ${TAVAN} V 270 H 845 M 915 270 H 1005 M 1075 270 H ${sol + DELIK + 30} V ${TAVAN}`} fill="none" stroke={C.kasaCizgi} strokeWidth={6} />
      </Parca>

      <KrankMekanizma cx={CX} cy={KRANK_Y} r={R} L={L} aci={aci} pistonW={DELIK - 6} pistonH={PISTON_H} />

      <Parca id="emmeSupap">
        <Supap x={880} yuva={TAVAN} aciklik={emmeAc} />
      </Parca>
      <Parca id="egzozSupap">
        <Supap x={1040} yuva={TAVAN} aciklik={egzozAc} />
      </Parca>
      <Parca id="buji">
        <Buji x={CX} uc={TAVAN + 4} kivilcim={kivilcim} />
      </Parca>
    </g>
  );
};
