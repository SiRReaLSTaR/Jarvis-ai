import { useRef, useState, useEffect } from 'react';
export default function PhotoInput({ image, onChange, disabled }) {
  const [camera, setCamera] = useState(false), [error, setError] = useState('');
  const video = useRef(null), stream = useRef(null), mounted = useRef(true), disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  function stop() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (disabled) { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); } }, [disabled]);
  async function start() {
    try {
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera için HTTPS ve kamera destekli tarayıcı gerekir.');
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      if (!mounted.current || disabledRef.current) { next.getTracks().forEach(t => t.stop()); return; }
      stream.current = next; setCamera(true);
      requestAnimationFrame(() => { if (video.current) video.current.srcObject = next; });
    } catch (e) { setError(e.message); }
  }
  function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement('canvas'), ratio = Math.min(1, 1280 / v.videoWidth);
    canvas.width = v.videoWidth * ratio; canvas.height = v.videoHeight * ratio;
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL('image/jpeg', 0.8)); stop();
  }
  async function file(event) {
    const value = event.target.files?.[0]; event.target.value = '';
    if (!value) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type) || value.size > 4 * 1024 * 1024) { setError('En fazla 4 MB JPEG, PNG veya WebP seçin.'); return; }
    const reader = new FileReader(); reader.onload = () => { onChange(reader.result); setError(''); }; reader.readAsDataURL(value);
  }
  return <div className="photoInput">
    <label className="secondaryButton">Fotoğraf ekle<input type="file" accept="image/jpeg,image/png,image/webp" onChange={file} disabled={disabled}/></label>
    <button type="button" onClick={start} disabled={disabled || camera}>Kamerayı aç</button>
    {camera && <div className="cameraPreview"><video ref={video} autoPlay muted playsInline/><button type="button" onClick={capture}>Kareyi seç</button><button type="button" onClick={stop}>Kamerayı kapat</button></div>}
    {image && <div className="selectedPhoto"><img src={image} alt="Gönderilecek fotoğraf"/><button type="button" onClick={() => onChange(null)}>Fotoğrafı kaldır</button><p>Yalnızca Gönder'e bastığınızda Gemini'ye iletilir. Fotoğraf geçmişe kaydedilmez.</p></div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
