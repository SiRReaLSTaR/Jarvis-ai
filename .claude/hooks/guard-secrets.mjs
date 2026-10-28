// PreToolUse: .env (örnek hariç) ve data/ dosyalarına erişimi engeller.
// Engel, çıkış kodu 2 ile verilir; neden stderr'e yazılır.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const raw = String(input.tool_input?.file_path || input.tool_input?.path || '');
const path = raw.replace(/\\/g, '/');

const isEnv = /(^|\/)\.env(\.(?!example$)[^/]*)?$/.test(path);
const isData = /(^|\/)data\//.test(path);

if (isEnv || isData) {
  process.stderr.write(`Engellendi: ${path} gizli anahtar veya çalışma verisi içeriyor. Bu dosyaya erişim kullanıcı onayı olmadan yapılmaz.\n`);
  process.exit(2);
}
process.exit(0);
