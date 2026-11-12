// Gera electron/bitrix-secrets.cjs (ignorado pelo git) a partir de variáveis de ambiente ou do .env.
// Rodado automaticamente antes de `npm run build` e `npm run dev` (hooks prebuild/predev).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const KEYS = ['BITRIX_CLIENT_SECRET', 'BITRIX_WEBHOOK_URL', 'BITRIX_WEBHOOK_USER_ID'];

const fromFile = {};
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) fromFile[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const values = {};
const missing = [];
for (const k of KEYS) {
  const v = process.env[k] || fromFile[k];
  if (v) values[k] = v;
  else missing.push(k);
}

if (missing.length) {
  console.error(
    `Faltam credenciais do Bitrix: ${missing.join(', ')}.\n` +
      'Defina como variáveis de ambiente (ou secrets no CI) ou no arquivo .env (veja .env.example).'
  );
  process.exit(1);
}

const out = `// GERADO por scripts/gen-bitrix-secrets.cjs — não editar nem commitar.
module.exports = ${JSON.stringify(values, null, 2)};
`;
fs.writeFileSync(path.join(root, 'electron', 'bitrix-secrets.cjs'), out);
console.log('electron/bitrix-secrets.cjs gerado.');
