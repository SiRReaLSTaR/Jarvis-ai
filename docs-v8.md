# V8 — canlı ses ve telefon deneyimi

Bu değişiklikler yerelde hazırlanan V7'nin üzerine uygulanır; V7 henüz uzak main dalına gönderilmiş değildir. Tam teslim yaması özgün c1d6a7d sürümünden itibaren bütün değişiklikleri içerir.

## Eklenenler

- DİLAN/LARA/VERA seçim paneli, ajan başına görünen ad ve altı desteklenen Gemini sesi. İsimler rolü değiştirmez. Ses seçimi yalnızca Gemini Live'a aittir; bas-konuş tarayıcı seslerini kullanmaya devam eder.
- Telefonda durum halkası, seçili ajan rengi, açık mikrofon göstergesi, sohbet, sabit komut çubuğu ve açılır ayarlar. Grafikler özgün SVG/CSS olarak yazıldı; başka uygulamanın görseli veya kodu kopyalanmadı.
- Cihaza özel kalite/performans/otomatik seçenekleri. Performans modunda animasyon ve parıltı kapatılır. Otomatik mod sistemin hareket azaltma veya tarayıcının veri tasarrufu tercihini izler; pil/ısı sensörü okuduğunu iddia etmez.
- Gemini Live bağlantısı: 16 kHz PCM mikrofon girişi, PCM ses oynatma, yankı engelleme isteği, konuşma transkriptleri, söz kesilince bekleyen seslerin durması.
- Canlı konuşmada `get_clock` ve `ask_expert` araçları. Araştırma LARA'ya, teknik soru VERA'ya sunucuda gönderilir; sonuç ve kaynaklar canlı modele geri verilir. Bu sürüm başka uygulamalara otomatik işlem yaptıran araçlar eklemez.
- Tarih/saat UTC anından doğrulanmış IANA saat dilimiyle hesaplanır. Yerel saat/tarih ayrı alanlarda modele verilir. Saat dilimi telefon tarayıcısından gelir; telefon ve sunucu sistem saatlerinin doğru olması gerekir.
- Önceki sürümün Gemini iptal sinyali SDK'nin belgelenen `config.abortSignal` alanına taşındı.

## Çalıştırma

1. `npm ci`
2. Mevcut `.env` içindeki `GEMINI_API_KEY` sunucuda kalır. Live destekli ve hesabınıza açık bir modeli `GEMINI_LIVE_MODEL` ile seçin. Örnek değer varsayılandır; hesabın gerçekten bu modele erişimi ayrıca test edilmelidir. VERA için mevcut OpenRouter anahtarı gerekir.
3. `npm run jarvis`, veya üretimde `npm run build` ardından `npm start`.
4. Telefon için HTTPS adresini kullanın. Üstten ajanı seçin, alttaki mikrofona dokunun ve mikrofon izni verin. Kapat düğmesi mikrofon track'lerini ve ses kuyruğunu temizler. Ekran kilidi/arka plan konuşması tarayıcı ve işletim sistemine bağlıdır; desteklendiği iddia edilmez.
5. Canlı bağlantı çalışmazsa Ayarlar → Ses ve şehir → Tarayıcı ile bas-konuş kullanılabilir. Geçiş otomatik yapılmaz; mikrofon izinsiz yeniden açılmaz.

## Erişim ve veriler

Ana Gemini anahtarı tarayıcıya gönderilmez. Sunucu `v1alpha` authTokens API'siyle modele/yapılandırmaya kısıtlı, bir kez kullanılabilen geçici token oluşturur. Yeni bağlantı için geçerlilik 60 saniye, oturum için 15 dakikadır. Token yalnızca bellekte tutulur. En fazla iki canlı oturum ve oturum başına 40 benzersiz araç çağrısı kabul edilir.

Ses telefon ile Gemini arasında doğrudan gider. Transkriptler ortak sunucu geçmişine gönderilir, ham ses diske yazılmaz. Anahtar olmadan canlı API testi yapılmamıştır. Geçici tokenların ve Live API'nin kullanılabilirliği Google hesabına ve kotasına bağlıdır. Ücretli kullanım oluşabilir. Oturumu kapatmak tarayıcı bağlantısını ve uzman isteklerini durdurur; daha önce işlenen kullanımın ücretini geri almaz. Doğrudan bağlantının token süresi dolana kadar geçerli olabileceği unutulmamalıdır.

## Bilinçli sınırlar

Bu web uygulaması iOS Keychain, AlarmKit/EventKit, App Store uygulaması veya işletim sistemi arka plan servisi değildir. Yerel alarm, anımsatıcı ya da takvim kaydı oluşturmaz. Canlı ve yazılı asistan talimatları bu işlemleri yapmış gibi konuşmamasını ister; bunları yapabilecek bir araç sunulmaz.

QR ile bilgisayar eşleştirme ve terminal/dosya kontrolü eklenmedi. Mevcut tek kullanıcı erişim anahtarıyla aynı sunucuya bağlanan cihazlar ortak veriyi görür; bu, güvenli bir cihaz eşleştirme protokolü veya uzaktan bilgisayar kontrolü olarak sunulmaz.

## Doğrulama

Birim testleri gerçek ücretli servis çağırmaz. Canlı oturum sahibi/süresi, araç çağrısı tekrarı, geç gelen yanıt, mikrofon izni sırasında kapatma, ses kuyruğu iptali, parçalara bölünmüş ses dönüştürme ve İstanbul gece yarısı tarih geçişini kontrol eder.

Tam doğrulama için: `npm test`, `npm run lint`, `npm run build`; ardından gerçek Gemini Live hesabıyla iPhone Safari ve masaüstü tarayıcıda mikrofon/ses/söz kesme denemesi. Yerel ortamda npm ağına erişim yoksa derleme ve HTTP testleri tamamlanmış sayılmaz.
