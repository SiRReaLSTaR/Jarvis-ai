# Jarvis kişisel görev defteri

Bu sürüm görevleri `data/state.json` içindeki `todos` alanında saklar. `tasks` AI işlem kayıtları ve `memory.tasks` eski ortak hafıza kayıtları korunur, otomatik olarak kişisel göreve dönüştürülmez. Şema 1 dosyaları şema 2 olarak açılır; önceki dosya normal yedek döngüsüne alınır. Yeni veri klasörünü eski sürümle açmayın; geri dönüşte eski çalışma klasörünün kendi verisini kullanın.

Dashboard → Görevler: başlık, not, tarih, isteğe bağlı saat, öncelik, düzenleme, tamamlama ve yeniden açma. Filtreler: açık, bugün, tarihi geçen, tamamlanan, tümü. Liste başlık/notta aranabilir, JSON olarak dışa aktarılabilir. Dışa aktarılan görev dosyası mevcut hafıza içe aktarma düğmesine verilmez; bu sürümde görev içe aktarma yoktur. Tamamlanan kayıtlar tutulur; toplam sınır 500 kayıttır.

Sohbette AI çağrısı gerektirmeyen kesin komutlar:
- `Görev ekle: Teklifi hazırla`
- `Görev ekle: yarın: Teklifi hazırla`
- `Görev ekle: 2026-10-25: Teklifi hazırla`
- `Görevlerim` / `Bugünkü görevlerim`
- `Görevi tamamla: Teklifi hazırla`

Tamamlama tam başlıkla eşleşir; birden fazla eşleşme varsa değişiklik yapmaz. Daha serbest doğal dilde yazılı istekler normal AI sohbetine gider ve otomatik görev aracı çalıştırmaz. Başında `Görev ekle:` bulunmayan genel yazılı görev isteklerinde kaydın yapıldığını varsaymayın; form veya yukarıdaki kesin komutları kullanın.

Canlı seste `list_todos`, `create_todo`, `update_todo` araçları sunulur. Model, yalnızca açık kullanıcı isteğiyle işlem yapması ve araç sonucu gelmeden başarı iddia etmemesi için yönlendirilir. Kayıt sonucu Dashboard'dan doğrulanabilir. Listedeki görevler bütün ajanlar için ortaktır; ajan sohbetleri ayrı kalır. Araç listesi en fazla 50 sonuç döndürür; başlık/not filtresi vardır. Gün/saat, oturumun doğrulanmış IANA saat dilimindedir.

Görev tarihi telefon alarmı, takvim kaydı veya arka plan bildirimi oluşturmaz. Bu sürüm bunları kurduğunu iddia etmez. Tarihi geçen filtresi saatten bağımsız, görev kaydının saat dilimindeki takvim gününe göre çalışır.

Yazma işlemi başarısızsa bellek içi değişiklik geri alınır. Oluşturmada işlem kimliği tekrarları kalıcı olarak yakalanır. Düzenlemede kayıt sürümü kullanılır; eski sürüm 409 döndürür. Çakışmada güncel görev yeniden açılıp düzenlenmelidir. Kimlik doğrulama, origin ve hız sınırları mevcut API korumasından geçer. Anahtarlar görev dosyalarına veya dışa aktarıma eklenmez.

Kurulum denemesi `jarvis-gorev-defteri` klasörü/dalı içinde yapılır. Kaynak `jarvis-guvenilirlik`, tasarım CSS dosyaları, kendi `.env` ve verisi değiştirilmez. Kaynak `.env` ve `data` yeni klasöre kopyalanır; sonraki değişiklikler bağımsızdır. GitHub'a otomatik gönderim veya main birleştirmesi yoktur.

Doğrulama: `npm test && npm run build`. Saf Node testleri veri geçişi, yeniden açılış, yinelenen istek, disk hatası geri alma, çakışma, tarih/saat doğrulama, Türkçe komutlar ve canlı araç sahipliği/tekrarı/kapanan tur davranışını denetler. HTTP testi kimlik doğrulama, CRUD ve AI çağrısı olmadan yazılı görev komutunu denetler. Gerçek Gemini mikrofonu, dokunmatik görünüm ve tam Vite derlemesi Codespaces'te ayrıca denenmelidir.
