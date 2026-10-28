# Kombi: teknik not

Kapsam: duvar tipi, **yoğuşmalı, hermetik, plakalı eşanjörlü** doğalgaz kombisi (Türkiye'de yaygın olan tip).

## Parçalar

| Şema kimliği | Parça | Görevi |
|---|---|---|
| `kart` | Elektronik kart | Kombinin "beyni": pompayı, fanı, gaz valfini ve vanayı yönetir |
| `fan` | Fan | Yanma havasını dışarıdan çeker, atık gazı dışarı iter |
| `gazValfi` | Gaz valfi | Karttan gelen komutla gaz akışını açar ve ayarlar |
| `brulor` | Brülör | Gaz-hava karışımını kontrollü olarak yakar (ateşleme elektrodu ilk kıvılcımı verir) |
| `hx` | Ana (primer) eşanjör | Alevin ve baca gazının ısısını kalorifer suyuna aktarır |
| `pompa` | Sirkülasyon pompası | Kalorifer suyunu devrede dolaştırır |
| `vana` | Üç yollu vana | Sıcak primer suyu peteklere ya da plakalı eşanjöre yönlendirir |
| `plaka` | Plakalı (sekonder) eşanjör | Primer suyun ısısını şebeke suyuna aktarır; iki su karışmaz |
| `sensor` | Akış sensörü / türbin | Musluk açılınca suyun aktığını algılar, karta bildirir |
| `baca` | Hermetik (eş eksenli) baca | İç borudan atık gaz çıkar, dış borudan taze hava girer |
| `yogusma` | Yoğuşma suyu tahliyesi | Asidik yoğuşma suyunu gidere atar |
| `petek` | Petek (radyatör) | Kapalı devredeki sıcak suyla odayı ısıtır |

Şemada gösterilmeyenler (40 sn için sadeleştirildi): genleşme tankı, emniyet ventili (~3 bar), manometre (ideal ~1,5 bar), NTC sensörleri, ateşleme elektrodu.

## Çalışma

**Isıtma:** Termostat ısı ister. Fan çalışır, gaz valfi açılır, brülör yanar ve ana eşanjördeki su ısınır. Vana "kalorifer" konumundadır. Pompa suyu peteklere gönderir, su soğuyup geri döner. Bu kapalı bir devredir. Kart alevi NTC verisine göre ayarlar (modülasyon).

**Sıcak su:** Musluk açılınca akış sensörü bunu algılar. Sıcak suya öncelik verilir: vana plakalı eşanjöre döner, petek ısıtması geçici olarak durur. Primer su, şebeke suyunu anında ısıtır; kombi su depolamaz. Musluk kapanınca vana ısıtma konumuna döner.

**Yoğuşma:** Baca gazındaki su buharı soğuk dönüş suyuyla temas edince yoğuşur. Açığa çıkan gizli ısı bacadan kaçmaz, suya geri kazandırılır. Dönüş suyu yeterince düşük sıcaklıktaysa olur (≈ 50 °C ve altı gidiş).

## Kaçınılacak yanlışlar

- "Kombi sıcak suyu depolar." Standart kombi suyu anlık ısıtır.
- Petek suyuyla musluk suyunun karıştığını söylemek. Plakalı eşanjör ikisini ayrı tutar.
- Sıcak su kullanılırken peteklerin de tam ısındığını göstermek. Sıcak suya öncelik verilir. (Şemada `kullanim` durumunda `isitma` kapalıdır.)
- Yoğuşma suyunu sızıntı ya da tesisat suyu gibi anlatmak. Yanma ürünüdür ve asidiktir.
- "%100'ün üzerinde verim" ifadesini bağlamsız kullanmak.
- "Yoğuşmalı kombi her koşulda yoğuşur" demek.
- Alevin musluk suyunu doğrudan ısıttığını söylemek.
- Hermetik kombinin havayı odadan aldığını söylemek. Hava dışarıdan alınır.

## Kaynaklar

Bosch Home Comfort Türkiye kombi rehberi (kombi parçaları ve görevleri, yoğuşmalı kombi nasıl çalışır, kombi basıncı); Alarko Carrier yoğuşmalı kombi broşürü.

## Senaryo kararları (v1, 40 sn)

7 sahne: giriş → ateşleme → suyun ısınması → ısıtma devresi → musluk açılınca → anında sıcak su → yoğuşma. Toplam ≈ 177 hece, 36.0 sn konuşma, 40.3 sn video.
