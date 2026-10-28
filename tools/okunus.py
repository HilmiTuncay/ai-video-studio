"""Seslendirme metni → okunuş (yalnızca TTS'e gitmeden hemen önce uygulanır).

Seslendirme metni (sahne.ses) resmi yazımla durur: özel adlar ve kısaltmalar aynen (LED, PCB, NTC),
sayılar rakamla (12, 2026). Altyazı bu metni gösterir. Ses motoruna ise şu sırayla dönüştürülmüş hâli gider:
  1. e-posta ve web adresleri  (bilgi@ornek.com.tr → "bilgi et örnek nokta kom nokta te re")
  2. projenin okunuş listesi   (icerik/<aygit>/aygit.json "okunus": [{yazim, okunus}])
  3. genel sözlük              (tools/okunus.json)
  4. sayılar                   (yüzde, tarih, saat, aralık, sıra, ondalık, binlik ayırıcı)
Tümü büyük harf yazımlar (kısaltma) yalnızca aynen eşleşir, diğerleri büyük/küçük harf duyarsızdır (Türkçe İ/ı dahil).
Kesmeyle gelen ek korunur, ünlüleri okunuşun son ünlüsüne uydurulur: "NTC'nin" → "en te ce'nin".

Kullanım:
  python tools/okunus.py "metin"                        tek metni dönüştürür
  python tools/okunus.py < {"metinler": [...], "okunus": [...]}   (stdin JSON) → stdout JSON liste
"""
import json
import os
import re
import sys

SOZLUK_DOSYA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "okunus.json")
HARF = "a-zA-ZçğıöşüÇĞİÖŞÜâîûÂÎÛ"
UNLU = "aeıioöuüâîûAEIİOÖUÜÂÎÛ"
KESME = "'’"

# ---------------- sayılar ----------------
BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
BUYUK = [(10**12, "trilyon"), (10**9, "milyar"), (10**6, "milyon"), (1000, "bin")]
AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"]
SIRA_EK = {
    "bir": "birinci", "iki": "ikinci", "üç": "üçüncü", "dört": "dördüncü", "beş": "beşinci", "altı": "altıncı", "yedi": "yedinci",
    "sekiz": "sekizinci", "dokuz": "dokuzuncu", "on": "onuncu", "yirmi": "yirminci", "otuz": "otuzuncu", "kırk": "kırkıncı",
    "elli": "ellinci", "altmış": "altmışıncı", "yetmiş": "yetmişinci", "seksen": "sekseninci", "doksan": "doksanıncı",
    "yüz": "yüzüncü", "bin": "bininci", "milyon": "milyonuncu", "milyar": "milyarıncı", "trilyon": "trilyonuncu", "sıfır": "sıfırıncı",
}


def _yuzluk(n):
    y, k = divmod(n, 100)
    o, b = divmod(k, 10)
    return " ".join(x for x in [("" if y == 1 else BIRLER[y] + " ") + "yüz" if y else "", ONLAR[o], BIRLER[b]] if x)


def tam_sayi(n):
    """1234 → "bin iki yüz otuz dört" ("bir bin", "bir yüz" denmez)."""
    if n == 0:
        return "sıfır"
    parca = []
    for d, ad in BUYUK:
        if n >= d:
            q, n = divmod(n, d)
            parca.append(ad if (q == 1 and d == 1000) else f"{tam_sayi(q)} {ad}")
    if n:
        parca.append(_yuzluk(n))
    return " ".join(parca)


def rakam_dizisi(s):
    """Baştaki sıfırlar tek tek okunur: "0224" → "sıfır iki yüz yirmi dört", "05" → "sıfır beş"."""
    sifir = len(s) - len(s.lstrip("0"))
    if sifir == len(s):
        return " ".join(["sıfır"] * len(s))
    return " ".join(["sıfır"] * sifir + [tam_sayi(int(s[sifir:]))])


def sira_sayi(okunus):
    """"on iki" → "on ikinci"."""
    k = okunus.split(" ")
    k[-1] = SIRA_EK.get(k[-1], k[-1])
    return " ".join(k)


# tek bir sayısal ifade: binlik ayırıcılı | saat | ondalık/tam
SAYI = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?(?!\d)|(?:[01]?\d|2[0-3])[.:][0-5]\d(?!\d|[.,]\d)|\d+(?:,\d+)?"


def sayi_ifade(t):
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?", t):  # 2.500 / 1.250,5
        t = t.replace(".", "")
    m = re.fullmatch(r"(\d{1,2})[.:](\d{2})", t)
    if m:  # saat: 14.30 → on dört otuz, 09.00 → dokuz
        s, d = int(m.group(1)), int(m.group(2))
        return tam_sayi(s) + ("" if d == 0 else " " + rakam_dizisi(m.group(2)) if d < 10 else " " + tam_sayi(d))
    if "," in t:
        a, b = t.split(",", 1)
        return f"{rakam_dizisi(a)} virgül {rakam_dizisi(b)}"
    return rakam_dizisi(t)


# ---------------- ek uyumu ----------------
def _son_unlu(t):
    for c in reversed(t.lower()):
        if c in "aıoueiöüâîû":
            return c
    return "e"


def ek_uydur(kok, ek):
    """Kesmeden sonraki ekin ünlülerini okunuşun son ünlüsüne göre yeniden uydur (iki ve dört yönlü uyum)."""
    onceki = _son_unlu(kok)
    out = []
    for c in ek:
        lc = c.lower()
        if lc in "ae":
            c = "a" if onceki in "aıouâû" else "e"
        elif lc in "ıiuü":
            c = {"a": "ı", "ı": "ı", "â": "ı", "o": "u", "u": "u", "û": "u", "e": "i", "i": "i", "î": "i", "ö": "ü", "ü": "ü"}[onceki]
        if c.lower() in "aıoueiöüâîû":
            onceki = c.lower()
        out.append(c)
    return "".join(out)


def sayi_eki(okunus, ek):
    """Sayıya kesmeyle gelen ek: sıra eki ("1'inci" → birinci), diğerleri bitişir ("12'si" → on ikisi, "4'ü" → dördü)."""
    m = re.fullmatch(r"[ıiuü]?nc[ıiuü](.*)", ek)
    if m:
        return sira_sayi(okunus) + m.group(1)
    if ek and ek[0].lower() in "aeıioöuü" and okunus.endswith("dört"):
        okunus = okunus[:-4] + "dörd"
    return okunus + ek


EK = rf"(?:[{KESME}]([{HARF}]+))?"


def sayilar(t):
    # tarih (15.03.2026 / 15/03/2026) → on beş mart iki bin yirmi altı
    def tarih(m):
        g, a, y = int(m.group(1)), int(m.group(2)), m.group(3)
        if not (1 <= g <= 31 and 1 <= a <= 12):
            return m.group(0)
        return f"{tam_sayi(g)} {AYLAR[a - 1]} {sayi_eki(tam_sayi(int(y)), m.group(4) or '')}"

    t = re.sub(rf"(?<![\d.])(\d{{1,2}})[./](\d{{1,2}})[./](\d{{4}})(?![\d.]){EK}", tarih, t)
    # yüzde: %87 → yüzde seksen yedi, %87,5'i → yüzde seksen yedi virgül beşi
    t = re.sub(rf"%\s?({SAYI}){EK}", lambda m: "yüzde " + sayi_eki(sayi_ifade(m.group(1)), m.group(2) or ""), t)
    # aralık: 3-6 → üç ila altı, 09.00-17.00 → dokuz ila on yedi
    t = re.sub(rf"(?<![\d\w.,])({SAYI})\s?[-–]\s?({SAYI}){EK}(?![\d\w])",
               lambda m: f"{sayi_ifade(m.group(1))} ila {sayi_eki(sayi_ifade(m.group(2)), m.group(3) or '')}", t)
    # sıra: "1. sınıf" → birinci sınıf (ardından küçük harfle başlayan kelime gelirse; cümle sonu noktası sıra sayılmaz)
    t = re.sub(r"(?<![\d.,])(\d+)\.(?=\s+[a-zçğıöşü])", lambda m: sira_sayi(rakam_dizisi(m.group(1))), t)
    # "2209-A" → "2209 A" (tire okunmasın)
    t = re.sub(r"(\d)-([A-ZÇĞİÖŞÜ])\b", r"\1 \2", t)
    # kalan sayılar (ekli hâller dahil)
    t = re.sub(rf"(?<![\d\w])({SAYI}){EK}", lambda m: sayi_eki(sayi_ifade(m.group(1)), m.group(2) or ""), t)
    return t


# ---------------- e-posta ve web adresi ----------------
HARF_ADI = {
    "a": "a", "b": "be", "c": "ce", "ç": "çe", "d": "de", "e": "e", "f": "fe", "g": "ge", "ğ": "yumuşak ge", "h": "he", "ı": "ı",
    "i": "i", "j": "je", "k": "ke", "l": "le", "m": "me", "n": "ne", "o": "o", "ö": "ö", "p": "pe", "q": "kü", "r": "re", "s": "se",
    "ş": "şe", "t": "te", "u": "u", "ü": "ü", "v": "ve", "w": "dabılyu", "x": "iks", "y": "ye", "z": "ze",
}
# adreslerde sık geçen parçaların doğal okunuşu 
ADRES_PARCA = {"tr": "te re", "com": "kom", "edu": "edu", "gov": "gov", "org": "org", "net": "net"}


def _parca(p):
    p = p.lower()
    if not p:
        return ""
    if p in ADRES_PARCA:
        return ADRES_PARCA[p]
    if p.isdigit():
        return rakam_dizisi(p)
    # üç harf ve üstü, ünlüsü olan parça kelime gibi okunur; kısaltma gibi duranlar harf harf ("ua" → u a)
    if len(p) >= 3 and any(c in "aeıioöuü" for c in p):
        return re.sub(r"\d+", lambda m: " " + rakam_dizisi(m.group(0)) + " ", p).strip()
    return " ".join(HARF_ADI.get(c, c) for c in p)


def adres_oku(a):
    a = re.sub(r"^(?:https?://)?(?:www\.)?", "", a, flags=re.I).rstrip("/")  # "www" okunmaz
    out = []
    for parca in re.split(r"([@./_-])", a):
        out.append({"@": "et", ".": "nokta", "/": "taksim", "_": "alt çizgi", "-": "tire"}.get(parca) or _parca(parca))
    return " ".join(x for x in out if x)


EPOSTA = r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"
WEB = r"(?:https?://|www\.)[^\s,;)]+[^\s,;).!?]|\b[\w-]+(?:\.[\w-]+)*\.(?:com|org|net|edu|gov)(?:\.tr)?(?:/[^\s,;)]*[^\s,;).!?])?|\b[\w-]+\.(?:edu|gov|org|com|bel|k12)\.tr\b"


# ---------------- terimler ----------------
def _harf_sinifi(c):
    alt = {"I": "ı", "İ": "i"}.get(c, c.lower())
    ust = {"i": "İ", "ı": "I"}.get(alt, alt.upper())
    return re.escape(c) if alt == ust else f"[{alt}{ust}]"


def terim_kalibi(yazim):
    kisaltma = any(c.isalpha() for c in yazim) and not any(c.islower() for c in yazim)
    govde = "".join(re.escape(c) if kisaltma or not c.isalpha() else _harf_sinifi(c) for c in yazim)
    # öncesinde ve sonrasında harf/rakam yok ("Wi" kalıbı "Wi-Fi" içinde eşleşmez); kesmeli ek korunur
    on = r"(?<![\w])" if yazim[0].isalnum() else ""
    son = r"(?![\w+])" if yazim[-1].isalnum() else r"(?![\w])"
    return re.compile(rf"{on}{govde}{son}(?:([{KESME}])([{HARF}]+))?")


def sozluk_yukle(yol=SOZLUK_DOSYA):
    try:
        d = json.load(open(yol, encoding="utf8"))
        return [{"yazim": k, "okunus": v} for k, v in d.get("terimler", {}).items()]
    except (OSError, ValueError):
        return []


def _liste(liste):
    """Geçerli satırlar; uzun yazım önce ("Wi-Fi 6" "Wi-Fi"dan önce eşleşsin)."""
    temiz = [(str(x.get("yazim", "")).strip(), str(x.get("okunus", "")).strip()) for x in (liste or []) if isinstance(x, dict)]
    return sorted([(y, o) for y, o in temiz if y and o], key=lambda x: -len(x[0]))


def terimler(t, liste, koru):
    """Her eşleşme korunur (koru → yer tutucu): bir terimin okunuşu sonraki terimlerle ya da sayı adımında yeniden değişmez.
    Ek yalnızca kısaltmada okunuşa uydurulur ("NTC'nin" → "en te ce'nin"); diğerlerinde yazarın eki zaten
    söylenişe uygundur ("Wi-Fi'ı" → "vay fay'ı")."""
    for yazim, okunus in liste:
        kisaltma = not any(c.islower() for c in yazim)

        def degistir(m, o=okunus, k=kisaltma):
            ek = m.group(2)
            return koru(o + (m.group(1) + (ek_uydur(o, ek) if k else ek) if ek else ""))

        t = terim_kalibi(yazim).sub(degistir, t)
    return t


# ---------------- tümü ----------------
YER_TUTUCU = "[\ue000-\uf8ff]"


def okunus(metin, proje=None, sozluk=None):
    """Seslendirme metnini ses motorunun okuyacağı biçime çevir. proje: [{yazim, okunus}], sozluk: aynı biçim (None → okunus.json)."""
    if sozluk is None:
        sozluk = sozluk_yukle()
    korunan = []

    def koru(parca):
        korunan.append(parca)
        return chr(0xE000 + len(korunan) - 1)  # özel kullanım alanı karakteri: sonraki adımlar (sayılar dahil) dokunmaz

    t = re.sub(YER_TUTUCU, "", metin)
    t = re.sub(EPOSTA, lambda m: koru(adres_oku(m.group(0))), t)
    t = re.sub(WEB, lambda m: koru(adres_oku(m.group(0))), t)
    # proje listesi sözlükten önce: aynı yazım için kullanıcının okunuşu geçerli
    t = terimler(t, _liste(proje), koru)
    t = terimler(t, _liste(sozluk), koru)
    t = sayilar(t)
    t = re.sub(YER_TUTUCU, lambda m: korunan[ord(m.group(0)) - 0xE000], t)
    return re.sub(r"[ \t]{2,}", " ", t)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) > 1:
        print(okunus(" ".join(sys.argv[1:])))
    else:
        sys.stdin.reconfigure(encoding="utf-8")
        g = json.load(sys.stdin)
        sz = sozluk_yukle()
        print(json.dumps([okunus(m or "", g.get("okunus"), sz) for m in g.get("metinler", [])], ensure_ascii=False))
