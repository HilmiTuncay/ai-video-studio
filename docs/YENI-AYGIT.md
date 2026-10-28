# Yeni aygıt ekleme (kontrol listesi)

Örnek: çamaşır makinesi (`camasir`).

## 1. Araştır

- [ ] Ana parçalar ve doğru Türkçe terimleri, her biri için tek satırlık görev tanımı.
- [ ] Çalışma adımları sırayla; birden fazla mod varsa her biri ayrı.
- [ ] Kaçınılacak yaygın yanlışlar.
- [ ] Bulguları ve kullanılan kaynakları `docs/aygitlar/camasir.md` dosyasına yaz (örnek: [aygitlar/kombi.md](aygitlar/kombi.md)).

## 2. Senaryo

- [ ] 6–8 sahne. İlk sahne soruyla açılır, son sahne sonuç ya da fayda söyler.
- [ ] Hece bütçesi: 40 sn ≈ 175–180 hece ([SES.md](SES.md#süre-bütçesi)).
- [ ] Her sahne için: anlatılan parça, açık durumlar, odak, etiketler.

## 3. Şema: `src/aygitlar/camasir/Sema.tsx`

- [ ] Dosyanın başına durum anahtarlarını yorum olarak yaz.
- [ ] `PARCALAR`: kamera hedefleri ve etiket çapaları (dünya koordinatında kutular).
- [ ] Çizimi yalnızca `src/motor/parcalar.tsx` bileşenleriyle kur. Eksik bir parça genelse kütüphaneye ekle ve [ANIMASYON.md](ANIMASYON.md)'deki tabloya yaz. Aygıta özgüyse şema dosyasında bırak.
- [ ] Borular dik olsun, kesişme olmasın. Kaçınılmazsa sonra çizilen boru köprü olur.
- [ ] Hareket türünü seç: aç/kapa durumlar (`d()`, kombi gibi) ya da sürekli döngü (`p()` ile açı/konum, motor gibi). Döngüde ara değerler (supap, kıvılcım, renk) açıdan hesaplanır.
- [ ] Şemaya aygıta özgü bir çözüm yazıyorsan sor: başka aygıtta da gerekir mi? Gerekiyorsa motora ya da kütüphaneye taşı (K7).
- [ ] Çizim sırası: kasa → sinyal kabloları → borular → parçalar (`<Parca id>` içinde).

## 4. Kayıt

- [ ] `src/aygitlar/index.ts` → `SEMALAR` içine `camasir: { Cizim, parcalar }` satırını ekle.
- [ ] `src/Root.tsx` → `AYGITLAR` içine `aygit.json` ve `uretim.json` içe aktarımını ekle.
- [ ] `icerik/camasir/aygit.json` dosyasını oluştur ([ICERIK.md](ICERIK.md)). `icerik/camasir/uretim.json` için başlangıçta `{}` yeterli.

## 5. Üret ve denetle

```
npm run tsc
node tools/uret.mjs camasir kareler     # ses yokken heceden tahmini sürelerle
node tools/uret.mjs camasir ses
node tools/uret.mjs camasir kareler     # gerçek sürelerle, etiket senkronu
node tools/uret.mjs camasir             # ses → müzik → render
```

- [ ] Kontak sayfasında etiketler altyazıya ve üst banda taşmıyor.
- [ ] Toplam süre hedefe yakın. Uzunsa metni kısalt; nefes payıyla oynama.
- [ ] Videoyu sesli izle. Kullanıcının düzeltmelerini [DUZELTMELER.md](DUZELTMELER.md)'ye işle.
