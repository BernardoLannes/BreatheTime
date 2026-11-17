const { app, safeStorage, shell } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

/**
 * Integração com o Bitrix24 (processo main).
 * Toda rede e todo segredo ficam aqui; o renderer só fala via IPC.
 */

const OAUTH_TOKEN_URL = 'https://oauth.bitrix.info/oauth/token/';
const OAUTH_CALLBACK_PORT = 53682;
const OAUTH_CALLBACK_PATH = '/bitrix/callback';
const OAUTH_TIMEOUT_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20 * 1000;

// Aplicativo local do Bitrix24 (fixo). O client_secret fica só no processo main e nunca é enviado ao
// renderer nem salvo em disco; ainda assim, quem tiver o executável consegue extraí-lo.
// Segredos vêm de electron/bitrix-secrets.cjs, gerado no build a partir de env/.env (fora do git).
const secrets = require('./bitrix-secrets.cjs');
const BITRIX_PORTAL = 'tdsustentavel.bitrix24.com.br';
const BITRIX_CLIENT_ID = 'local.6af4d0803cba14.88058599';
const BITRIX_CLIENT_SECRET = secrets.BITRIX_CLIENT_SECRET;

// Webhook de entrada fixo, usado para listar as tarefas no seletor de vínculo.
// Ele age como o usuário que o criou (ID 31977), então a lista é sempre a desse usuário.
const BITRIX_WEBHOOK_URL = secrets.BITRIX_WEBHOOK_URL;
const BITRIX_WEBHOOK_USER_ID = Number(secrets.BITRIX_WEBHOOK_USER_ID);

let config = null; // carregado sob demanda
let configLoaded = false;
let pendingOAuthServer = null;

class BitrixError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function authFile() {
  return path.join(app.getPath('userData'), 'bitrix-auth.bin');
}

// Formato do arquivo: 1º byte 'E' = criptografado (safeStorage), 'P' = texto puro (fallback só em Linux).
const MARK_ENCRYPTED = 0x45;
const MARK_PLAIN = 0x50;
let storageInsecure = false;

// Em Linux sem chaveiro (ex.: WSL/dev) o safeStorage não está disponível. Nesse caso — e só em Linux —
// guarda em arquivo com permissão 600 e a interface avisa que não está criptografado.
// No Windows/macOS a credencial nunca é salva sem criptografia.
function plainFallbackAllowed() {
  return process.platform === 'linux';
}

function loadConfig() {
  if (configLoaded) return config;
  configLoaded = true;
  try {
    const file = authFile();
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      const body = buf.subarray(1);
      if (buf[0] === MARK_ENCRYPTED && safeStorage.isEncryptionAvailable()) {
        config = JSON.parse(safeStorage.decryptString(body));
        storageInsecure = false;
      } else if (buf[0] === MARK_PLAIN && plainFallbackAllowed()) {
        config = JSON.parse(body.toString('utf8'));
        storageInsecure = true;
      }
    }
  } catch {
    config = null; // arquivo corrompido ou de outro usuário do SO
  }
  // Credenciais de webhook (versões anteriores) não são mais suportadas: exige novo login
  if (config && config.mode !== 'oauth') config = null;
  return config;
}

function saveConfig(next) {
  let payload;
  if (safeStorage.isEncryptionAvailable()) {
    payload = Buffer.concat([
      Buffer.from([MARK_ENCRYPTED]),
      safeStorage.encryptString(JSON.stringify(next)),
    ]);
    storageInsecure = false;
  } else if (plainFallbackAllowed()) {
    payload = Buffer.concat([
      Buffer.from([MARK_PLAIN]),
      Buffer.from(JSON.stringify(next), 'utf8'),
    ]);
    storageInsecure = true;
  } else {
    throw new BitrixError(
      'no_secure_storage',
      'O armazenamento seguro do sistema não está disponível; não é possível salvar a credencial.'
    );
  }
  fs.writeFileSync(authFile(), payload, { mode: 0o600 });
  config = next;
  configLoaded = true;
}

function clearConfig() {
  config = null;
  configLoaded = true;
  try {
    fs.rmSync(authFile(), { force: true });
  } catch {
    /* ignore */
  }
}

async function fetchJson(url, init) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (e) {
    // Só o código/nome do erro: a URL contém o token de acesso e não deve ir para o log
    console.error('Bitrix fetch failed:', (e && e.cause && e.cause.code) || (e && e.name));
    throw new BitrixError('network', 'Não foi possível conectar ao Bitrix24. Verifique sua conexão.');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* corpo não-JSON */
  }
  return { res, body };
}

async function exchangeToken(params) {
  const url = `${OAUTH_TOKEN_URL}?${new URLSearchParams(params).toString()}`;
  const { body } = await fetchJson(url, { method: 'GET' });
  if (!body || body.error || !body.access_token) {
    throw new BitrixError(
      'auth',
      (body && body.error_description) || 'Falha ao obter token de acesso do Bitrix24.'
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000,
    endpoint: body.client_endpoint || null,
  };
}

async function refreshOAuth() {
  const c = loadConfig();
  const t = await exchangeToken({
    grant_type: 'refresh_token',
    client_id: BITRIX_CLIENT_ID,
    client_secret: BITRIX_CLIENT_SECRET,
    refresh_token: c.refreshToken,
  });
  saveConfig({
    ...c,
    accessToken: t.accessToken,
    refreshToken: t.refreshToken || c.refreshToken,
    expiresAt: t.expiresAt,
    endpoint: t.endpoint || c.endpoint,
  });
}

/** Chama um método REST. Em OAuth renova o token se expirou (uma tentativa). */
async function call(method, params = {}, retried = false) {
  const c = loadConfig();
  if (!c) throw new BitrixError('not_connected', 'Bitrix24 não conectado.');

  if (Date.now() > c.expiresAt - 60 * 1000) {
    await refreshOAuth();
    return call(method, params, retried);
  }
  const base = c.endpoint || `https://${c.portal}/rest/`;
  const url = `${base}${method}.json?auth=${encodeURIComponent(c.accessToken)}`;

  const { res, body } = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (body && body.error) {
    const err = String(body.error);
    if (!retried && (err === 'expired_token' || err === 'invalid_token')) {
      await refreshOAuth();
      return call(method, params, true);
    }
    if (['expired_token', 'invalid_token', 'INVALID_CREDENTIALS', 'WRONG_AUTH_TYPE'].includes(err)) {
      throw new BitrixError('auth', 'Credencial inválida ou revogada. Reconecte ao Bitrix24.');
    }
    if (err === 'insufficient_scope' || err === 'ACCESS_DENIED') {
      throw new BitrixError('forbidden', 'Sem permissão para esta operação no Bitrix24.');
    }
    throw new BitrixError('api', body.error_description || err);
  }
  if (!res.ok || !body) {
    throw new BitrixError('api', `Resposta inesperada do Bitrix24 (HTTP ${res.status}).`);
  }
  return body;
}

/** Chama um método REST pelo webhook de entrada fixo. */
async function callWebhook(method, params = {}) {
  const { res, body } = await fetchJson(`${BITRIX_WEBHOOK_URL}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (body && body.error) {
    const err = String(body.error);
    if (['INVALID_CREDENTIALS', 'WRONG_AUTH_TYPE', 'expired_token', 'invalid_token'].includes(err)) {
      throw new BitrixError('webhook', 'O webhook do Bitrix24 é inválido ou foi revogado.');
    }
    const detail = [err, body.error_description].filter(Boolean).join(': ');
    if (err === 'insufficient_scope' || err === 'ACCESS_DENIED') {
      throw new BitrixError(
        'forbidden',
        `Sem permissão no Bitrix24 para ${method} (${detail}). Verifique o escopo "task" do webhook e se o usuário dele participa da tarefa.`
      );
    }
    throw new BitrixError('api', detail);
  }
  if (!res.ok || !body) {
    throw new BitrixError('api', `Resposta inesperada do Bitrix24 (HTTP ${res.status}).`);
  }
  return body;
}

async function fetchCurrentUser() {
  const body = await call('user.current');
  const u = body.result || {};
  const name = [u.NAME, u.LAST_NAME].filter(Boolean).join(' ') || `Usuário ${u.ID}`;
  return { id: Number(u.ID), name };
}

function publicStatus() {
  const c = loadConfig();
  if (!c) return { connected: false };
  return {
    connected: true,
    portal: c.portal,
    user: c.user,
    insecureStorage: storageInsecure,
  };
}

function waitForOAuthCode(expectedState) {
  return new Promise((resolve, reject) => {
    if (pendingOAuthServer) pendingOAuthServer.close();
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://127.0.0.1:${OAUTH_CALLBACK_PORT}`);
      if (u.pathname !== OAUTH_CALLBACK_PATH) {
        res.writeHead(404).end();
        return;
      }
      const code = u.searchParams.get('code');
      const ok = code && u.searchParams.get('state') === expectedState;
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        ok
          ? '<h3>BreatheTime conectado ao Bitrix24. Você já pode fechar esta aba.</h3>'
          : '<h3>Falha na autorização. Volte ao BreatheTime e tente novamente.</h3>'
      );
      clearTimeout(timer);
      server.close();
      pendingOAuthServer = null;
      ok ? resolve(code) : reject(new BitrixError('auth', 'Autorização negada ou inválida.'));
    });
    const timer = setTimeout(() => {
      server.close();
      pendingOAuthServer = null;
      reject(new BitrixError('timeout', 'Tempo esgotado aguardando a autorização no navegador.'));
    }, OAUTH_TIMEOUT_MS);
    server.on('error', () => {
      clearTimeout(timer);
      pendingOAuthServer = null;
      reject(new BitrixError('oauth_port', `A porta ${OAUTH_CALLBACK_PORT} está em uso.`));
    });
    server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      pendingOAuthServer = server;
    });
  });
}

async function login(onAuthUrl) {
  const previous = loadConfig();
  const state = require('crypto').randomBytes(16).toString('hex');
  const codePromise = waitForOAuthCode(state);
  const authUrl =
    `https://${BITRIX_PORTAL}/oauth/authorize/?` +
    new URLSearchParams({ client_id: BITRIX_CLIENT_ID, response_type: 'code', state }).toString();
  // Sempre entrega o link à interface: em ambientes sem navegador (ex.: WSL) o usuário o abre manualmente
  if (onAuthUrl) onAuthUrl(authUrl);
  shell.openExternal(authUrl).catch(() => {
    /* sem navegador padrão: o link exibido na tela cobre este caso */
  });

  const code = await codePromise;
  const t = await exchangeToken({
    grant_type: 'authorization_code',
    client_id: BITRIX_CLIENT_ID,
    client_secret: BITRIX_CLIENT_SECRET,
    code,
  });
  config = {
    mode: 'oauth',
    portal: BITRIX_PORTAL,
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    expiresAt: t.expiresAt,
    endpoint: t.endpoint,
  };
  try {
    const user = await fetchCurrentUser();
    saveConfig({ ...config, user });
  } catch (e) {
    config = previous;
    throw e;
  }
  return publicStatus();
}

/** Tarefas abertas em que o usuário é responsável, participante ou criador. */
async function listTasks() {
  // A listagem usa o webhook fixo (age como o usuário dono do webhook), sem exigir login
  const uid = BITRIX_WEBHOOK_USER_ID;

  const fetchRole = async (field) => {
    const out = [];
    let start = 0;
    for (let page = 0; page < 4; page += 1) {
      const body = await callWebhook('tasks.task.list', {
        filter: { [field]: uid, '<REAL_STATUS': 5 },
        select: ['ID', 'TITLE', 'STATUS', 'GROUP_ID'],
        order: { ID: 'desc' },
        start,
      });
      const tasks = (body.result && body.result.tasks) || [];
      out.push(...tasks);
      if (body.next == null) break;
      start = body.next;
    }
    return out;
  };

  const lists = await Promise.all(
    ['RESPONSIBLE_ID', 'ACCOMPLICE', 'CREATED_BY'].map(fetchRole)
  );
  const byId = new Map();
  lists.flat().forEach((t) => {
    const id = Number(t.id);
    if (!byId.has(id)) byId.set(id, { id, title: String(t.title || `Tarefa ${id}`) });
  });
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

async function logTime({ taskId, seconds, comment }) {
  const id = Number(taskId);
  const secs = Math.round(Number(seconds));
  if (!Number.isInteger(id) || id <= 0) {
    throw new BitrixError('invalid_input', 'Tarefa Bitrix inválida.');
  }
  if (!Number.isFinite(secs) || secs <= 0) {
    throw new BitrixError('invalid_input', 'Não há tempo para lançar.');
  }
  // Usa o webhook (que tem o escopo "task"); o tempo fica registrado em nome do dono do webhook
  await callWebhook('task.elapseditem.add', {
    TASKID: id,
    ARFIELDS: { SECONDS: secs, COMMENT_TEXT: String(comment || '').slice(0, 2000) },
  });
  return { seconds: secs };
}

/** Converte exceções em resultado serializável para o renderer. */
async function wrap(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const code = e instanceof BitrixError ? e.code : 'unknown';
    const message = e instanceof BitrixError ? e.message : 'Erro inesperado ao falar com o Bitrix24.';
    if (!(e instanceof BitrixError)) console.error('Bitrix error:', e && e.message);
    return { ok: false, code, message };
  }
}

function registerBitrixIpc(ipcMain) {
  ipcMain.handle('bitrix:get-status', () => wrap(async () => publicStatus()));
  ipcMain.handle('bitrix:login', (e) =>
    wrap(() =>
      login((url) => {
        if (!e.sender.isDestroyed()) e.sender.send('bitrix:oauth-url', url);
      })
    )
  );
  ipcMain.handle('bitrix:disconnect', () =>
    wrap(async () => {
      clearConfig();
      return publicStatus();
    })
  );
  ipcMain.handle('bitrix:list-tasks', () => wrap(listTasks));
  ipcMain.handle('bitrix:log-time', (_e, payload) => wrap(() => logTime(payload || {})));
}

module.exports = { registerBitrixIpc };
