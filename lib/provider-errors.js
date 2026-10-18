// Return fixed, user-facing strings only. Never include provider bodies, URLs, keys, or prompts.
export function publicProviderError(error) {
  const status=Number(error?.status || error?.statusCode || error?.response?.status || error?.error?.code);
  const reason=String(error?.code || error?.error?.status || '').slice(0,200);
  const internal=String(error?.message || '').slice(0,4000);
  const detail=reason+' '+internal;
  let code='PROVIDER_ERROR', message='Yanıt alınamadı. Sağlayıcı bağlantısını kontrol edip tekrar deneyin.';
  if (reason==='MISSING_KEY' || /API_KEY.*tanımlı değil/.test(internal)) {code='MISSING_KEY';message='Bu sağlayıcının API anahtarı tanımlı değil. Sunucudaki .env ayarını kontrol edin.';}
  else if (status===401 || /API_KEY_INVALID|UNAUTHENTICATED|INVALID_API_KEY/.test(detail)) {code='AUTH';message='API anahtarı kabul edilmedi. Anahtarı ve bağlı olduğu projeyi kontrol edin.';}
  else if (status===429 || /RESOURCE_EXHAUSTED|RATE_LIMIT/.test(detail)) {code='QUOTA';message='Sağlayıcının kota veya hız sınırına ulaşıldı. Biraz bekleyin; sürerse hesabın model kotasını kontrol edin.';}
  else if (status===403 || /PERMISSION_DENIED/.test(detail)) {code='ACCESS';message='Bu model veya servise erişim izni verilmedi. Proje ve model erişimini kontrol edin.';}
  else if (status===404 || /MODEL_NOT_FOUND|NOT_FOUND/.test(detail)) {code='MODEL';message='Seçilen model bulunamadı veya bu hesapta kullanılamıyor. Model adını kontrol edin.';}
  else if (error?.name==='TimeoutError' || status===408 || status===504 || /ETIMEDOUT|TIMEOUT/.test(detail)) {code='TIMEOUT';message='Sağlayıcı zamanında yanıt vermedi. Tekrar deneyebilirsiniz.';}
  else if (status>=500 && status<=599) {code='UNAVAILABLE';message='Yapay zekâ sağlayıcısı geçici olarak kullanılamıyor. Biraz sonra tekrar deneyin.';}
  else if (/ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR/.test(reason+' '+String(error?.cause?.code || '')) || /fetch failed|network error/i.test(internal)) {code='NETWORK';message='Sağlayıcıya bağlantı kurulamadı. İnternet bağlantısını kontrol edin.';}
  else if (reason==='EMPTY_RESPONSE') {code='EMPTY_RESPONSE';message='Sağlayıcı kullanılabilir bir yanıt döndürmedi. Tekrar deneyin.';}
  return {code,message};
}
