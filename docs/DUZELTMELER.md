# Düzeltmeler günlüğü (yaşayan belge)

Bu belge projenin hafızasıdır. **Her geri bildirim buraya yazılır.** Aynı düzeltme ikinci kez geldiğinde **kural** olur ve ilgili belgeye taşınır: [TASARIM](TASARIM.md), [ANIMASYON](ANIMASYON.md), [SES](SES.md), [ICERIK](ICERIK.md) ya da [URETIM](URETIM.md). Taşınan kuralın satırına belgenin adı yazılır.

## Nasıl işlenir?

1. Geri bildirimi aşağıdaki tabloya ekle: tarih, aygıt, ne istendi, ne yapıldı.
2. Düzeltme genelse (her videoyu etkiliyorsa) kodu **motorda** düzelt, aygıtın içeriğinde değil.
3. İkinci kez gelen ya da açıkça "hep böyle olsun" denen düzeltme → **Kurallar** bölümüne yaz ve ilgili belgeyi güncelle.
4. Telaffuz düzeltmesi önce aygıtın `okunus` listesine eklenir. İkinci aygıtta da gerekirse `tools/okunus.json` sözlüğüne taşınır.

## Kurallar (kalıcı)

| # | Kural | Nereye işlendi |
|---|---|---|
| K1 | Tüm hareket kareden hesaplanır. CSS animasyonu ve `Math.random` kullanılmaz. | ANIMASYON |
| K2 | Seslendirme sessizliği hizalamaya göre kesilir, `silenceremove` kullanılmaz (kelime zamanlarını kaydırır). | SES |
| K3 | ElevenLabs'e `next_text` gönderilmez (sonraki cümlenin ilk sesi dosya sonuna sızıyor). multilingual_v2'ye `language_code` gönderilmez. | SES |
| K4 | Ses ayarı değişince bütün sahneler yeniden üretilir (ayar, ses kimliğine girer). | SES |
| K5 | Süre bütçesi ölçülen hızla hesaplanır: speed 1.1 → ≈ 5.0 hece/sn. | SES, model.ts `HECE_SN` |
| K6 | Varsayılan biçim **9:16**. Kamera parça listesiyle verilir; `{x,y,z}` biçime bağlı olduğu için kaçınılır. | TASARIM, ANIMASYON, ICERIK |
| K7 | Bir aygıta özgü görünen her çözüm için önce "genel mi?" diye sorulur. Genelse motora girer (ör. `p()`, `Boru.deger`, mekanik parçalar). | ANIMASYON, YENI-AYGIT |

## Günlük

| Tarih | Aygıt | Geri bildirim / gözlem | Yapılan |
|---|---|---|---|
| 2026-10-28 | kombi | İlk üretimde konuşma 41.2 sn çıktı: ses speed 0.97 ile ≈ 4.5 hece/sn okuyor, 5.1 varsayımı tuttu. Hedef 40 sn. | speed 1.1, metin ≈ 9 hece kısaltıldı, nefes 12 → 8 kare, gecikme 4 → 3 kare. Sonuç 40.3 sn. → K5 |
| 2026-10-28 | kombi | Ateşleme sahnesinde gaz valfi etiketi altyazı alanına yaklaştı. | Kamera `y 430 → 470`, `z 1.5 → 1.35`. Kural adayı: odaktaki parçalar üst bant ile altyazı arasına düşmeli (ICERIK'e yazıldı). |
| 2026-10-28 | genel | "Genel format 9:16 olsun." | Varsayılan 9:16 yapıldı. Kamera parça listesinden güvenli alana otomatik sığıyor, yerleşim `yerlesim()` ile biçime göre ayrılıyor, sığmayan etiket karşı yana ya da üste/alta geçiyor. Kombi içeriği parça listeli kameraya çevrildi; ses yeniden üretilmedi. → K6 |
| 2026-10-28 | motor | "Sadece kombiye uygun bir geliştirme mi olmuş?" Genellik testi: dört zamanlı benzinli motor. | Motora 3 genelleme girdi: sahne ilerlemesi `p()` (mekanik döngü), `Boru.deger` (sürekli akış), parça listeli kamera. Kütüphaneye 3 genel parça eklendi: `KrankMekanizma`, `Supap`, `Buji`. Motora özgü kod yalnızca `src/aygitlar/motor/Sema.tsx` ve `icerik/motor/aygit.json`'da. Tasarım ve katmanlarda motora özel bir değişiklik yok. → K7 |
