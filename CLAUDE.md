# Jarvis AI — Claude Code kuralları

## Proje
- Sunucu: `server.js` ve `lib/` (Node, Express). Ajanlar: DİLAN (Gemini), LARA (Gemini + Google Arama), VERA (OpenRouter).
- Arayüz: `src/` (React + Vite). Stil dosyaları `src/styles/`.
- Testler: `test/` (`node --test`). Her değişiklikten sonra test çalıştırılır.

## Komutlar
- Test: `npm test`
- Lint: `npm run lint` (oxlint)
- Derleme: `npm run build`
- Geliştirme: `npm run jarvis` (arayüz 5173, sunucu 3001)

## Kurallar
- Arayüz metinleri Türkçe. Kod yorumları da Türkçe kalsın.
- `.env` ve `data/` dosyalarını okuma, yazma ya da commit etme. API anahtarlarını hiçbir çıktıya yazma.
- Yeni bağımlılık eklemeden önce sor; mevcut paketlerle çözülebiliyorsa ekleme.
- `main` dalına doğrudan commit atma. Çalışma dalı `feature/...` olsun.
- Commit ve push yalnızca kullanıcı onayıyla yapılır.
- Güvenlik: Gemini ve OpenRouter anahtarları sunucuda kalır, tarayıcıya gönderilmez. Erişim anahtarı ve origin kontrolünü zayıflatan değişiklik yapma.
- Ajan araç çağrılarında yalnızca izinli araçlar açık kalır (`get_clock`, `ask_expert`).
