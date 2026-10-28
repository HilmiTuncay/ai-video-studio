"""Seslendirme (ElevenLabs, kelime zamanlı) + telaffuz kontrolü.

Kullanım:
  python tools/ses.py uret    <aygit> [--force]   metni/okunuşu/sesi değişen sahneleri seslendirir
  python tools/ses.py kontrol <aygit>             Whisper ile yazıya döküp metinle karşılaştırır (faster-whisper gerekir)
  python tools/ses.py sesler                      ElevenLabs hesabındaki sesler

Girdi : icerik/<aygit>/aygit.json  (sahneler[].ses, ses.kimlik, ses.model, okunus)
Çıktı : public/aygitlar/<aygit>/ses/<sahne>-<özet>.mp3 ve icerik/<aygit>/uretim.json › ses.<sahne>
        {src, frames, metin, okunan, kimlik, kelimeler: [{k, bas, son}] (kare, dosya başına göre)}

Kurallar (docs/SES.md):
- Sahne metni resmi yazımla durur; ses motoruna tools/okunus.py ile okunuşa çevrilmiş hâli gider.
- /with-timestamps ucu kullanılır: karakter zamanlarından kelime zamanı çıkar (altyazı vurgusu, etiketlerin "soz" senkronu).
- Baştaki/sondaki sessizlik hizalamaya göre kesilir (silenceremove KULLANILMAZ: zamanları kaydırır); sonra -16 LUFS.
- eleven_multilingual_v2'ye language_code gönderilmez (desteklemiyor); previous_text gönderilir, next_text gönderilmez
  (sonraki cümlenin ilk sesi dosyanın sonuna sızıyor).
ElevenLabs anahtarı ELEVENLABS_API_KEY ortam değişkeninden okunur (koda/repoya yazılmaz).
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys

from okunus import okunus, sozluk_yukle

FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AYAR = {"stability": 0.55, "similarity_boost": 0.8, "style": 0.05, "use_speaker_boost": True, "speed": 1.1}
BAS_PAY = 0.04  # ilk sesten önce bırakılan (sn)
SON_PAY = 0.15  # son sesten sonra bırakılan (sn)


def emit(**kw):
    print(json.dumps(kw, ensure_ascii=False), flush=True)


def yollar(aygit):
    return (
        os.path.join(ROOT, "icerik", aygit, "aygit.json"),
        os.path.join(ROOT, "icerik", aygit, "uretim.json"),
        os.path.join(ROOT, "public", "aygitlar", aygit, "ses"),
    )


def oku(yol, varsayilan=None):
    if not os.path.exists(yol):
        return varsayilan
    return json.load(open(yol, encoding="utf8"))


def yaz(yol, veri):
    tmp = yol + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, yol)


def anahtar():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and os.name == "nt":  # Windows: kullanıcı ortam değişkeni yeni açılan kabuğa henüz geçmemiş olabilir
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
                k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
        except OSError:
            k = None
    if not k:
        raise RuntimeError("ELEVENLABS_API_KEY tanımlı değil (README › Kurulum)")
    return k


def eleven(metin, ses, model, onceki):
    """Sesi ve karakter hizalamasını döndürür: (mp3 bayt, alignment)"""
    import requests
    body = {"text": metin, "model_id": model}
    if model != "eleven_v3":  # v3 previous_text ve bu ayarları desteklemiyor
        body["voice_settings"] = AYAR
        if onceki:
            body["previous_text"] = onceki
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ses}/with-timestamps?output_format=mp3_44100_128"
    r = requests.post(url, headers={"xi-api-key": anahtar(), "content-type": "application/json"}, json=body, timeout=180)
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:300]}")
    o = r.json()
    return base64.b64decode(o["audio_base64"]), o.get("alignment") or o.get("normalized_alignment")


def kelimeler(al):
    """Karakter hizalamasından kelime zamanları (sn)"""
    out, cur, bas, son = [], "", None, None
    for ch, b, s in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                out.append([cur, bas, son])
            cur, bas = "", None
            continue
        if bas is None:
            bas = b
        cur += ch
        son = s
    if cur:
        out.append([cur, bas, son])
    return out


def sure(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def kirp(ham, hedef, bas, son):
    """[bas, son] aralığını al, seviyeyi eşitle. loudnorm süreyi değiştirmez."""
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", ham, "-ss", f"{bas:.3f}", "-to", f"{son:.3f}", "-af",
         "afade=t=in:d=0.02,loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-b:a", "192k", hedef],
        check=True,
    )


def uret(aygit, force=False):
    a_yol, u_yol, d = yollar(aygit)
    a = oku(a_yol)
    u = oku(u_yol, {}) or {}
    kayit = u.setdefault("ses", {})
    os.makedirs(d, exist_ok=True)
    model = a["ses"].get("model", "eleven_multilingual_v2")
    # ayar da kimliğe girer: hız/stabilite değişince sahneler yeniden üretilir
    kimlik = f"eleven:{a['ses']['kimlik']}:{model}:" + hashlib.sha1(json.dumps(AYAR, sort_keys=True).encode()).hexdigest()[:6]
    sozluk = sozluk_yukle()
    sahneler = [s for s in a["sahneler"] if (s.get("ses") or "").strip()]
    okunanlar = [okunus(s["ses"].strip(), a.get("okunus"), sozluk) for s in sahneler]
    for i, s in enumerate(sahneler):
        metin, okunan = s["ses"].strip(), okunanlar[i]
        eski = kayit.get(s["id"]) or {}
        if (not force and eski.get("metin") == metin and eski.get("okunan") == okunan and eski.get("kimlik") == kimlik
                and os.path.exists(os.path.join(ROOT, "public", eski.get("src", "_")))):
            emit(tip="ayni", sahne=s["id"])
            continue
        emit(tip="basla", sahne=s["id"], sira=i + 1, adet=len(sahneler), okunan=okunan)
        mp3, al = eleven(okunan, a["ses"]["kimlik"], model, okunanlar[i - 1] if i else None)
        ad = f"{s['id']}-{hashlib.sha1((kimlik + okunan).encode()).hexdigest()[:8]}.mp3"
        ham = os.path.join(d, "_ham.mp3")
        open(ham, "wb").write(mp3)
        kel = kelimeler(al) if al else []
        uzun = sure(ham)
        bas = max(0.0, kel[0][1] - BAS_PAY) if kel else 0.0
        son = min(uzun, kel[-1][2] + SON_PAY) if kel else uzun
        kirp(ham, os.path.join(d, ad), bas, son)
        os.remove(ham)
        for f in os.listdir(d):  # aynı sahnenin eski dosyaları
            if f.startswith(s["id"] + "-") and f != ad:
                os.remove(os.path.join(d, f))
        frames = int(sure(os.path.join(d, ad)) * FPS + 0.999)
        kayit[s["id"]] = {
            "src": f"aygitlar/{aygit}/ses/{ad}",
            "frames": frames,
            "metin": metin,
            "okunan": okunan,
            "kimlik": kimlik,
            "kelimeler": [{"k": k, "bas": round((b - bas) * FPS), "son": round((e - bas) * FPS)} for k, b, e in kel],
        }
        yaz(u_yol, u)  # her sahneden sonra: yarıda kesilirse biten sahneler kaybolmasın
        emit(tip="ses", sahne=s["id"], frames=frames, kelime=len(kel))
    # içerikten çıkarılan sahnelerin kayıtları
    for k in [k for k in kayit if k not in {s["id"] for s in sahneler}]:
        kayit.pop(k)
    yaz(u_yol, u)
    toplam = sum(kayit[s["id"]]["frames"] for s in sahneler)
    emit(tip="bitti", konusma_sn=round(toplam / FPS, 1))


def norm(s):
    s = s.replace("İ", "i").replace("I", "ı").lower()
    s = re.sub(r"[^\wçğıöşü ]", " ", s)
    return s.split()


def kontrol(aygit):
    """Sesi Whisper ile yazıya döküp okunan metinle karşılaştır (telaffuz hatası avı)."""
    import difflib
    import numpy as np
    from faster_whisper import WhisperModel
    a_yol, u_yol, _ = yollar(aygit)
    u = oku(u_yol, {}) or {}
    sozluk = sozluk_yukle()
    a = oku(a_yol)
    emit(tip="uyari", mesaj="Whisper modeli yükleniyor (ilk seferde indirilir)…")
    m = WhisperModel(os.environ.get("WHISPER_MODEL", "medium"), device="cpu", compute_type="int8")
    hata_t = toplam = 0
    for sid, sd in (u.get("ses") or {}).items():
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "public", sd["src"]), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                             capture_output=True, check=True).stdout
        segs, _ = m.transcribe(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768, language="tr", beam_size=5)
        duyulan = " ".join(x.text for x in segs).strip()
        x, y = norm(sd["okunan"]), norm(okunus(duyulan, a.get("okunus"), sozluk))
        ops = difflib.SequenceMatcher(a=x, b=y, autojunk=False).get_opcodes()
        hata = sum(max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in ops if op != "equal")
        farklar = [{"metin": " ".join(x[i1:i2]), "duyulan": " ".join(y[j1:j2])} for op, i1, i2, j1, j2 in ops if op != "equal"]
        hata_t += hata
        toplam += len(x)
        emit(tip="kontrol", sahne=sid, duyulan=duyulan, hata=hata, farklar=farklar)
    emit(tip="bitti", wer=round(100 * hata_t / max(1, toplam), 1))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mod = sys.argv[1]
    try:
        if mod == "uret":
            uret(sys.argv[2], "--force" in sys.argv)
        elif mod == "kontrol":
            kontrol(sys.argv[2])
        elif mod == "sesler":
            import requests
            r = requests.get("https://api.elevenlabs.io/v2/voices?page_size=100", headers={"xi-api-key": anahtar()}, timeout=60)
            r.raise_for_status()
            for v in r.json()["voices"]:
                emit(id=v["voice_id"], ad=v["name"], etiket=v.get("labels") or {})
        else:
            sys.exit(__doc__)
    except Exception as e:
        emit(tip="hata", mesaj=str(e))
        sys.exit(1)
