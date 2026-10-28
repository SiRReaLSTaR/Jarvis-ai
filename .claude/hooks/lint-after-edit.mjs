// PostToolUse: düzenlenen JS/JSX dosyasını oxlint ile kontrol eder.
// Hata varsa çıkış kodu 2 ile geri bildirim verir; Claude hatayı düzeltir.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const file = String(input.tool_input?.file_path || '');

if (!/\.(m?js|jsx)$/.test(file)) process.exit(0);

const result = spawnSync('npx', ['--no-install', 'oxlint', file], {
  cwd: process.env.CLAUDE_PROJECT_DIR,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(`oxlint ${file}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
process.exit(0);
