# Jarvis AI

DİLAN koordinasyon, LARA kaynaklı araştırma, VERA teknik kod önerileri üretir. React/Vite arayüzü ve Node/Express sunucusu kullanılır.

## Çalıştırma

Node.js 22.12+ gerekir. `npm ci` çalıştırın. `.env.example` dosyasını `.env` olarak kopyalayın ve mevcut Gemini/OpenRouter anahtarlarını yerel dosyaya girin. Anahtarları GitHub'a yüklemeyin.

İki terminalde `npm run server` ve `npm run dev` çalıştırın. Vite'ın gösterdiği yerel adresi açın.

## Erişim ve kalıcı veriler

Sunucu varsayılan olarak yalnızca yerel bilgisayarı dinler. Dış erişim için `HOST=0.0.0.0`, uzun rastgele `JARVIS_ACCESS_TOKEN` ve tam arayüz adreslerini içeren `ALLOWED_ORIGINS` zorunludur. Arayüzde Görev Merkezi → Erişim ayarı alanına aynı erişim anahtarını girin. Anahtar yalnızca sekme oturumunda tutulur. İnternet yayını HTTPS ve `/api` için sunucuya yönlendiren reverse proxy gerektirir; Vite proxy'si yalnızca geliştirme içindir.

Bu sürüm tek kullanıcılıdır: tüm yetkili sekmeler aynı hafızayı ve konuşma geçmişini paylaşır. Veriler `data/state.json` içinde saklanır; bu klasör Git'e alınmaz. Üretimde kalıcı disk bağlayın ve erişimi sunucu kullanıcısıyla sınırlayın. Bozuk veri dosyası sunucunun başlamasını durdurur; veriyi sessizce sıfırlamaz.

İlk bağlantıda sunucu hafızası boşsa mevcut tarayıcı hafızası taşınır. Hafızayı indir/içe aktar düğmeleri JSON yedeklerini yönetir; içe aktarma mevcut hafızayı değiştirir. Geçmişi temizle yalnızca konuşma geçmişini siler. Son 40 mesaj saklanır, son 20 mesaj modellere bağlam olarak gönderilir. Hafıza ve geçmiş seçilen AI sağlayıcısına gönderilir.

## Görevler ve ses

Görevler çalışan, yanıt hazır, kısmi sonuç, hata veya kesintiye uğradı olarak kaydedilir. Aynı anda bir sohbet görevi kabul edilir. Kaynak bağlantıları Google grounding metadata'dan alınır. Yapılandırıldı göstergesi anahtarın varlığını, son başarılı işlem zamanı ise gerçek başarılı yanıtı belirtir.

Sesi durdur düğmesi ve `dur`, `sus`, `iptal et` komutları mikrofon döngüsünü ve konuşmayı durdurur. Arka plandaki AI isteğini iptal etmez. Ses tanıma ve kullanılabilir Türkçe sesler tarayıcıya bağlıdır.

VERA kod taslağı üretir; dosya yazmaz, terminal komutu çalıştırmaz, GitHub'a otomatik göndermez. Böyle bir yetenek ayrı izole çalışma ortamı, izinli araçlar ve değişiklik incelemesi gerektirir. `completed`/Yanıt hazır durumu AI yanıtının tamamlandığını belirtir.

## Doğrulama

`npm test`, `npm run build`, `npm run lint`.
