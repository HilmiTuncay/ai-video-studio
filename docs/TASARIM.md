# Sabit tasarım

Her video aynı görsel dili kullanır; aygıttan aygıta yalnızca **şema** ve **içerik** değişir. Tasarım değerleri `src/motor/tema.ts` ve `src/motor/katman.tsx` içindedir. Değişiklik yapılırsa bu belge ve [DUZELTMELER.md](DUZELTMELER.md) birlikte güncellenir.

## Biçim

- **16:9, 1920×1080, 30 fps** (varsayılan). `format: "9:16"` modelde tanımlıdır ama dikey yerleşim henüz ayarlanmadı (bkz. yol haritası, README).
- Hedef süre aygıt başına belirlenir (`hedefSn`). İlk test videosu 40 saniyedir.

## Akış (her videoda aynı)

1. **Kapak sahnesi** (ilk sahne): solda seri adı `NASIL ÇALIŞIR?` ve büyük başlık yer alır, `vurguKelime` sarı yazılır. Şema sağda boşta durur. İlk seslendirme bu sahnede soruyu sorar.
2. **Adım sahneleri**: sol üstte `01 Adım başlığı`, sağ üstte ilerleme çizgileri bulunur. Kamera ilgili bölgeye yaklaşır, vurgu dışındaki parçalar soluklaşır. Etiketler söylendikleri anda gelir.
3. **Kapanış** (54 kare, sessiz): kamera geri çekilir, ekran koyulaşır, seri adı ve başlık ortada görünür.

## Renkler

### Zemin ve arayüz

| Belirteç | Renk | Kullanım |
|---|---|---|
| `zemin` / `zeminKoyu` | `#0B1B33` / `#071226` | Koyu teknik çizim zemini, 48 px ızgara |
| `kasa` / `kasaCizgi` | `#16294A` / `#3B5A8A` | Aygıt gövdesi |
| `parca` / `parcaCizgi` | `#1F3A63` / `#7FA6D9` | Parça dolgusu ve çizgisi (boşta) |
| `yazi` / `soluk` | `#EAF2FF` / `#8FA6C8` | Metin / ikincil metin |
| `vurgu` | `#FFD24A` | Odak halkası, etiket çizgisi, başlıkta vurgulu kelime, ilerleme. **Az kullanılır.** |

### Akış renkleri (anlamları sabit)

Renk bilgiyi tek başına taşımaz: ortamlar **kesik desenle** de ayrılır.

| Tip | Renk | Desen | Anlam |
|---|---|---|---|
| `sicak` | `#FF5B3A` | uzun kesik | Sıcak su / sıcak akışkan (gidiş) |
| `donus` | `#3DA5FF` | uzun kesik | Soğumuş dönüş suyu |
| `soguk` | `#7FE3FF` | uzun kesik | Şebeke / soğuk su |
| `gaz` | `#FFC83D` | kısa kesik | Yakıt gazı |
| `duman` | `#9AA7B8` | geniş kesik | Baca gazı / egzoz |
| `hava` | `#CFE8FF` | geniş kesik | Taze hava |
| `elektrik` | `#5CF2A6` | nokta | Elektrik / sinyal kablosu |
| `yogusma` | `#8FD3C8` | seyrek | Yoğuşma suyu |

## Yazı

- **Poppins** (500–800): başlık, adım başlığı, etiket, altyazı.
- **JetBrains Mono**: seri adı, adım numarası.
- Türkçe karakterler için `latin-ext` alt kümesi yüklenir. Yazılar fontlar yüklenmeden çizilmez (`delayRender`).

| Öğe | Boyut (1080p) |
|---|---|
| Kapak başlığı | 104 px, 800 |
| Kapanış başlığı | 84 px |
| Adım başlığı | 46 px, 700 |
| Altyazı | 42 px, 600 (tek satır hedefi ≤ 58 karakter) |
| Etiket | 32 px, 600 |
| Seri adı | 20–26 px mono, harf aralığı 5–8 |

## Etiketler

- Parçanın çevresinde kesikli sarı bir odak çerçevesi olur. Sarı çizgi çizilerek uzar, ardından koyu zeminli sarı kenarlı kutu gelir.
- Yön (`sol/sag/ust/alt`) verilmezse parça ekranın hangi yarısındaysa o yöne konur.
- Kutular ekran dışına, üst banda ve altyazı alanına taşmaz.
- Sahne başına **en çok 4 etiket** konur. Etiket metni 1–3 kelimedir.

## Altyazı

- Altta ortalanmış koyu hap şeklindedir. Seslendirme noktalamada parçalara bölünür.
- Kelime zamanları varsa söylenmiş kelimeler beyaza döner, söylenecekler soluk kalır (hafif karaoke).

## Ses

- Konuşma −16 LUFS seviyesindedir. Müzik konuşma sırasında 0.07'ye, arada 0.16'ya iner (ducking).
- Her sahne geçişinde hafif bir `whoosh` çalar (0.1).
