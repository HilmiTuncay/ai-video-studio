// Her aygıt bir kompozisyon: kimliği aygıt kimliği (npx remotion render src/index.ts <id>)
import React from "react";
import { Composition } from "remotion";
import kombi from "../icerik/kombi/aygit.json";
import kombiUretim from "../icerik/kombi/uretim.json";
import { Aciklayici, AciklayiciProps, hesapla } from "./motor/Aciklayici";
import { Aygit, FPS } from "./motor/model";

const AYGITLAR: AciklayiciProps[] = [{ aygit: kombi as Aygit, uretim: kombiUretim }];

export const RemotionRoot: React.FC = () => (
  <>
    {AYGITLAR.map((p) => (
      <Composition key={p.aygit.id} id={p.aygit.id} component={Aciklayici} defaultProps={p} calculateMetadata={hesapla} durationInFrames={1} fps={FPS} width={1920} height={1080} />
    ))}
  </>
);
