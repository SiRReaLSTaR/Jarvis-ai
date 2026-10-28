---
name: verify
description: Test, lint ve derlemeyi sırayla çalıştırıp sonucu raporlar. Commit öncesi kontrol için kullanıcı tarafından /verify ile çağrılır.
disable-model-invocation: true
---

# Doğrulama

Aşağıdaki komutları sırayla çalıştır. Biri başarısız olursa dur ve hatayı raporla.

1. `npm test`
2. `npm run lint`
3. `npm run build`

Her adımın sonucunu tek satırla yaz: geçti veya hata var. Hata varsa ilgili çıktının ilk ilgili satırlarını göster. Başarılı olsa bile test sayısını belirt.
