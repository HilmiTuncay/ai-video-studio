# Ajan talimatları

Bu repo, "X nasıl çalışır?" açıklayıcı videoları üretir. **Tasarım sabit, içerik değişken.**

## Her işten önce

- İlgili belgeyi oku: tasarım → `docs/TASARIM.md`, animasyon/şema → `docs/ANIMASYON.md`, ses → `docs/SES.md`, senaryo → `docs/ICERIK.md`, yeni aygıt → `docs/YENI-AYGIT.md`.
- `docs/DUZELTMELER.md` › **Kurallar** bölümü bağlayıcıdır.

## Geri bildirim döngüsü (zorunlu)

Kullanıcı bir video hakkında düzeltme verdiğinde:

1. Düzeltmeyi uygula. Genelse **motorda** (`src/motor`, `tools`) yap, aygıt içeriğinde değil.
2. `docs/DUZELTMELER.md` › **Günlük** tablosuna tarih, aygıt, geri bildirim ve yapılanı ekle.
3. Aynı tür düzeltme ikinci kez geliyorsa ya da kullanıcı "hep böyle" dediyse **Kurallar**'a ekle ve ilgili belgeyi güncelle.
4. Telaffuz: önce `aygit.json › okunus`, tekrar ederse `tools/okunus.json`.

## Sınırlar

- Tasarım değerleri (renk, yazı, boyut, geçiş süreleri) içerik dosyasından değiştirilmez. Değişecekse `tema.ts`/`katman.tsx` ve `docs/TASARIM.md` birlikte değişir.
- Animasyon kareye bağlıdır: CSS animasyonu, `Math.random`, `Date.now` kullanılmaz.
- Teknik ifadeler doğrulanmadan senaryoya girmez. Aygıt notundaki "kaçınılacak yanlışlar" listesine uyulur.
- `ELEVENLABS_API_KEY` hiçbir dosyaya yazılmaz.
- `uretim.json` dosyasını araçlar yazar, elle düzenlenmez.

## Doğrulama

`npm run tsc` → `node tools/uret.mjs <aygit> kareler` (kontak sayfasına bak) → render → süre hedefe yakın mı?
