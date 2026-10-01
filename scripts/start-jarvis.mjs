import net from 'node:net';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const backendPort = Number(process.env.PORT || 3001);
if (!Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65535 || backendPort === 5173) {
  console.error('PORT geçersiz. Sunucu için 3001 kullanabilirsin.');
  process.exit(1);
}

function available(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '0.0.0.0', () => probe.close(() => resolve(true)));
  });
}

for (const port of [backendPort, 5173]) {
  if (!await available(port)) {
    console.error(`\n${port} portu kullanımda. Jarvis zaten çalışıyor olabilir.`);
    console.error('Çalışan terminali kontrol et. İkinci bir kopya başlatılmadı.');
    process.exit(1);
  }
}

const env = { ...process.env };
if (env.CODESPACE_NAME) {
  const origin = `https://${env.CODESPACE_NAME}-5173.app.github.dev`;
  const origins = (env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(value => value.trim()).filter(Boolean);
  env.ALLOWED_ORIGINS = [...new Set([...origins, origin])].join(',');
}

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  const force = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }, 3000);
  force.unref();
}

function run(label, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env });
  children.push(child);
  child.on('error', error => {
    console.error(`${label} başlatılamadı: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${label} kapandı (${signal || code}). Diğer süreç de durduruluyor.`);
      stop(code === 0 ? 0 : 1);
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

run('Sunucu', ['server.js']);
run('Arayüz', [
  'node_modules/vite/bin/vite.js',
  '--host', '0.0.0.0',
  '--port', '5173',
  '--strictPort'
]);

console.log('\nJarvis başlatılıyor. İki sürecin çıktısı bu terminalde görünecek.');
console.log('Durdurmak için Ctrl+C. Bağlantı noktaları bölümünden 5173 adresini aç.');
