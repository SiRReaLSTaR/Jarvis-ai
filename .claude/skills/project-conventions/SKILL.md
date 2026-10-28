---
name: project-conventions
description: Jarvis AI projesinin kod yapısı, ajan mimarisi ve kuralları. Kod yazarken veya değiştirirken arka plan bilgisi olarak kullan.
user-invocable: false
---

# Jarvis AI proje kuralları

## Yapı
- `server.js`: Express sunucusu, tüm `/api` yolları burada.
- `lib/agents/`: DİLAN (`jarvis`), LARA (`atlas`, Google Arama), VERA (`nexus`, OpenRouter). Yönlendirme `router.js`, arama tetikleme `isResearchRequest`.
- `lib/live/`: Gemini canlı ses oturumu, araçlar `get_clock` ve `ask_expert`.
- `lib/runtime.js`: erişim kontrolü (`accessControl`), kalıcı durum, görev kayıtları.
- `src/`: React arayüzü. Ana görünüm `App.jsx`, komuta merkezi `components/CommandCenter.jsx`, tema `styles/futuristic.css`.

## Değişiklik ilkeleri
- Ajan davranışı talimatlarda (`prompts.js`, `live/config.js`) tanımlı; kodu değiştirmeden önce talimatları oku.
- Arama ve araç çağrıları gerçek kaynaklı olmalı; uydurma cevaba izin verecek değişiklik yapma.
- Arayüz metinleri Türkçe. Performans modu (`quality-performance`) ve `prefers-reduced-motion` efektleri kapatmalı.
- Yeni bir özellik için test ekle (`test/`), sonra `npm test`.
