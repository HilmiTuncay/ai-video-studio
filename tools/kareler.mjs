// Görsel kontrol: bir kez paketler, istenen karelerden still alır ve kontak sayfası yapar.
// node tools/kareler.mjs <aygit> [kare,kare,...]   (kare verilmezse her sahnenin ortası + kapanış)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [id, kareler] = process.argv.slice(2);
if (!id) {
  console.error("Kullanım: node tools/kareler.mjs <aygit> [kare,kare,...]");
  process.exit(1);
}
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const comp = await selectComposition({ serveUrl, id });
const liste = kareler
  ? kareler.split(",").map(Number)
  : (() => {
      // sahne ortaları: aygit.json + uretim.json'dan aynı çizelgeyi kur (model.ts ile aynı formül)
      const n = JSON.parse(fs.readFileSync(`icerik/${id}/aygit.json`, "utf8")).sahneler.length;
      return Array.from({ length: n + 1 }, (_, i) => Math.round(((i + 0.6) / (n + 1)) * comp.durationInFrames));
    })();
const dir = `out/${id}/kareler`;
fs.mkdirSync(dir, { recursive: true });
const dosyalar = [];
for (const f of liste) {
  const output = `${dir}/${f}.jpg`;
  await renderStill({ serveUrl, composition: comp, frame: Math.min(f, comp.durationInFrames - 1), output, imageFormat: "jpeg", scale: 0.5 });
  dosyalar.push(output);
}
const sutun = Math.min(3, dosyalar.length);
const satir = Math.ceil(dosyalar.length / sutun);
const args = ["-v", "error", "-y"];
for (const d of dosyalar) args.push("-i", d);
const yerlesim = dosyalar.map((_, i) => `${i % sutun ? Array.from({ length: i % sutun }, () => "w0").join("+") : "0"}_${Math.floor(i / sutun) ? Array.from({ length: Math.floor(i / sutun) }, () => "h0").join("+") : "0"}`).join("|");
args.push("-filter_complex", `${dosyalar.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${dosyalar.length}:layout=${yerlesim}:fill=black`, "-frames:v", "1", `out/${id}/kontak.jpg`);
if (dosyalar.length > 1) execFileSync("ffmpeg", args, { stdio: "inherit" });
console.log(`out/${id}/kontak.jpg  (${satir}x${sutun})  toplam ${comp.durationInFrames} kare = ${(comp.durationInFrames / 30).toFixed(1)} sn`);
