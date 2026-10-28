// Üretim hattı: seslendirme → müzik → render (docs/URETIM.md)
//   node tools/uret.mjs <aygit>                 hepsi: ses → muzik → render
//   node tools/uret.mjs <aygit> ses [--force]   yalnız değişen sahneleri seslendirir (--force: hepsini)
//   node tools/uret.mjs <aygit> kontrol         Whisper telaffuz kontrolü (faster-whisper gerekir)
//   node tools/uret.mjs <aygit> muzik [--force] video süresine göre telifsiz müzik besteler
//   node tools/uret.mjs <aygit> render [--taslak]   out/<aygit>/<aygit>.mp4 (taslak: yarım çözünürlük)
//   node tools/uret.mjs <aygit> kareler [k,k,…]     still + kontak sayfası (out/<aygit>/kontak.jpg)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PY = process.env.PYTHON || "python";
const [id, adim = "hepsi", ...ek] = process.argv.slice(2);
const force = ek.includes("--force");
if (!id || !fs.existsSync(`icerik/${id}/aygit.json`)) {
  console.error("Kullanım: node tools/uret.mjs <aygit> [hepsi|ses|kontrol|muzik|render|kareler] [--force|--taslak]");
  console.error("Aygıtlar:", fs.readdirSync("icerik").join(", "));
  process.exit(1);
}
const uretimYolu = `icerik/${id}/uretim.json`;
const oku = () => (fs.existsSync(uretimYolu) ? JSON.parse(fs.readFileSync(uretimYolu, "utf8")) : {});
const props = () => ({ aygit: JSON.parse(fs.readFileSync(`icerik/${id}/aygit.json`, "utf8")), uretim: oku() });

const calistir = (komut, args) => {
  console.log(`\n▶ ${komut} ${args.join(" ")}`);
  const r = spawnSync(komut, args, { stdio: "inherit", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const paket = () => bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });

const muzik = async () => {
  const a = props();
  if (a.aygit.muzik === "yok") return console.log("müzik kapalı (aygit.json › muzik: yok)");
  const serveUrl = await paket();
  const comp = await selectComposition({ serveUrl, id, inputProps: a });
  const u = oku();
  const hedef = `aygitlar/${id}/muzik.wav`;
  if (!force && u.muzik === hedef && u.muzikKare === comp.durationInFrames && fs.existsSync(`public/${hedef}`))
    return console.log("müzik güncel");
  fs.mkdirSync(`public/aygitlar/${id}`, { recursive: true });
  calistir(PY, ["tools/muzik.py", `public/${hedef}`, String(comp.durationInFrames / comp.fps + 0.5), a.aygit.muzik ?? "sakin"]);
  fs.writeFileSync(uretimYolu, JSON.stringify({ ...oku(), muzik: hedef, muzikKare: comp.durationInFrames }, null, 1) + "\n");
};

const render = async () => {
  const taslak = ek.includes("--taslak");
  const serveUrl = await paket();
  const inputProps = props();
  const comp = await selectComposition({ serveUrl, id, inputProps });
  const cikti = `out/${id}/${id}${taslak ? "-taslak" : ""}.mp4`;
  fs.mkdirSync(path.dirname(cikti), { recursive: true });
  let son = -1;
  await renderMedia({
    serveUrl,
    composition: comp,
    inputProps,
    codec: "h264",
    crf: taslak ? 26 : 18,
    scale: taslak ? 0.5 : 1,
    outputLocation: cikti,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== son) process.stdout.write(`${(son = p) * 10}% `);
    },
  });
  console.log(`\n✔ ${cikti}  (${(comp.durationInFrames / comp.fps).toFixed(1)} sn)`);
};

if (adim === "ses" || adim === "hepsi") calistir(PY, ["tools/ses.py", "uret", id, ...(force ? ["--force"] : [])]);
if (adim === "kontrol") calistir(PY, ["tools/ses.py", "kontrol", id]);
if (adim === "muzik" || adim === "hepsi") await muzik();
if (adim === "render" || adim === "hepsi") await render();
if (adim === "kareler") calistir("node", ["tools/kareler.mjs", id, ...ek]);
