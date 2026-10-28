# Seslendirme (ElevenLabs)

Araç: `tools/ses.py` (hat içinden: `node tools/uret.mjs <aygit> ses`).

## Ayarlar

| Ayar | Değer | Not |
|---|---|---|
| Model | `eleven_multilingual_v2` | Uzun metinde en tutarlı model, sakin anlatıma uygun. `aygit.json › ses.model` ile değiştirilebilir. |
| Uç | `/v1/text-to-speech/{ses}/with-timestamps` | Ses ve karakter hizalaması birlikte gelir. |
| `voice_settings` | stability 0.55 · similarity 0.8 · style 0.05 · speaker boost · **speed 1.1** | Sakin ve net bir anlatıcı. |
| `previous_text` | Önceki sahnenin okunuşu | Tonlama sahneden sahneye akıcı sürer. |
| `next_text` | **gönderilmez** | Sonraki cümlenin ilk sesi dosyanın sonuna sızıyor. |
| `language_code` | **gönderilmez** | multilingual_v2 desteklemiyor. |
| Ses | `aygit.json › ses.kimlik` | Kombi videosunda `gsJ9nrlXYbPztJxC4fwc`. Hesaptaki sesleri `python tools/ses.py sesler` listeler. |

Ayarlar ses kimliğine (`uretim.json › ses.*.kimlik`) özet olarak girer. Ayar değişince bütün sahneler kendiliğinden yeniden üretilir. Yalnız metni ya da okunuşu değişen sahne de yeniden üretilir, diğerleri olduğu gibi kalır.

## Süre bütçesi

- Ölçülen hız (kombi, speed 1.1): **≈ 5.0 hece/sn**. speed 0.97 ile ≈ 4.5 hece/sn ölçülmüştü.
- Sahne süresi = 3 kare gecikme + konuşma + 8 kare nefes. Videoya ayrıca 54 karelik kapanış eklenir.
- **40 sn video ≈ 175–180 hece** (7 sahne). Hesap: `(hedefSn − 1.8 − sahne sayısı × 0.37) × 5.0`.
- Ses üretilmeden önce süre heceden tahmin edilir (`HECE_SN`), bu yüzden taslak önizleme de çalışır.

## Kelime zamanları

`uretim.json › ses.<sahne>.kelimeler = [{k, bas, son}]` kare cinsindendir ve ses dosyasının başına göredir.

- **Altyazı:** Kelime sayısı yazımla bire bir eşleşirse söylenen kelime vurgulanır. Eşleşmezse (okunuş kelime sayısını değiştirdiyse, ör. sayılar) zamanlar karakter oranından tahmin edilir.
- **Etiket senkronu:** `etiketler[].soz` verilirse etiket, o sözle başlayan ilk kelimede gelir (büyük/küçük harf ve Türkçe İ/ı duyarsız). Sözcük bulunamazsa etiketler sırayla gelir.

## Kırpma ve seviye

- Ham sesin başındaki ve sonundaki sessizlik **hizalamaya göre** kesilir: ilk sesten 0.04 sn önce, son sesten 0.15 sn sonra.
- `silenceremove` **kullanılmaz**, çünkü kelime zamanlarını kaydırır.
- Ardından `loudnorm I=-16 TP=-1.5 LRA=7` uygulanır (süreyi değiştirmez).

## Okunuş (telaffuz)

Seslendirme metni **resmi yazımla** durur, altyazı da bunu gösterir. Ses motoruna `tools/okunus.py` ile dönüştürülmüş hâli gider. Dönüşüm sırası:

1. e-posta ve web adresleri,
2. aygıtın okunuş listesi (`aygit.json › okunus: [{yazim, okunus}]`),
3. genel sözlük (`tools/okunus.json`: NTC, LED, PCB…),
4. sayılar (yüzde, tarih, saat, ondalık…).

Kurallar:
- Bir kelime yanlış okunuyorsa önce aygıtın `okunus` listesine eklenir. Birden fazla aygıtta tekrar ederse genel sözlüğe taşınır ve [DUZELTMELER.md](DUZELTMELER.md)'ye yazılır.
- Ondalık sayılar "bir virgül beş" diye okunur. "Bir buçuk" isteniyorsa metne öyle yazılır ya da okunuş eklenir.
- SSML `<phoneme>` multilingual_v2'de çalışmaz. Okunuş metni değiştirmek en güvenilir yoldur.

## Kontrol

```
node tools/uret.mjs kombi kontrol     # faster-whisper gerekir (requirements.txt › isteğe bağlı)
```

Her sahne Whisper ile yazıya dökülür ve okunan metinle karşılaştırılır. Farklar listelenir.

## Anahtar

`ELEVENLABS_API_KEY` ortam değişkeninden okunur. Windows'ta yeni açılmış bir kabukta görünmüyorsa kullanıcı ortam değişkeni kayıt defterinden okunur. Anahtar **asla** repoya ya da içerik dosyasına yazılmaz.
