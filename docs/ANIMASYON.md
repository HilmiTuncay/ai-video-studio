# Animasyon yöntemi (SABİT)

> Bu belge yöntemi sabitler. Değişiklik ancak bilinçli bir kararla yapılır ve [DUZELTMELER.md](DUZELTMELER.md)'ye yazılır.

## Karar: 2D düz kesit şema · SVG React bileşenleri · kareye bağlı animasyon

Her aygıt, önü açılmış bir **kesit şeması** olarak çizilir. Parçalar düz renkli, borular yalnızca yatay ve dikeydir, köşeleri yuvarlatılmıştır. Hareketin tamamı `useCurrentFrame()` ile kareden hesaplanır:

- borularda akan kesikli çizgi (`strokeDashoffset`),
- dönen pompa ve fan,
- titreyen alev,
- dönen vana,
- odak dışında kalan parçaların soluklaşması,
- sanal kamera (pan ve zoom).

### Neden bu yöntem?

| Yöntem | Yeni aygıt maliyeti | Tutarlılık | Render (Windows) | Düzenleme | Sonuç |
|---|---|---|---|---|---|
| **SVG + interpolate** | Düşük: bir şema dosyası + bir içerik dosyası | Çok yüksek: tek parça kütüphanesi | Deterministik, hızlı, GPU gerekmez | Kodda, prop düzeyinde | ✅ **Seçildi** |
| 3D (react-three-fiber) | Yüksek: model, ışık, malzeme | Orta | WebGL farkları, yavaş | Zor | ✗ |
| Lottie (After Effects) | Yüksek: her aygıt için animatör | Yüksek | İyi | Kapalı kutu | ✗ |
| Rive / yapay zekâ video | Editör gerekir / kontrol edilemez | Düşük | Deterministik değil | Çok düşük | ✗ |

Teknik doğruluk, bu videoların asıl değeridir. Bir yapay zekâ ajanı (Claude) şemayı doğrudan kod olarak yazabilir ve düzeltebilir. Her parçanın konumu ve durumu da veriyle denetlenir.

### Değişmez kurallar

1. **Tüm hareket kareden hesaplanır.** CSS `transition`/`animation`, `Math.random()`, `Date.now()` ve `requestAnimationFrame` kullanılmaz. Rastgelelik gerekirse `@remotion/noise` (`noise2D`) ya da Remotion `random(seed)` kullanılır.
2. **Hız değişince sıçrama olmaz.** Dönme açısı ve akış ofseti `useSema().b(anahtar)` birikimiyle hesaplanır, `f * hız` ile hesaplanmaz.
3. **Durum değişimleri yumuşaktır.** Akış, vana ve odak 15 karede geçer (`DURUM_GECIS`), kamera 26 karede (`KAMERA_GECIS`).
4. **Ağır SVG filtresi kullanılmaz** (`blur`, `feGaussianBlur`). Parlama gerekirse ikinci, yarı saydam ve kalın bir çizgi çizilir.
5. **Şemada yazı yoktur.** Etiketler ekran uzayında çizilir (`katman.tsx › Etiketler`), böylece yakınlaşmada boyları değişmez.
6. **Borular dik çizilir.** Kesişmeden kaçınılır. Kaçınılmazsa sonra çizilen boru öncekinin üstünden koyu kenarla köprü gibi geçer.

## Dünya ve kamera

- Şema **1920×1080 dünya koordinatında** çizilir (`DUNYA`). Kamera `{x, y, z}` biçimindedir: dünya merkezi ve yakınlaşma.
- `kamera` alanına parça kimliği de yazılabilir (`"pompa"`). Bu durumda kamera parçanın kutusuna sığacak şekilde merkezlenir (en çok `z = 2.2`).
- 16:9'da üst bant (~150 px) ve altyazı (~200 px) bölgesi boş tutulur. Kamera, odaktaki parçalar bu bölgelere düşmeyecek şekilde seçilir.

## Parça kütüphanesi (`src/motor/parcalar.tsx`)

| Bileşen | Ne çizer | Önemli props |
|---|---|---|
| `Kasa` | Aygıt gövdesi (önü açık) | `x y w h` |
| `Boru` | Akışkan borusu ya da sinyal kablosu | `n` (köşe noktaları), `tip` (akış türü), `akis` (durum anahtarı), `grup` (odak kimlikleri), `kalin` |
| `Pompa` | Dönen çarklı sirkülasyon pompası | `akis` |
| `Fan` | Dönen dört kanatlı fan | `akis` |
| `Alev` | Brülör çubuğu ve titreyen alevler | `x1 x2 y akis` |
| `Esanjor` | Kangallı ısı eşanjörü | `isi` (0..1) |
| `Plaka` | Plakalı eşanjör (iki akışkan ayrı) | `akis` |
| `Vana3` | Üç yollu vana | `konum` (0 sağ, 1 alt), `aktif` |
| `Kart` | Elektronik kart (ışıklar yanıp söner) | `aktif` |
| `Sensor` | Akış/türbin sensörü (nabız halkası) | `akis` |
| `Petek` | Radyatör (ısınır, ısı dalgası çıkar) | `isi` |
| `Musluk` | Musluk ve lavabo (kol döner, su akar) | `acik` |
| `Damlalar` | Yoğuşma damlaları | `akis` |
| `Parca` | Odak sarmalayıcısı (soluklaşma) | `id` |

Yeni bir parça gerekiyorsa önce bu kütüphaneye **genel** bir bileşen olarak eklenir. Yalnızca bir aygıta özgü olan parça, o aygıtın `Sema.tsx` dosyasında kalır (örnek: kombideki `GazValfi`). Kütüphaneye eklenen her parça bu tabloya da yazılır.

## Durum anahtarları

`sahneler[].durum` açık durumların listesidir. Şema, değerleri `useSema()` ile okur:

- `d("isitma")`: 0..1 arası, sahne geçişlerinde yumuşar.
- `d("isitma|kullanim")`: iki durumdan biri açıksa 1.
- `b("fan")`: birikim (dönme ve akış için).
- `v("pompa", "hx")`: odak opaklığı. Sahnenin `vurgu` listesi boşsa her şey nettir.

Her şema, kullandığı anahtarları dosyanın başında yorum olarak listeler.
