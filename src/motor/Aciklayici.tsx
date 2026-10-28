// Ana kompozisyon: her aygıt videosu bu bileşenle çizilir. Aygıta özgü olan yalnızca şema (Sema) ve içerik (aygit.json).
import React, { useEffect, useState } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, CalculateMetadataFunction, cancelRender, continueRender, delayRender, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SemaSaglayici } from "./baglam";
import { SEMALAR } from "../aygitlar";
import { Altyazi, Etiketler, Kapak, Kapanis, kameraAn, UstBant, useEkran, Zemin } from "./katman";
import { Aygit, BOYUT, cizelge, FPS, SES_GECIKME, Uretim } from "./model";
import { clamp, fontlarHazir } from "./tema";

// Props JSON olarak kalır (render CLI'ye --props ile verilebilir); şema çizimi kayıttan aygit.sema ile bulunur
export type AciklayiciProps = { aygit: Aygit; uretim: Uretim };

export const Aciklayici: React.FC<AciklayiciProps> = (p) => {
  const [hazir, setHazir] = useState(false);
  const [tutamak] = useState(() => delayRender("Fontlar yükleniyor"));
  useEffect(() => {
    fontlarHazir.then(() => {
      setHazir(true);
      continueRender(tutamak);
    }, cancelRender);
  }, [tutamak]);
  return hazir ? <Video {...p} /> : null;
};

const Video: React.FC<AciklayiciProps> = ({ aygit, uretim }) => {
  const sema = SEMALAR[aygit.sema];
  if (!sema) throw new Error(`Şema kayıtlı değil: ${aygit.sema} (src/aygitlar/index.ts)`);
  const f = useCurrentFrame();
  const c = React.useMemo(() => cizelge(aygit, uretim), [aygit, uretim]);
  const cam = kameraAn(c, f, sema.parcalar);
  const E = useEkran(cam);
  const { Cizim } = sema;

  // müzik: konuşma sırasında kısılır (ducking)
  const sesAraliklari = c.yerler.filter((y) => y.ses).map((y) => [y.start + SES_GECIKME, y.start + SES_GECIKME + y.ses!.frames] as const);
  const muzikSes = (k: number) => {
    const konusuyor = sesAraliklari.some(([a, b]) => k >= a - 6 && k <= b + 6);
    const giris = interpolate(k, [0, 20], [0, 1], clamp);
    const cikis = interpolate(k, [c.toplam - 40, c.toplam], [1, 0], clamp);
    return (konusuyor ? 0.07 : 0.16) * giris * cikis;
  };

  return (
    <AbsoluteFill>
      <Zemin cam={cam} />
      <svg width={E.width} height={E.height} style={{ position: "absolute", inset: 0 }}>
        <g transform={E.donusum}>
          <SemaSaglayici c={c} f={f}>
            <Cizim />
          </SemaSaglayici>
        </g>
      </svg>
      <Etiketler c={c} f={f} cam={cam} parcalar={sema.parcalar} />
      <UstBant c={c} f={f} />
      <Kapak a={aygit} c={c} f={f} />
      <Kapanis a={aygit} c={c} f={f} />
      {c.yerler.map((y) => (f >= y.start && f < y.end ? <Altyazi key={`s-${y.sahne.id}`} y={y} f={f} /> : null))}

      {aygit.muzik !== "yok" && uretim.muzik && <Audio name="Müzik" src={staticFile(uretim.muzik)} volume={muzikSes} />}
      {c.yerler.map((y) =>
        y.ses ? (
          <Sequence key={`v-${y.sahne.id}`} name={`ses ${y.i + 1}`} from={y.start + SES_GECIKME} durationInFrames={y.ses.frames + 6}>
            <Audio src={staticFile(y.ses.src)} />
          </Sequence>
        ) : null,
      )}
      {c.yerler.slice(1).map((y) => (
        <Sequence key={`w-${y.sahne.id}`} name="whoosh" from={Math.max(0, y.start - 4)} durationInFrames={24}>
          <Audio src={staticFile("audio/whoosh.wav")} volume={0.1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const hesapla: CalculateMetadataFunction<AciklayiciProps> = ({ props }) => {
  const [width, height] = BOYUT[props.aygit.format];
  return { durationInFrames: cizelge(props.aygit, props.uretim).toplam, width, height, fps: FPS };
};
