# Jarvis veri koruma ve işlev düzeltmeleri

Bu paket görünümü yeniden tasarlamaz. Kaynak kurulum ayrı bir worktree'ye kopyalanır; kaynak .env, data ve görsel dosyaları değiştirilmez.

## Kayıtlar

- `data/state.json` şema sürümü 1'e geçirilir. Eski geçerli kayıtlar korunur.
- History/task öğeleri ve profil alanları açılışta doğrulanır. Geçersiz öğeler ayrılır; orijinal dosya `data/quarantine/` altında korunur ve arayüzde bildirim gösterilir.
- Son 5 düzenli yedek `data/backups/state-*.json` içinde tutulur.
- Hafıza yüklemeden önce ayrı checkpoint alınır; son 5 checkpoint düzenli konuşma yedeklerinden bağımsız tutulur.
- Bozuk ana dosyada en yeni sağlam yedek kullanılır. Son yedekten sonraki kayıtlar kaybolmuş olabilir; kullanıcı bilgilendirilir.
- Sağlam yedek yoksa boş hafıza oluşturulmaz. Süreç açık bir kurtarma mesajıyla durur; orijinal dosya korunur.
- Daha yeni şema sürümü eski sürümle açılıp üzerine yazılmaz.
- Yedekler aynı disk üzerindedir; disk/hesap kaybına karşı ayrıca dışa aktarım gerekir. İçerik şifrelenmez; yeni dosyalar 0600, yedek/karantina klasörleri 0700 izinleriyle oluşturulur.

## İşlevler

- Canlı ses araçları kaynakları turnId ile ilişkilendirir. Geç tamamlanan araç sonucu sonraki konuşmaya taşınmaz. Eski istemcilerin kaynakları bir kez tüketilir.
- Kullanıcının verdiği yeni ajan adları güvenli tam-kelime eşleştirmesiyle router'a katılır. Varsayılan adlar korunur; çakışan özel adlar başka ajanın varsayılan adını devralmaz.
- Kota, anahtar, model erişimi, zaman aşımı ve ağ hataları sabit, gizli bilgi içermeyen mesajlara çevrilir. Bu sürüm otomatik ücretli yeniden deneme yapmaz.
- Kurtarma bildirimindeki 'Okudum' onayı yetkilendirilmiş API üzerinden kaydedilir. 'Sonra incele' bildirimi yalnızca mevcut ekranda gizler.

## Doğrulama

63 yerel test geçti; bunlar bozuk JSON, bozuk yedek, bozuk liste öğeleri, yedeksiz durma, checkpoint saklama, ajan adları, kaynak karışması ve geç araç sonuçlarını içerir. JS/JSX sözdizimi kontrol edildi.

Yeni HTTP sözleşme testi test/reliability-http.test.js içinde. Bu ortamda Express/Gemini SDK bağımlılıkları kurulu olmadığı için gerçek HTTP testleri ve Vite derlemesi yerelde çalıştırılamadı. Codespaces'te `npm ci && npm test && npm run build` ile doğrulayın. Testlerde ücretli model çağrısı yapılmaz. Gerçek mikrofon/model bağlantısı ayrıca cihazda denenmelidir.

## Sınırlar

Tek kullanıcı/ortak erişim anahtarı modeli korunur. Kullanıcı hesapları, veri şifreleme, eşzamanlı görev kuyruğu ve terminal/dosya yürütme bu pakete dahil değildir.
