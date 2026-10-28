// Kombi (yoğuşmalı, hermetik, plakalı eşanjörlü) kesit şeması. Dünya: 1920×1080.
// Durum anahtarları (icerik/kombi/aygit.json › sahneler[].durum):
//   kart · fan · gaz · alev · isitma (petek devresi) · kullanim (sıcak su: vana alta döner) · yogusma
import React from "react";
import { useSema } from "../../motor/baglam";
import { Kutu } from "../../motor/katman";
import { Alev, Boru, Damlalar, Esanjor, Fan, Kart, Kasa, Musluk, Parca, Petek, Plaka, Pompa, Sensor, Vana3 } from "../../motor/parcalar";
import { C, AKIS } from "../../motor/tema";
import { interpolateColors } from "remotion";

// Kamera hedefleri ve etiket çapaları (dünya koordinatı)
export const PARCALAR: Record<string, Kutu> = {
  kasa: { x: 380, y: 140, w: 660, h: 760 },
  kart: { x: 410, y: 220, w: 90, h: 120 },
  fan: { x: 662, y: 177, w: 76, h: 76 },
  baca: { x: 620, y: 20, w: 160, h: 170 },
  hx: { x: 570, y: 275, w: 260, h: 130 },
  brulor: { x: 600, y: 415, w: 200, h: 80 },
  gazValfi: { x: 485, y: 650, w: 70, h: 60 },
  pompa: { x: 824, y: 724, w: 72, h: 72 },
  vana: { x: 902, y: 522, w: 76, h: 76 },
  plaka: { x: 910, y: 690, w: 60, h: 100 },
  sensor: { x: 992, y: 752, w: 36, h: 36 },
  sebeke: { x: 1085, y: 900, w: 30, h: 100 },
  petek: { x: 1300, y: 290, w: 360, h: 220 },
  devre: { x: 940, y: 865, w: 780, h: 30 },
  musluk: { x: 1370, y: 690, w: 140, h: 170 },
  yogusma: { x: 785, y: 420, w: 30, h: 200 },
};

const GazValfi: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const { d } = useSema();
  const a = d("gaz");
  return (
    <g>
      <rect x={x - 35} y={y - 30} width={70} height={60} rx={10} fill={C.parca} stroke={interpolateColors(a, [0, 1], [C.parcaCizgi, AKIS.gaz])} strokeWidth={4} />
      <path d={`M${x - 18} ${y - 14} L${x + 18} ${y + 14} L${x + 18} ${y - 14} L${x - 18} ${y + 14} Z`} fill={interpolateColors(a, [0, 1], [C.parcaCizgi, AKIS.gaz])} />
    </g>
  );
};

export const KombiSema: React.FC = () => {
  const { d } = useSema();
  return (
    <g>
      <Kasa x={380} y={140} w={660} h={760} />

      {/* kart sinyalleri (boruların altında, kablo gibi) */}
      <Boru tip="elektrik" akis="kart" grup={["kart", "fan"]} n={[[500, 250], [600, 250], [600, 215], [662, 215]]} />
      <Boru tip="elektrik" akis="kart" grup={["kart", "gazValfi"]} n={[[440, 340], [440, 680], [485, 680]]} />
      <Boru tip="elektrik" akis="kart" grup={["kart", "pompa"]} n={[[475, 340], [475, 840], [860, 840], [860, 796]]} />

      {/* baca: ortadan atık gaz çıkar, iki yandan taze hava girer (eş eksenli) */}
      <Boru tip="duman" akis="alev" grup={["baca", "fan", "hx"]} kalin={30} n={[[700, 268], [700, 10]]} />
      <Boru tip="hava" akis="fan" grup={["baca", "fan"]} kalin={12} n={[[645, 10], [645, 190]]} />
      <Boru tip="hava" akis="fan" grup={["baca", "fan"]} kalin={12} n={[[755, 10], [755, 190]]} />

      {/* gaz */}
      <Boru tip="gaz" akis="gaz" grup={["gazValfi", "brulor"]} n={[[520, 1010], [520, 560], [700, 560], [700, 494]]} />
      {/* yoğuşma suyu tahliyesi */}
      <Boru tip="yogusma" akis="yogusma" grup={["yogusma"]} kalin={8} n={[[812, 500], [812, 1010]]} />

      {/* ana devre: eşanjör → vana → (petek | plaka) → pompa → eşanjör */}
      <Boru tip="sicak" akis="isitma|kullanim" grup={["hx", "vana", "pompa"]} n={[[830, 300], [940, 300], [940, 522]]} />
      <Boru tip="sicak" akis="isitma" grup={["petek", "vana"]} n={[[978, 560], [1240, 560], [1240, 330], [1300, 330]]} />
      <Boru tip="donus" akis="isitma" grup={["petek", "pompa", "devre"]} n={[[1660, 470], [1720, 470], [1720, 880], [940, 880]]} />
      <Boru tip="donus" akis="isitma|kullanim" grup={["pompa", "hx", "devre"]} n={[[940, 880], [860, 880], [860, 390], [830, 390]]} />
      <Boru tip="sicak" akis="kullanim" grup={["plaka", "vana"]} n={[[940, 598], [940, 690]]} />
      <Boru tip="donus" akis="kullanim" grup={["plaka", "pompa"]} n={[[940, 790], [940, 880]]} />

      {/* kullanım suyu: şebeke → plaka → musluk (dönüş hattının üstünden köprüyle geçer) */}
      <Boru tip="soguk" akis="kullanim" grup={["plaka", "sensor", "musluk", "sebeke"]} n={[[1100, 1010], [1100, 770], [970, 770]]} />
      <Boru tip="sicak" akis="kullanim" grup={["plaka", "musluk"]} n={[[970, 710], [1384, 710]]} />

      <Parca id="hx">
        <Esanjor x={570} y={275} w={260} h={130} isi={d("alev")} />
      </Parca>
      <Parca id="brulor">
        <Alev x1={610} x2={790} y={478} akis="alev" />
      </Parca>
      <Parca id="yogusma">
        <Damlalar x={812} y1={415} y2={495} akis="yogusma" adet={1} />
      </Parca>
      <Parca id="fan">
        <Fan x={700} y={215} akis="fan" />
      </Parca>
      <Parca id="kart">
        <Kart x={410} y={220} w={90} h={120} aktif={d("kart")} />
      </Parca>
      <Parca id="gazValfi">
        <GazValfi x={520} y={680} />
      </Parca>
      <Parca id="pompa">
        <Pompa x={860} y={760} akis="isitma|kullanim" />
      </Parca>
      <Parca id="vana">
        <Vana3 x={940} y={560} konum={d("kullanim")} aktif={d("isitma|kullanim")} />
      </Parca>
      <Parca id="plaka">
        <Plaka x={910} y={690} w={60} h={100} akis="kullanim" />
      </Parca>
      <Parca id="sensor">
        <Sensor x={1010} y={770} akis="kullanim" />
      </Parca>
      <Parca id="petek">
        <Petek x={1300} y={290} w={360} h={220} isi={d("isitma")} />
      </Parca>
      <Parca id="musluk">
        <Musluk x={1440} y={710} acik={d("kullanim")} />
      </Parca>
    </g>
  );
};
