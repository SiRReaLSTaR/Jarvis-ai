# Jarvis AI — V8

DİLAN koordinatör, LARA kaynaklı araştırmacı, VERA teknik kod danışmanı. React/Vite arayüzü, Node/Express sunucusu, Gemini ve OpenRouter ile çalışır.

## Başlatma

Node.js 22.12+ gerekir (CI: Node 24). `npm ci` çalıştırın; `.env.example` dosyasını `.env` olarak kopyalayıp mevcut Gemini/OpenRouter anahtarlarınızı yerel dosyaya girin. Anahtarları GitHub'a yüklemeyin.

- Geliştirme: `npm run jarvis` (arayüz: http://localhost:5173), veya ayrı terminallerde `npm run server` ve `npm run dev`.
- Tek sunucu: `npm run build` ardından `npm start` (http://localhost:3001).
- Kontrol: `npm test`, `npm run lint`, `npm run build`.

## V8: canlı ses ve telefon

Canlı Gemini sesi, ajan seçimi, ajan başına ad/ses, durum halkası ve performans modu eklendi. Kurulum, veri akışı ve sınırlar için [V8 notları](docs-v8.md). Ana mikrofon canlı sesi açar; tarayıcı bas-konuş seçeneği Ayarlar → Ses ve şehir bölümündedir.

## V7 temel özellikleri

- **Canlı yanıtlar:** Gemini/OpenRouter çıktısı gelirken her ajanın taslağı görünür. Tamamlanan nihai yanıt ayrıca kaydedilir. Çoklu ajan taslakları doğrulanmış sonuç olarak sunulmaz.
- **Görevi iptal et:** Sağlayıcı isteğine AbortSignal iletilir; iptal sonrası geç gelen cevap geçmişe eklenmez. Genel görev süresi en fazla 3 dakikadır. Sağlayıcının önceden işlediği token ücretleri geri alınmaz.
- **Cihaz senkronizasyonu:** Açık ekranlar SSE üzerinden ortak geçmiş, görev, hafıza ve ayar değişikliklerini alır. Yeniden bağlanınca sunucudan toparlanır; 15 saniyelik yedek sorgulama vardır. Ses yalnızca isteği gönderen sekmede çalar.
- **Günlük pano:** Open-Meteo hava tahmini, TCMB gösterge satış kurları ve TRT Haber RSS başlıkları. Tarih ve kaynak bağlantısı gösterilir. Kaynak alınamazsa sayı uydurulmaz. TCMB kuru canlı piyasa fiyatı değildir. Pano 10 dakika önbelleklenir.
- **İlgili hafıza:** Yalnızca ilk 20 kaydı göndermek yerine tüm kategorilerde anahtar kelime eşleşmesiyle ilgili kayıtlar seçilir; prompt uzunluğu sınırlıdır. Bu, semantik/vektör arama değildir.
- **Fotoğraf analizi:** Dosya seçin veya kamerayı açıp bir kare seçin, sorunuzu yazıp Gönder'e basın. Önizleme otomatik gönderilmez. Kamera kapatılınca track'ler durdurulur. Fotoğraf yalnızca o istekte Gemini'ye gönderilir; sunucu diskine ve sohbet geçmişine yazılmaz. Üçüncü tarafın veri politikası ayrıca geçerlidir.
- **Gerçek cihaz paneli:** İsteğe bağlı Home Assistant köprüsü yalnızca açıkça eşlenen `light`/`switch` cihazlarını kontrol eder. Her işlem panelden onaylanır; ardından gerçek durum yeniden okunur. Kahve hazır gibi sensörsüz iddialar veya simülasyon yoktur.
- **Hafıza çakışma kontrolü:** Aynı hafızayı iki ekran değiştirirse eski revizyonun üzerine yazması engellenir. Son değişiklikleri yükleyip komutu yeniden uygulayın.
- Saat/tarih komutlarındaki kapsam hataları ve yenileme sonrası görünmeyen sohbet geçmişi düzeltildi. Konuşma hızı ve otomatik seslendirme ortak ayarlara taşındı.

## Telefon, tablet ve erişim

Sunucu varsayılan olarak yalnızca yerel bilgisayarı dinler. Dış erişim için `HOST=0.0.0.0`, uzun rastgele `JARVIS_ACCESS_TOKEN` ve arayüzün tam adresini içeren `ALLOWED_ORIGINS` kullanın. Sağ panelde Erişim ayarı alanına aynı anahtarı girin. Anahtar URL'ye yazılmaz, sekme oturumunda tutulur.

Telefonun mikrofonu/kamerası için HTTPS gerekir. Üretimde reverse proxy'yi sunucuya yönlendirin. SSE için `/api/events` üzerinde tamponlama kapatılmalı (`proxy_buffering off`), okuma zaman aşımı en az 60 saniye olmalıdır. Vite proxy'si yalnızca geliştirme içindir. Aktif sekme sayısı en fazla 12'dir.

## Ev cihazları

`.env` içinde örnek:

```dotenv
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=
HA_ENTITIES=Salon=light.salon,Masa=switch.masa_lambasi
```

Yalnızca kontrol etmek istediğiniz cihazları eşleyin. Sağ panelden Ev cihazları bölümünü açın. Anahtar veya eşleme yoksa özellik kapalıdır; gerçek cihaz taklidi yapmaz. Bu köprü otomatik testlerde sahte Home Assistant yanıtlarıyla doğrulanır; kendi donanımınızla ayrıca deneyin. Sesle fiziksel cihaz çalıştırma bu sürümde yoktur.

## Veriler ve sınırlar

Bu sürüm **tek kullanıcılıdır**; tüm yetkili ekranlar aynı hafıza ve geçmişi paylaşır. Aynı anda bir AI görevi kabul edilir; uzman ajanlar o görev içinde paralel çalışabilir. Veriler `data/state.json` dosyasına atomik yazılır (dosya izni 0600); Git'e alınmaz. Üretimde kalıcı disk ve yedek kullanın. Bozuk veri dosyası sessizce sıfırlanmaz. Başlangıçta yarım kalan görevler kesintiye uğradı olarak işaretlenir.

İlk bağlantıda boş ve değişmemiş sunucu hafızasına eski tarayıcı kayıtları aktarılır. Yedekten yükleme mevcut hafızayı değiştirir. Son 40 mesaj saklanır, son 20 mesaj model bağlamına gider. Seçilen hafıza kayıtları ve sohbet, kullanılan AI sağlayıcısına gönderilir. Pano servislerine ayarlardaki şehir adı gider.

“Sesi durdur” yalnızca mikrofon döngüsünü ve sesi durdurur; “Görevi iptal et” model isteğini de iptal eder. `dur`, `sus`, `iptal et` komutları görev iptalini çağırır. Tarayıcı ses tanıma ve Türkçe ses desteği cihaza bağlıdır. Tarayıcı bas-konuş modunda yanıt tamamlandıktan sonra okunur; ana mikrofonla açılan Gemini Live modunda ses akış halinde çalınır.

VERA kod taslağı üretir; dosya yazmaz, terminal çalıştırmaz veya GitHub'a otomatik göndermez. `Yanıt hazır` durumu AI yanıtının tamamlandığını belirtir. Sürekli WebRTC kamera yayını, PWA çevrimdışı kullanım, ElevenLabs ve otomatik fiziksel cihaz araçları bu sürüme dahil değildir.

## Doğrulama

`npm test`: modül, kalıcılık, hafıza sıralama, akış/parçalanmış UTF-8, görev iptali, kaynak doğrulama, Home Assistant izinleri ve gerçek HTTP/SSE entegrasyon testleri. Canlı ücretli AI çağrısı yapılmaz. GitHub Actions ayrıca lint ve üretim derlemesini çalıştırır.
