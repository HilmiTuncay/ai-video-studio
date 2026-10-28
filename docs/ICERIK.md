# İçerik yazımı (`icerik/<aygit>/aygit.json`)

Bir videonun değişen her şeyi bu dosyadadır: başlık, sahneler, seslendirme, kamera, durumlar, vurgular ve etiketler. Tipler `src/motor/model.ts` içinde tanımlıdır.

## Şema

```jsonc
{
  "id": "kombi",                       // klasör, kompozisyon ve çıktı adı
  "baslik": "Kombi nasıl çalışır?",
  "vurguKelime": "Kombi",              // başlıkta sarı yazılır
  "altBaslik": "Isıtma ve sıcak su, tek cihazda",
  "sema": "kombi",                     // src/aygitlar/index.ts kaydındaki şema
  "format": "9:16",                    // varsayılan; 16:9 de çalışır
  "hedefSn": 40,
  "ses": { "saglayici": "eleven", "kimlik": "<voice_id>", "model": "eleven_multilingual_v2" },
  "okunus": [{ "yazim": "NTC", "okunus": "en te ce" }],
  "muzik": "sakin",                    // sakin | yok
  "sahneler": [
    {
      "id": "atesleme",                // ses dosyası adı buna bağlıdır; değiştirmeyin
      "baslik": "Ateşleme",            // sol üstteki adım başlığı (1–3 kelime)
      "ses": "Kart komut verir; fan havayı çeker, gaz valfi açılır ve brülör yanar.",
      "kamera": ["kart", "fan", "gazValfi", "brulor"], // bu parçalar güvenli alana sığdırılır
      "durum": ["kart", "fan", "gaz", "alev"],      // şemada açık olanlar
      "vurgu": ["kart", "fan", "gazValfi", "brulor"], // boşsa her şey net
      "etiketler": [{ "parca": "kart", "metin": "Elektronik kart", "yon": "sol", "soz": "kart" }]
    }
  ]
}
```

`icerik/<aygit>/uretim.json` dosyasını araçlar yazar (ses kayıtları, kelime zamanları, müzik). Elle düzenlenmez.

## Senaryo kuralları

1. **Doğruluk önce gelir.** Her teknik ifade güvenilir bir kaynakla (üretici kılavuzu, teknik rehber) doğrulanır. Doğrulanmamış sayı yazılmaz. Kaçınılacak yaygın yanlışlar aygıt notuna yazılır (`docs/aygitlar/<aygit>.md`).
2. **Bir sahne, bir fikir.** Sahne 1–2 cümledir. Cümle sahne içinde biter, sonraki sahneye taşmaz.
3. **İlk sahne soruyla açılır** ("…ısıtır. Peki nasıl?"). Son sahne bir sonuç ya da fayda söyler.
4. **Süre bütçesi:** 40 sn ≈ 175–180 hece (bkz. [SES.md](SES.md#süre-bütçesi)). `cizelge()` tahmini ses yokken de süre verir.
5. **Basit Türkçe.** Terim ilk geçtiği yerde ekranda etiketlenir. Etiketteki ad ile seslendirmedeki ad aynı olur.
6. **Resmi yazım.** Sayılar rakamla, kısaltmalar büyük harfle yazılır. Okunuşu `okunus` listesi düzeltir.
7. **Ekran ile ses uyumlu olmalı.** Seslendirmenin anlattığı parça o sahnenin `vurgu`sunda ve `durum`unda gerçekten görünür. Görünmeyen bir şey anlatılmaz.

## Sahne alanları

- `kamera`: Çerçevelenecek parçaların listesi. Güvenli alan hesabı otomatiktir, içerik biçimden bağımsız kalır. Liste daraldıkça yakınlaşma artar. Kontak sayfasıyla denetlenir (`node tools/uret.mjs <aygit> kareler`).
- `durum` (mekanik döngü): Motor gibi aygıtlarda zaman anahtarıdır (`emme`, `is`…). Şema sahnenin ilerlemesini `p()` ile okur.
- `durum`: Şemanın başındaki yorumda listelenen anahtarlardan seçilir. Bilinmeyen anahtar hata vermez ama hiçbir şey de yapmaz; dikkat edilir.
- `vurgu`: Parça kimlikleri. Boruların `grup` listesindeki kimliklerden biri vurgudaysa boru da net görünür.
- `etiketler[].soz`: Etiketi seslendirmedeki sözcüğe bağlar. Sözcüğün başı yazılır (`"eşanjördeki"` ya da `"eşanjör"`).
