"""Telifsiz müzik üretimi (numpy sentez) (stil parametreli).

Kullanım: python tools/muzik.py <cikti.wav> <süre_sn> <stil>
Stiller: sakin (YouTube anlatımı, ritimsiz), canli (Biliyor muydunuz, baştan sona ritim), haber (etkinlik haberi, minör, orta bölümde ritim)
Efektler (whoosh/tik/basari) public/audio altında hazırdır; --efekt verilirse yeniden üretilir.
"""
import sys
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

SR = 44100
OUTFILE = sys.argv[1]
DUR = float(sys.argv[2])
STIL = sys.argv[3] if len(sys.argv) > 3 else "sakin"
AYAR = {
    # bpm, akorlar, ritim başlangıç/bitiş (sn), arpej yoğunluğu
    "sakin": dict(bpm=88, ton="major", ritim=None, arp=0.8),
    "canli": dict(bpm=112, ton="major", ritim=(2.0, DUR - 3.0), arp=1.0),
    "haber": dict(bpm=100, ton="minor", ritim=(DUR * 0.15, DUR - 5.0), arp=0.9),
}[STIL]
BPM = AYAR["bpm"]
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(7)
N = int(DUR * SR)
OUT = "public/audio/"


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r):
    t = np.arange(n) / SR
    e = np.ones(n) * s
    ai = int(a * SR)
    di = int(d * SR)
    ri = int(r * SR)
    e[:ai] = np.linspace(0, 1, ai, endpoint=False) if ai else e[:ai]
    e[ai:ai + di] = np.linspace(1, s, len(e[ai:ai + di]), endpoint=False)
    if ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def lowpass(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def highpass(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def add(buf, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def pad_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ff = f * (1 + det)
        for h in range(1, 9):
            s += np.sin(2 * np.pi * ff * h * t + rng.random() * 6.28) / h ** 1.6
    s *= env_adsr(n, 0.9, 0.5, 0.8, 1.2)
    return lowpass(s, 1800) * 0.06


def pluck(f, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t))
    s *= np.exp(-t * 5.5) * np.minimum(1, t * 400)
    return s * 0.12


def bass(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * env_adsr(n, 0.01, 0.25, 0.55, 0.08) * 0.22


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 0.55


def hat():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 7000) * np.exp(-t * 60) * 0.05


def reverb(x, secs=2.2, mix=0.28):
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir = lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + wet * mix


# D majör: I – V – vi – IV  (D, A, Bm, G)
CHORDS = [
    (50, [62, 66, 69, 74]),
    (45, [61, 64, 69, 73]),
    (47, [62, 66, 71, 74]),
    (43, [62, 67, 71, 74]),
] if AYAR["ton"] == "major" else [
    # Bm – G – D – A
    (47, [62, 66, 71, 74]),
    (43, [62, 67, 71, 74]),
    (50, [62, 66, 69, 74]),
    (45, [61, 64, 69, 73]),
]

L = np.zeros(N)
R = np.zeros(N)
drums = np.zeros(N)

nbars = int(np.ceil(DUR / BAR))
for b in range(nbars):
    t0 = b * BAR
    root, notes = CHORDS[b % 4]
    # pad (stereo için hafif farklı)
    for m in notes:
        p = pad_note(hz(m), BAR + 1.2)
        add(L, p, t0, 1.0)
        add(R, p, t0 + 0.012, 0.95)
    # arpej: 2. ölçüden sonra
    if t0 >= BAR * 1:
        arp = [notes[0] + 12, notes[2] + 12, notes[1] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[3], notes[2] + 12]
        vol = (0.6 if t0 < 10 else 1.0) * AYAR["arp"]
        for k, m in enumerate(arp):
            tt = t0 + k * BEAT / 2
            pl = pluck(hz(m))
            pan = 0.35 + 0.3 * (k % 2)
            add(L, pl, tt, vol * (1 - pan) * 1.6)
            add(R, pl, tt + 0.004, vol * pan * 1.6)
    # bas: giriş sonrası
    if t0 >= BAR * 2 - 0.01:
        for k in range(4):
            bs = bass(hz(root), BEAT * 0.9)
            add(L, bs, t0 + k * BEAT)
            add(R, bs, t0 + k * BEAT)
    # davul: kullanım bölümünde (≈ 27–86 sn)
    if AYAR["ritim"] and AYAR["ritim"][0] - BAR <= t0 < AYAR["ritim"][1]:
        for k in range(4):
            add(drums, kick(), t0 + k * BEAT, 0.8)
            add(drums, hat(), t0 + k * BEAT + BEAT / 2)

L = reverb(L)
R = reverb(R)
L += drums
R += drums

# giriş yükselişi ve kapanış
t = np.arange(N) / SR
master = np.clip(t / 2.0, 0, 1) * np.clip((DUR - t) / 4.0, 0, 1)
L *= master
R *= master
st = np.stack([L, R], axis=1)
st /= np.max(np.abs(st)) / 0.85
wavfile.write(OUTFILE, SR, (st * 32767).astype(np.int16))
print("ok", OUTFILE, DUR, STIL)
if "--efekt" not in sys.argv:
    sys.exit()


# --- efektler ---
def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
    wavfile.write(OUT + name, SR, (np.stack([x, x], 1) * 32767).astype(np.int16))


n = int(0.7 * SR)
tt = np.arange(n) / SR
noise = rng.standard_normal(n)
sweep = np.zeros(n)
# band geçiren gürültü, frekans yükselip düşer
for i0 in range(0, n, 512):
    seg = noise[i0:i0 + 512]
    fc = 400 + 3000 * np.sin(np.pi * min(1, i0 / n))
    sweep[i0:i0 + 512] = lowpass(seg, fc, 1)
save("whoosh.wav", reverb(sweep * np.sin(np.pi * tt / 0.7) ** 2, 0.8, 0.3))

n = int(0.06 * SR)
tt = np.arange(n) / SR
save("tik.wav", (np.sin(2 * np.pi * 1800 * tt) * 0.5 + highpass(rng.standard_normal(n), 3000) * 0.4) * np.exp(-tt * 90))

n = int(1.6 * SR)
tt = np.arange(n) / SR
ch = np.zeros(n)
for k, m in enumerate([81, 85, 88]):
    d = int(k * 0.09 * SR)
    s = np.sin(2 * np.pi * hz(m) * tt[: n - d]) * np.exp(-tt[: n - d] * 3.5)
    ch[d:] += s
save("basari.wav", reverb(ch, 1.2, 0.3))
