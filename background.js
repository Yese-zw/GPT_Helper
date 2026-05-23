const CHATGPT_URL = 'https://chatgpt.com/';
const OPENAI_SIGNUP_URL = 'https://auth.openai.com/create-account';
const OPENAI_AUTH_SOURCE = 'openai-auth';
const OPENAI_SCRIPT = ['content/openai-flow.js'];
const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/Yese-zw/GPT_Helper/releases/latest';
const COOKIE_CLEAR_URLS = [
  'https://chatgpt.com/',
  'https://auth.openai.com/',
  'https://auth0.openai.com/',
  'https://accounts.openai.com/',
  'https://platform.openai.com/',
  'https://openai.com/',
];
const SUB2API_OPENAI_SUPPORTED_MODELS = [
  'gpt-5.2',
  'gpt-5.2-2025-12-11',
  'gpt-5.2-chat-latest',
  'gpt-5.2-pro',
  'gpt-5.2-pro-2025-12-11',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-2026-03-05',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'codex-auto-review',
  'gpt-4o-audio-preview',
  'gpt-4o-realtime-preview',
  'gpt-image-1',
  'gpt-image-1.5',
  'gpt-image-2',
];
const SETTINGS_KEYS = [
  'codex2apiUrl',
  'codex2apiAdminKey',
  'emails',
  'email',
  'phonePool',
  'phone',
  'phoneCodeUrl',
  'password',
  'sub2apiUrl',
  'sub2apiAdminKey',
  'sub2apiOpenAiGroup',
  'sub2apiRedirectUri',
  'jsonImportSub2apiUrl',
  'jsonImportSub2apiAdminKey',
  'jsonImportSub2apiOpenAiGroup',
  'jsonImportDirectoryName',
];

const EXPORT_SETTINGS_KEYS = [
  'emails',
  'email',
  'phonePool',
  'phone',
  'phoneCodeUrl',
  'password',
  'sub2apiUrl',
  'sub2apiAdminKey',
  'sub2apiOpenAiGroup',
  'sub2apiRedirectUri',
  'jsonImportSub2apiUrl',
  'jsonImportSub2apiAdminKey',
  'jsonImportSub2apiOpenAiGroup',
  'jsonImportDirectoryName',
];

const DEFAULT_STATE = {
  codex2apiUrl: '',
  codex2apiAdminKey: '',
  emails: '',
  email: '',
  emailIndex: 0,
  phonePool: '',
  phone: '',
  phoneCodeUrl: '',
  lastPhoneCode: '',
  password: '',
  sub2apiUrl: '',
  sub2apiAdminKey: '',
  sub2apiOpenAiGroup: 'OpenAI',
  sub2apiRedirectUri: 'http://localhost:1455/auth/callback',
  jsonImportSub2apiUrl: '',
  jsonImportSub2apiAdminKey: '',
  jsonImportSub2apiOpenAiGroup: 'OpenAI',
  jsonImportDirectoryName: '',
  sub2apiOAuthUrl: '',
  sub2apiSessionId: '',
  sub2apiOAuthState: '',
  sub2apiGroupId: '',
  sub2apiCallbackUrl: '',
  oauthUrl: '',
  codex2apiSessionId: '',
  codex2apiOAuthState: '',
  localhostUrl: '',
  autoFlowRoundStartedAt: 0,
  currentStatus: '等待开始',
  autoFlowStopped: false,
  stepStatuses: {},
  logs: [],
  tabIds: {},
};

const STEP_LABELS = {
  'open-chatgpt': '打开 ChatGPT 官网',
  'submit-email': '填写邮箱和密码',
  'email-code-sent': '发送邮箱验证码',
  'manual-email-code': '输入邮箱验证码',
  'fill-profile': '确认注册完成',
  'oauth-login': '登录 Codex',
  'phone-check': '检测手机号流程',
  'phone-verification': '绑定手机号',
  'phone-code-fetch': '获取短信验证码',
  'phone-code-submit': '提交短信验证码',
  'manual-phone-code': '手动输入短信验证码',
  'confirm-oauth': '确认 OAuth',
  'codex2api-callback': 'Codex2API 回调',
  'sub2api-generate-openai-oauth': 'SUB2API 生成 OpenAI 授权链接',
  'sub2api-create-openai-account': 'SUB2API 回填授权并添加账号',
  'cleanup-cookies': '清理 Cookies',
  'close-current-tab': '关闭当前标签页',
  'prepare-next-run': '准备下一轮',
};

async function getState() {
  const data = await chrome.storage.local.get(['state', 'savedSettings']);
  return {
    ...DEFAULT_STATE,
    ...(data.savedSettings || {}),
    ...(data.state || {}),
    stepStatuses: {
      ...(data.state?.stepStatuses || {}),
    },
    logs: Array.isArray(data.state?.logs) ? data.state.logs : [],
    tabIds: {
      ...(data.state?.tabIds || {}),
    },
  };
}

async function setState(patch) {
  const current = await getState();
  const replaceStepStatuses = Object.prototype.hasOwnProperty.call(patch, 'stepStatuses')
    && Object.keys(patch.stepStatuses || {}).length === 0;
  const replaceLogs = Object.prototype.hasOwnProperty.call(patch, 'logs')
    && Array.isArray(patch.logs)
    && patch.logs.length === 0;
  const replaceTabIds = Object.prototype.hasOwnProperty.call(patch, 'tabIds')
    && Object.keys(patch.tabIds || {}).length === 0;
  const next = {
    ...current,
    ...patch,
    stepStatuses: replaceStepStatuses ? {} : {
      ...current.stepStatuses,
      ...(patch.stepStatuses || {}),
    },
    logs: replaceLogs ? [] : (patch.logs || current.logs),
    tabIds: replaceTabIds ? {} : {
      ...current.tabIds,
      ...(patch.tabIds || {}),
    },
  };
  const settingsPatch = SETTINGS_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      acc[key] = next[key];
    }
    return acc;
  }, {});
  const update = { state: next };
  if (Object.keys(settingsPatch).length > 0) {
    update.savedSettings = {
      ...SETTINGS_KEYS.reduce((acc, key) => {
        acc[key] = current[key] || '';
        return acc;
      }, {}),
      ...settingsPatch,
    };
  }
  await chrome.storage.local.set(update);
  chrome.runtime.sendMessage({ type: 'STATE_UPDATED', state: next }).catch(() => {});
  return next;
}

async function exportSettings() {
  const state = await getState();
  return EXPORT_SETTINGS_KEYS.reduce((acc, key) => {
    acc[key] = state[key] || '';
    return acc;
  }, {});
}

async function importSettings(settings = {}) {
  const patch = EXPORT_SETTINGS_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      acc[key] = String(settings[key] || '').trim();
    }
    return acc;
  }, {});
  if (!patch.phonePool && patch.phone && patch.phoneCodeUrl) {
    patch.phonePool = `${patch.phone}----${patch.phoneCodeUrl}`;
  }
  if (!patch.jsonImportSub2apiUrl && patch.sub2apiUrl) {
    patch.jsonImportSub2apiUrl = patch.sub2apiUrl;
  }
  if (!patch.jsonImportSub2apiAdminKey && patch.sub2apiAdminKey) {
    patch.jsonImportSub2apiAdminKey = patch.sub2apiAdminKey;
  }
  return setState(patch);
}

function extractVersion(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+){0,3})/);
  return match ? match[1] : '';
}

function compareVersions(left, right) {
  const leftParts = extractVersion(left).split('.').map((item) => Number(item || 0));
  const rightParts = extractVersion(right).split('.').map((item) => Number(item || 0));
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

async function checkLatestRelease() {
  const currentVersion = chrome.runtime.getManifest().version;
  const response = await fetch(GITHUB_LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`检查 GitHub Release 失败：HTTP ${response.status}`);
  }
  const release = await response.json();
  const latestVersion = extractVersion(release.tag_name || release.name || '');
  return {
    currentVersion,
    latestVersion,
    hasUpdate: latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false,
    tagName: release.tag_name || '',
    title: release.name || release.tag_name || '最新版本',
    body: release.body || '',
    url: release.html_url || 'https://github.com/Yese-zw/GPT_Helper/releases/latest',
    publishedAt: release.published_at || '',
  };
}

async function resetFlowRuntime() {
  return setState({
    stepStatuses: {},
    oauthUrl: '',
    codex2apiSessionId: '',
    codex2apiOAuthState: '',
    localhostUrl: '',
    lastPhoneCode: '',
    autoFlowRoundStartedAt: 0,
    sub2apiOAuthUrl: '',
    sub2apiSessionId: '',
    sub2apiOAuthState: '',
    sub2apiGroupId: '',
    sub2apiCallbackUrl: '',
    currentStatus: '等待开始',
    autoFlowStopped: false,
    logs: [],
    tabIds: {},
  });
}

async function resetFlowForNextRun() {
  return setState({
    stepStatuses: {},
    oauthUrl: '',
    codex2apiSessionId: '',
    codex2apiOAuthState: '',
    localhostUrl: '',
    lastPhoneCode: '',
    autoFlowRoundStartedAt: 0,
    sub2apiOAuthUrl: '',
    sub2apiSessionId: '',
    sub2apiOAuthState: '',
    sub2apiGroupId: '',
    sub2apiCallbackUrl: '',
    currentStatus: '准备下一轮',
    autoFlowStopped: false,
  });
}

async function addLog(message, level = 'info') {
  const current = await getState();
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const prefix = level === 'error' ? 'ERROR' : level === 'ok' ? 'OK' : level.toUpperCase();
  return setState({
    logs: [...current.logs, `[${now}] [${prefix}] ${message}`].slice(-300),
  });
}

function formatElapsedDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

async function logAutoFlowRoundCompletedOnce() {
  const state = await getState();
  const startedAt = Number(state.autoFlowRoundStartedAt || 0);
  if (!startedAt) {
    return;
  }

  const emails = resolveEmailList(state);
  const total = Math.max(1, emails.length || 1);
  const index = Math.max(0, Math.min(Number(state.emailIndex || 0), total - 1));
  await addLog(`第 ${index + 1}/${total} 轮完成，耗时 ${formatElapsedDuration(Date.now() - startedAt)}`, 'ok');
  await setState({ autoFlowRoundStartedAt: 0 });
}

async function markStep(stepId, status) {
  return setState({ stepStatuses: { [stepId]: status } });
}

async function setCurrentStatus(status) {
  return setState({ currentStatus: status });
}

function notifyAwaitingEmailCode() {
  chrome.runtime.sendMessage({ type: 'AUTO_FLOW_AWAITING_EMAIL_CODE' }).catch(() => {});
}

async function requestAutoStop() {
  await setState({ autoFlowStopped: true });
  await setCurrentStatus('已请求停止：当前动作结束后暂停全流程');
  await addLog('已请求停止全流程，当前动作结束后会暂停。', 'warn');
  return getState();
}

async function ensureAutoNotStopped() {
  const state = await getState();
  if (state.autoFlowStopped) {
    await setCurrentStatus('已停止：全自动流程已暂停');
    throw new Error('全自动流程已停止。');
  }
}

function getLastActiveStep(state) {
  const order = [
    'open-chatgpt',
    'submit-email',
    'email-code-sent',
    'manual-email-code',
    'fill-profile',
    'sub2api-generate-openai-oauth',
    'oauth-login',
    'confirm-oauth',
    'phone-check',
    'phone-verification',
    'phone-code-fetch',
    'phone-code-submit',
    'sub2api-create-openai-account',
    'cleanup-cookies',
    'close-current-tab',
    'prepare-next-run',
  ];
  const statuses = state.stepStatuses || {};
  const running = order.find((stepId) => statuses[stepId] === 'running');
  if (running) return running;
  for (let index = order.length - 1; index >= 0; index -= 1) {
    if (statuses[order[index]]) return order[index];
  }
  return '';
}

function hasUnfinishedFlow(state) {
  const statuses = state.stepStatuses || {};
  const hasStarted = Object.values(statuses).some(Boolean);
  const imported = statuses['sub2api-create-openai-account'] === 'completed';
  const allDone = statuses['prepare-next-run'] === 'completed' || String(state.currentStatus || '').startsWith('全部完成');
  return hasStarted && !imported && !allDone;
}

async function getFlowResumeInfo() {
  const state = await getState();
  const stepId = getLastActiveStep(state);
  return {
    hasUnfinished: hasUnfinishedFlow(state),
    stepId,
    stepTitle: STEP_LABELS[stepId] || stepId || '未知步骤',
    currentStatus: state.currentStatus || '等待开始',
    state,
  };
}

async function clearOpenAiCookies() {
  let removed = 0;
  for (const url of COOKIE_CLEAR_URLS) {
    const cookies = await chrome.cookies.getAll({ url }).catch(() => []);
    for (const cookie of cookies) {
      const scheme = cookie.secure ? 'https://' : 'http://';
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      const path = cookie.path || '/';
      await chrome.cookies.remove({
        url: `${scheme}${domain}${path}`,
        name: cookie.name,
        storeId: cookie.storeId,
      }).catch(() => null);
      removed += 1;
    }
  }
  return removed;
}

async function closeOpenAiAuthTab() {
  const state = await getState();
  const tabId = Number(state.tabIds?.[OPENAI_AUTH_SOURCE] || 0);
  if (!tabId) return false;
  try {
    await chrome.tabs.remove(tabId);
    await setState({ tabIds: { [OPENAI_AUTH_SOURCE]: 0 } });
    return true;
  } catch {
    return false;
  }
}

async function openFreshOpenAiTab() {
  const tab = await chrome.tabs.create({ url: CHATGPT_URL, active: true });
  await setState({ tabIds: { [OPENAI_AUTH_SOURCE]: tab.id } });
  return tab.id;
}

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    throw new Error('请先填写 Codex2API 地址。');
  }
  const parsed = new URL(value);
  return parsed.origin;
}

function normalizeSub2ApiUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    throw new Error('请先填写 SUB2API 地址。');
  }
  return new URL(value).origin;
}

function getErrorMessage(payload, responseStatus = 500) {
  return [payload?.error, payload?.message, payload?.detail, payload?.reason]
    .map((value) => String(value || '').trim())
    .find(Boolean) || `Codex2API 请求失败（HTTP ${responseStatus}）。`;
}

function getSub2ApiErrorMessage(payload, responseStatus = 500) {
  return [payload?.error, payload?.message, payload?.detail, payload?.reason]
    .map((value) => String(value || '').trim())
    .find(Boolean) || `SUB2API 请求失败（HTTP ${responseStatus}）。`;
}

async function requestJson(origin, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 30000);
  try {
    const response = await fetch(`${origin}${path}`, {
      method: options.method || 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Admin-Key': String(options.adminKey || '').trim(),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, response.status));
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Codex2API 请求超时，请稍后重试。');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function requestSub2ApiJson(origin, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 30000);
  try {
    const response = await fetch(`${origin}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': String(options.adminKey || '').trim(),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
      if (Number(payload.code) === 0) {
        return payload.data;
      }
      throw new Error(getSub2ApiErrorMessage(payload, response.status));
    }
    if (!response.ok) {
      throw new Error(getSub2ApiErrorMessage(payload, response.status));
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`SUB2API 请求超时：${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractStateFromAuthUrl(authUrl) {
  try {
    return new URL(authUrl).searchParams.get('state') || '';
  } catch {
    return '';
  }
}

async function createOrUpdateTab(source, url) {
  const state = await getState();
  const existingId = Number(state.tabIds?.[source] || 0);
  if (existingId > 0) {
    try {
      const tab = await chrome.tabs.get(existingId);
      if (tab?.id) {
        await chrome.tabs.update(existingId, { url, active: true });
        return existingId;
      }
    } catch {
      // Tab no longer exists.
    }
  }

  const tab = await chrome.tabs.create({ url, active: true });
  await setState({ tabIds: { [source]: tab.id } });
  return tab.id;
}

async function ensureOpenAiTab(url) {
  const tabId = await createOrUpdateTab(OPENAI_AUTH_SOURCE, url);
  await waitForTabComplete(tabId, 45000);
  await injectOpenAiScript(tabId);
  return tabId;
}

async function ensureExistingOpenAiTab(fallbackUrl) {
  const state = await getState();
  const existingId = Number(state.tabIds?.[OPENAI_AUTH_SOURCE] || 0);
  if (existingId > 0) {
    try {
      const tab = await chrome.tabs.get(existingId);
      const parsed = new URL(tab.url || '');
      if (['chatgpt.com', 'auth.openai.com', 'platform.openai.com'].includes(parsed.hostname)) {
        await chrome.tabs.update(existingId, { active: true });
        await injectOpenAiScript(existingId);
        return existingId;
      }
    } catch {
      // Fall back to opening a fresh page below.
    }
  }
  return ensureOpenAiTab(fallbackUrl);
}

async function waitForTabComplete(tabId, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') {
      return tab;
    }
    await sleep(300);
  }
  return chrome.tabs.get(tabId);
}

async function injectOpenAiScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: OPENAI_SCRIPT,
    });
  } catch {
    // The declarative content script may already be present.
  }
}

async function sendToOpenAi(message, timeoutMs = 30000, options = {}) {
  const state = await getState();
  const tabId = Number(state.tabIds?.[OPENAI_AUTH_SOURCE] || 0);
  if (!tabId) {
    throw new Error('认证页标签不存在，请先打开 ChatGPT 或刷新 OAuth。');
  }
  let lastError = null;
  const maxAttempts = options.noRetry ? 1 : 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status !== 'complete' && attempt > 0) {
        await waitForTabComplete(tabId, 3000);
      }
      await injectOpenAiScript(tabId);
      await sleep(attempt === 0 ? 80 : 200 + attempt * 300);
      return await Promise.race([
        chrome.tabs.sendMessage(tabId, message),
        sleep(timeoutMs).then(() => {
          throw new Error('OpenAI 页面脚本响应超时。');
        }),
      ]);
    } catch (error) {
      lastError = error;
      const messageText = String(error?.message || error || '');
      if (options.noRetry || !/Receiving end does not exist|Could not establish connection|message port closed|message channel is closed|extension port/i.test(messageText)) {
        throw error;
      }
      await sleep(350 + attempt * 450);
    }
  }
  throw lastError || new Error('OpenAI 页面脚本连接失败。');
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function generatePassword() {
  const token = crypto.getRandomValues(new Uint32Array(2));
  return `Codex${token[0].toString(36)}!${token[1].toString(36)}aA1`;
}

function validateSettings(state, required = []) {
  for (const key of required) {
    if (!String(state[key] || '').trim()) {
      throw new Error(`请先填写 ${key}。`);
    }
  }
}

function parseEmailList(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveEmailList(state) {
  const list = parseEmailList(state.emails);
  if (list.length > 0) return list;
  return String(state.email || '').trim() ? [String(state.email).trim()] : [];
}

async function selectCurrentEmail(settings = {}) {
  const state = await getState();
  const list = resolveEmailList({ ...state, ...settings });
  if (list.length === 0) {
    throw new Error('请先填写邮箱列表。');
  }
  const baseIndex = settings.resetEmailIndex ? 0 : Number(state.emailIndex || 0);
  const currentIndex = Math.max(0, Math.min(baseIndex, list.length - 1));
  const email = list[currentIndex];
  await setState({
    emails: settings.emails !== undefined ? settings.emails : state.emails,
    email,
    emailIndex: currentIndex,
  });
  return {
    email,
    index: currentIndex,
    total: list.length,
    hasNext: currentIndex < list.length - 1,
  };
}

async function advanceToNextEmail() {
  const state = await getState();
  const list = resolveEmailList(state);
  const nextIndex = Number(state.emailIndex || 0) + 1;
  if (nextIndex >= list.length) {
    return null;
  }
  const email = list[nextIndex];
  await setState({
    email,
    emailIndex: nextIndex,
  });
  return {
    email,
    index: nextIndex,
    total: list.length,
  };
}

function normalizeSmsPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('1') ? digits.slice(1) : digits;
}

function parsePhonePool(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf('----');
      if (separator === -1) {
        return null;
      }
      const phone = line.slice(0, separator).trim();
      const phoneCodeUrl = line.slice(separator + 4).trim();
      return phone && phoneCodeUrl ? { phone, phoneCodeUrl } : null;
    })
    .filter(Boolean);
}

function resolvePhonePool(state) {
  const pool = parsePhonePool(state.phonePool);
  if (pool.length > 0) return pool;
  if (String(state.phone || '').trim() && String(state.phoneCodeUrl || '').trim()) {
    return [{
      phone: String(state.phone).trim(),
      phoneCodeUrl: String(state.phoneCodeUrl).trim(),
    }];
  }
  return [];
}

function resolvePhonePoolForAttempt(state) {
  const pool = resolvePhonePool(state);
  if (pool.length <= 1) return pool;
  const currentPhone = String(state.phone || '').trim();
  const currentIndex = pool.findIndex((item) => item.phone === currentPhone);
  if (currentIndex >= 0 && currentIndex < pool.length - 1) {
    return pool.slice(currentIndex + 1);
  }
  return pool;
}

function buildPhoneCodeUrl(rawUrl, phone) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    throw new Error('请先填写短信验证码接收链接。');
  }
  const encodedPhone = encodeURIComponent(phone);
  let nextUrl = value;
  if (value.includes('{phone}')) {
    nextUrl = value.replaceAll('{phone}', encodedPhone);
  } else if (value.includes('{rawPhone}')) {
    nextUrl = value.replaceAll('{rawPhone}', encodedPhone);
  }
  try {
    const parsed = new URL(nextUrl);
    parsed.searchParams.set('_t', String(Date.now()));
    return parsed.toString();
  } catch {
    return nextUrl;
  }
}

function extractSmsCode(responseText) {
  const text = String(responseText || '').trim();
  if (!text || /暂时没有收到消息|no/i.test(text)) {
    return '';
  }
  if (!/yes/i.test(text)) {
    return '';
  }
  const afterYes = text.replace(/^[\s\S]*?yes/i, '');
  const match = afterYes.match(/\d{4,8}/) || text.match(/\d{4,8}/);
  return match?.[0] || '';
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function waitForPhoneCode(codeUrl, previousCode = '', timeoutMs = 180000, intervalMs = 5000) {
  const startedAt = Date.now();
  let lastText = '';
  while (Date.now() - startedAt < timeoutMs) {
    const parsedUrl = new URL(codeUrl);
    parsedUrl.searchParams.set('_t', String(Date.now()));
    const text = await fetchText(parsedUrl.toString());
    lastText = text;
    const code = extractSmsCode(text);
    if (code && code !== previousCode) {
      return code;
    }
    if (code && code === previousCode) {
      await addLog(`短信验证码仍是上一轮验证码 ${code}，继续等待新验证码。`, 'warn');
    }
    const elapsedMs = Date.now() - startedAt;
    await sleep(elapsedMs < 30000 ? Math.min(intervalMs, 2000) : intervalMs);
  }
  throw new Error(`等待短信验证码超时，最后响应：${String(lastText || '').slice(0, 80)}`);
}

async function submitPhoneAndFetchCodeFromPool(state) {
  const pool = resolvePhonePoolForAttempt(state);
  if (pool.length === 0) {
    throw new Error('请先在手机号池中按“手机号----短信验证码接收链接”每行填写一组。');
  }

  const previousCode = state.lastPhoneCode || '';
  let lastError = null;
  for (let index = 0; index < pool.length; index += 1) {
    const item = pool[index];
    const smsPhone = normalizeSmsPhone(item.phone);
    if (!smsPhone) {
      lastError = new Error(`第 ${index + 1} 个手机号格式无效。`);
      await addLog(lastError.message, 'warn');
      continue;
    }

    let phoneCodeUrl = '';
    try {
      phoneCodeUrl = buildPhoneCodeUrl(item.phoneCodeUrl, smsPhone);
    } catch (error) {
      lastError = error;
      await addLog(`第 ${index + 1} 个接码链接无效：${error.message}`, 'warn');
      continue;
    }

    await setState({
      phone: item.phone,
      phoneCodeUrl: item.phoneCodeUrl,
    });
    await addLog(`正在尝试手机号池第 ${index + 1}/${pool.length} 个号码：${item.phone}`, 'info');

    try {
      await setCurrentStatus(`当前页面：手机号绑定页；操作：尝试第 ${index + 1}/${pool.length} 个号码并发送短信验证码`);
      const result = await sendToOpenAi({
        type: 'SUBMIT_PHONE',
        payload: {
          phone: smsPhone,
        },
      }, 30000);
      if (result?.error) {
        throw new Error(result.error);
      }

      await setCurrentStatus(`当前页面：手机号绑定页；操作：已发送短信，等待第 ${index + 1}/${pool.length} 个号码验证码`);
      await markStep('phone-code-fetch', 'running');
      await addLog(`手机号已提交，开始请求短信验证码接收链接：${smsPhone}`, 'info');
      const phoneCode = await waitForPhoneCode(phoneCodeUrl, previousCode);
      await setState({
        phone: item.phone,
        phoneCodeUrl: item.phoneCodeUrl,
        lastPhoneCode: phoneCode,
      });
      return {
        phone: item.phone,
        smsPhone,
        phoneCodeUrl: item.phoneCodeUrl,
        requestUrl: phoneCodeUrl,
        phoneCode,
      };
    } catch (error) {
      lastError = error;
      await addLog(`手机号池第 ${index + 1}/${pool.length} 个号码失败：${error.message}，准备尝试下一个。`, 'warn');
    }
  }

  await markStep('phone-code-fetch', 'failed');
  throw new Error(`手机号池全部尝试失败：${lastError?.message || '未知错误'}`);
}

function shouldRetrySignupDirectly(error) {
  const message = String(error?.message || error || '');
  return /未找到邮箱输入框|未找到密码输入框|未找到密码页继续按钮|OpenAI 页面脚本响应超时|Receiving end does not exist/i.test(message);
}

function isLikelyNavigationProgress(error) {
  const message = String(error?.message || error || '');
  return /back\/forward cache|message channel is closed|message port closed|extension port/i.test(message);
}

async function detectOpenAiPhaseSafely() {
  try {
    const result = await sendToOpenAi({ type: 'DETECT_OPENAI_PHASE' }, 8000);
    return String(result?.phase || '');
  } catch {
    return '';
  }
}

async function skipSurveyIfPresentSafely() {
  try {
    const result = await sendToOpenAi({ type: 'SKIP_SURVEY_IF_PRESENT' }, 10000, { noRetry: true });
    return Boolean(result?.skipped);
  } catch {
    return false;
  }
}

async function waitForRegistrationCompletionSafely(timeoutMs = 90000) {
  return completeRegistrationAfterEmailSafely(timeoutMs, 'WAIT_REGISTRATION_COMPLETION');
}

async function completeRegistrationAfterEmailSafely(timeoutMs = 90000, messageType = 'COMPLETE_REGISTRATION_AFTER_EMAIL') {
  const startedAt = Date.now();
  let lastResult = null;
  while (Date.now() - startedAt < timeoutMs) {
    const remainingMs = Math.max(5000, timeoutMs - (Date.now() - startedAt));
    let result;
    try {
      result = await sendToOpenAi({
        type: messageType,
        payload: {
          timeoutMs: remainingMs,
          intervalMs: 1200,
          stableCompletionMs: 5000,
        },
      }, remainingMs + 5000);
    } catch (error) {
      if (!isLikelyNavigationProgress(error)) {
        throw error;
      }
      await waitForTabComplete(Number((await getState()).tabIds?.[OPENAI_AUTH_SOURCE] || 0), 45000);
      await sleep(1200);
      continue;
    }
    lastResult = result;
    if (result?.completed) {
      return {
        ...result,
        elapsedMs: Date.now() - startedAt,
      };
    }
    if (result?.navigated) {
      await waitForTabComplete(Number((await getState()).tabIds?.[OPENAI_AUTH_SOURCE] || 0), 45000);
      await sleep(1200);
      continue;
    }
    if (result?.error) {
      throw new Error(result.error);
    }
    await sleep(1200);
  }
  throw new Error(lastResult?.error || `注册尚未完全完成，当前阶段：${lastResult?.phase || 'unknown'}`);
}

function getOAuthEmailLoginLog(phase) {
  switch (phase) {
    case 'account-selected':
      return '已选择当前流程邮箱账号，如页面要求验证码，请点击“手动输入邮箱验证码”。';
    case 'email-submitted':
      return '已输入邮箱并提交，如收到验证码，请点击“手动输入邮箱验证码”。';
    case 'verification':
      return '页面已进入邮箱验证码步骤，请点击“手动输入邮箱验证码”。';
    case 'consent':
      return '页面已进入 OAuth 授权确认步骤，可以继续执行“确认 OAuth”。';
    default:
      return '授权页已打开，请按页面提示继续。';
  }
}

async function confirmOAuthAndImportToSub2Api() {
  let state = await getState();
  await markStep('confirm-oauth', 'running');
  const callback = await clickOauthAndCaptureCallback(state.sub2apiOAuthState || state.codex2apiOAuthState);
  state = await setState({
    localhostUrl: callback.url,
    sub2apiCallbackUrl: callback.url,
  });
  await markStep('confirm-oauth', 'completed');
  await addLog(`已捕获 localhost 回调：${callback.url}`, 'ok');
  await markStep('sub2api-create-openai-account', 'running');
  const createResult = await createSub2ApiOpenAiAccount(state);
  await setState({ sub2apiCallbackUrl: createResult.sub2apiCallbackUrl });
  await markStep('sub2api-create-openai-account', 'completed');
  await addLog(`SUB2API 已完成授权并添加 OpenAI OAuth 账号：${createResult.accountName || createResult.accountId || 'unknown'}`, 'ok');
  await logAutoFlowRoundCompletedOnce();
  await markStep('cleanup-cookies', 'running');
  await setCurrentStatus('最终完成：账号已导入 SUB2API，正在清除 OpenAI/ChatGPT Cookies');
  const removed = await clearOpenAiCookies();
  await markStep('cleanup-cookies', 'completed');
  await addLog(`最终完成：已清除 OpenAI/ChatGPT Cookies（${removed} 个）。`, 'ok');
  await markStep('close-current-tab', 'running');
  await setCurrentStatus('最终完成：Cookies 已清除，正在关闭当前注册标签页');
  const closed = await closeOpenAiAuthTab();
  await markStep('close-current-tab', 'completed');
  await addLog(closed ? '已关闭当前 OpenAI/ChatGPT 注册标签页。' : '未找到可关闭的当前注册标签页。', closed ? 'ok' : 'warn');
  await markStep('prepare-next-run', 'running');
  await setCurrentStatus('最终完成：正在打开新的干净 ChatGPT 标签页，准备下一轮');
  await openFreshOpenAiTab();
  await markStep('prepare-next-run', 'completed');
  await addLog('已打开新的 ChatGPT 标签页，下一轮可更换邮箱后重新开始。', 'ok');
  await setCurrentStatus('最终完成：账号已导入 SUB2API，Cookies 已清除，新标签页已打开');
  const nextEmail = await advanceToNextEmail();
  if (nextEmail) {
    await addLog(`检测到下一个邮箱：${nextEmail.email}（${nextEmail.index + 1}/${nextEmail.total}），自动启动下一轮。`, 'info');
    await setCurrentStatus(`准备下一轮：${nextEmail.email}（${nextEmail.index + 1}/${nextEmail.total}）`);
    await resetFlowForNextRun();
    setTimeout(() => {
      runAutoFlow({}).catch((error) => addLog(`自动启动下一轮失败：${error.message}`, 'error'));
    }, 1200);
    return { preparedNextRun: true };
  } else {
    await addLog('邮箱列表已全部处理完成。', 'ok');
    await setCurrentStatus('全部完成：邮箱列表已全部处理完成');
  }
  return { preparedNextRun: false };
}

async function generateCodex2ApiOAuth(state) {
  const origin = normalizeUrl(state.codex2apiUrl);
  const adminKey = String(state.codex2apiAdminKey || '').trim();
  if (!adminKey) {
    throw new Error('请先填写 Codex2API Admin Key。');
  }

  const result = await requestJson(origin, '/api/admin/oauth/generate-auth-url', {
    adminKey,
    method: 'POST',
    body: {},
  });
  const oauthUrl = String(result.auth_url || result.authUrl || '').trim();
  const sessionId = String(result.session_id || result.sessionId || '').trim();
  if (!oauthUrl || !sessionId) {
    throw new Error('Codex2API 未返回有效的 auth_url 或 session_id。');
  }
  return {
    oauthUrl,
    codex2apiSessionId: sessionId,
    codex2apiOAuthState: extractStateFromAuthUrl(oauthUrl),
  };
}

async function getSub2ApiOpenAiGroupId(origin, adminKey, groupName) {
  const targetName = String(groupName || 'OpenAI').trim() || 'OpenAI';
  const groups = await requestSub2ApiJson(origin, '/api/v1/admin/groups/all', {
    method: 'GET',
    adminKey,
  });
  const list = Array.isArray(groups) ? groups : [];
  const matched = list.find((group) => {
    const name = String(group?.name || '').trim().toLowerCase();
    const platform = String(group?.platform || '').trim().toLowerCase();
    return name === targetName.toLowerCase() && platform === 'openai';
  });
  if (!matched?.id) {
    throw new Error(`SUB2API 未找到 OpenAI 分组：${targetName}`);
  }
  return Number(matched.id);
}

async function listSub2ApiOpenAiGroups(state) {
  validateSettings(state, ['sub2apiUrl', 'sub2apiAdminKey']);
  const origin = normalizeSub2ApiUrl(state.sub2apiUrl);
  const adminKey = String(state.sub2apiAdminKey || '').trim();
  const groups = await requestSub2ApiJson(origin, '/api/v1/admin/groups/all', {
    method: 'GET',
    adminKey,
  });
  const list = Array.isArray(groups) ? groups : [];
  return list
    .filter((group) => {
      const platform = String(group?.platform || '').trim().toLowerCase();
      return platform === 'openai';
    })
    .map((group) => ({
      id: Number(group.id),
      name: String(group.name || '').trim(),
      platform: String(group.platform || '').trim(),
    }))
    .filter((group) => group.id && group.name);
}

async function generateSub2ApiOpenAiOAuth(state) {
  validateSettings(state, ['sub2apiUrl', 'sub2apiAdminKey']);
  const origin = normalizeSub2ApiUrl(state.sub2apiUrl);
  const adminKey = String(state.sub2apiAdminKey || '').trim();
  const redirectUri = String(state.sub2apiRedirectUri || DEFAULT_STATE.sub2apiRedirectUri).trim() || DEFAULT_STATE.sub2apiRedirectUri;
  const groupId = await getSub2ApiOpenAiGroupId(origin, adminKey, state.sub2apiOpenAiGroup);
  const result = await requestSub2ApiJson(origin, '/api/v1/admin/openai/generate-auth-url', {
    method: 'POST',
    adminKey,
    body: {
      redirect_uri: redirectUri,
    },
  });
  const oauthUrl = String(result?.auth_url || result?.authUrl || '').trim();
  const sessionId = String(result?.session_id || result?.sessionId || '').trim();
  const oauthState = String(result?.state || extractStateFromAuthUrl(oauthUrl)).trim();
  if (!oauthUrl || !sessionId || !oauthState) {
    throw new Error('SUB2API 未返回完整 auth_url / session_id / state。');
  }
  return {
    sub2apiOAuthUrl: oauthUrl,
    sub2apiSessionId: sessionId,
    sub2apiOAuthState: oauthState,
    sub2apiGroupId: groupId,
  };
}

async function createSub2ApiOpenAiAccount(state) {
  validateSettings(state, ['sub2apiUrl', 'sub2apiAdminKey', 'sub2apiSessionId', 'sub2apiOAuthState']);
  const submittedCallback = String(state.sub2apiCallbackUrl || state.localhostUrl || '').trim();
  const callback = parseSub2ApiCallbackOrCode(submittedCallback, state.sub2apiOAuthState);
  if (state.sub2apiOAuthState && callback.state !== state.sub2apiOAuthState) {
    throw new Error('SUB2API OAuth 回调 state 与当前授权会话不匹配。');
  }
  const origin = normalizeSub2ApiUrl(state.sub2apiUrl);
  const adminKey = String(state.sub2apiAdminKey || '').trim();
  const groupId = Number(state.sub2apiGroupId) || await getSub2ApiOpenAiGroupId(origin, adminKey, state.sub2apiOpenAiGroup);
  const redirectUri = String(state.sub2apiRedirectUri || DEFAULT_STATE.sub2apiRedirectUri).trim() || DEFAULT_STATE.sub2apiRedirectUri;
  const notes = buildSub2ApiAccountNotes(state);
  const result = await requestSub2ApiJson(origin, '/api/v1/admin/openai/create-from-oauth', {
    method: 'POST',
    adminKey,
    timeoutMs: 60000,
    body: {
      session_id: state.sub2apiSessionId,
      code: callback.code,
      state: callback.state,
      redirect_uri: redirectUri,
      name: String(state.email || '').trim(),
      concurrency: 10,
      priority: 50,
      group_ids: [groupId],
    },
  });
  if (result?.id && notes) {
    try {
      await updateSub2ApiAccountNotes(origin, adminKey, Number(result.id), notes);
    } catch (error) {
      await addLog(`账号已创建，但备注手机号/接码链接更新失败：${error.message}`, 'warn');
    }
  }
  if (result?.id) {
    try {
      const synced = await syncSub2ApiAccountLatestSupportedModels(origin, adminKey, Number(result.id));
      await addLog(`SUB2API 已同步账号最新支持模型：${synced.models.length} 个。`, 'ok');
    } catch (error) {
      await addLog(`账号已创建，但同步最新支持模型失败：${error.message}`, 'warn');
    }
  }
  return {
    sub2apiCallbackUrl: callback.url || submittedCallback,
    accountId: result?.id,
    accountName: result?.name,
  };
}

async function syncSub2ApiAccountLatestSupportedModels(origin, adminKey, accountId) {
  const models = SUB2API_OPENAI_SUPPORTED_MODELS
    .map((model) => String(model || '').trim())
    .filter(Boolean);
  if (models.length === 0) {
    throw new Error('内置支持模型列表为空。');
  }
  const modelMapping = models.reduce((acc, model) => {
    acc[model] = model;
    return acc;
  }, {});
  await requestSub2ApiJson(origin, `/api/v1/admin/accounts/${accountId}`, {
    method: 'PUT',
    adminKey,
    timeoutMs: 30000,
    body: {
      credentials: {
        model_mapping: modelMapping,
      },
    },
  });
  return {
    models,
    modelMapping,
  };
}

function buildSub2ApiAccountNotes(state) {
  const phone = String(state.phone || '').trim();
  const phoneCodeUrl = String(state.phoneCodeUrl || '').trim();
  const parts = [];
  if (phone) parts.push(`手机号：${phone}`);
  if (phoneCodeUrl) parts.push(`接码链接：${phoneCodeUrl}`);
  return parts.join('\n');
}

async function updateSub2ApiAccountNotes(origin, adminKey, accountId, notes) {
  if (!accountId || !notes) return;
  await requestSub2ApiJson(origin, `/api/v1/admin/accounts/${accountId}`, {
    method: 'PUT',
    adminKey,
    timeoutMs: 30000,
    body: {
      notes,
    },
  });
}

function buildSub2ApiLatestModelMapping() {
  return SUB2API_OPENAI_SUPPORTED_MODELS
    .map((model) => String(model || '').trim())
    .filter(Boolean)
    .reduce((acc, model) => {
      acc[model] = model;
      return acc;
    }, {});
}

async function importSub2ApiCodexJsonAccount(state, payload = {}) {
  validateSettings(state, ['sub2apiUrl', 'sub2apiAdminKey']);
  const origin = normalizeSub2ApiUrl(state.sub2apiUrl);
  const adminKey = String(state.sub2apiAdminKey || '').trim();
  const accountName = String(payload.name || payload.email || '').trim();
  const content = String(payload.content || '').trim();
  if (!accountName) {
    throw new Error('缺少账号名称。');
  }
  if (!content) {
    throw new Error(`账号 ${accountName} 缺少导入内容。`);
  }
  const groupName = String(state.jsonImportSub2apiOpenAiGroup || state.sub2apiOpenAiGroup || 'OpenAI').trim();
  const groupId = await getSub2ApiOpenAiGroupId(origin, adminKey, groupName);
  const result = await requestSub2ApiJson(origin, '/api/v1/admin/accounts/import/codex-session', {
    method: 'POST',
    adminKey,
    timeoutMs: 60000,
    body: {
      content,
      name: accountName,
      concurrency: 10,
      priority: 50,
      group_ids: [groupId],
      credential_extras: {
        model_mapping: buildSub2ApiLatestModelMapping(),
      },
      update_existing: true,
    },
  });
  return {
    ...(result || {}),
    accountName,
  };
}

function isLocalhostCallback(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
      && parsed.searchParams.has('code')
      && parsed.searchParams.has('state');
  } catch {
    return false;
  }
}

function parseCallback(rawUrl) {
  const parsed = new URL(rawUrl);
  const code = parsed.searchParams.get('code') || '';
  const state = parsed.searchParams.get('state') || '';
  if (!code || !state) {
    throw new Error('localhost 回调缺少 code 或 state。');
  }
  return {
    url: parsed.toString(),
    code,
    state,
  };
}

function parseSub2ApiCallbackOrCode(rawValue, expectedState) {
  const value = String(rawValue || '').trim();
  if (!value) {
    throw new Error('请回填授权完成后的 localhost 回调链接或 code。');
  }
  try {
    return parseCallback(value);
  } catch (error) {
    if (/^[A-Za-z0-9._~-]+$/.test(value) && expectedState) {
      return {
        url: '',
        code: value,
        state: expectedState,
      };
    }
    throw error;
  }
}

async function waitForLocalhostCallback(tabId, expectedState, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('等待 localhost OAuth 回调超时。'));
    }, timeoutMs);

    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      chrome.webNavigation.onCommitted.removeListener(onCommitted);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };

    const tryResolve = (url) => {
      if (!isLocalhostCallback(url)) return;
      const callback = parseCallback(url);
      if (expectedState && callback.state !== expectedState) {
        cleanup();
        reject(new Error('OAuth 回调 state 与 Codex2API 会话不匹配。'));
        return;
      }
      cleanup();
      resolve(callback);
    };

    const onCommitted = (details) => {
      if (details.tabId === tabId) {
        tryResolve(details.url || '');
      }
    };
    const onUpdated = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId) {
        tryResolve(changeInfo.url || tab.url || '');
      }
    };

    chrome.webNavigation.onCommitted.addListener(onCommitted);
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function clickOauthAndCaptureCallback(expectedState) {
  const state = await getState();
  const tabId = Number(state.tabIds?.[OPENAI_AUTH_SOURCE] || 0);
  if (!tabId) {
    throw new Error('认证页标签不存在，请先完成 OAuth 登录。');
  }
  const callbackPromise = waitForLocalhostCallback(tabId, expectedState);
  let lastClickError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const clicked = await Promise.race([
      sendToOpenAi({ type: 'CLICK_OAUTH_CONSENT' }, 12000)
        .then((result) => {
          if (result?.error) {
            throw new Error(result.error);
          }
          return true;
        })
        .catch((error) => {
          lastClickError = error;
          return false;
        }),
      callbackPromise.then(() => 'callback'),
    ]);
    if (clicked === 'callback') {
      break;
    }
    await sleep(2500);
  }
  try {
    return await callbackPromise;
  } catch (error) {
    if (lastClickError) {
      throw new Error(`${error.message}；最后一次点击 OAuth 继续按钮失败：${lastClickError.message}`);
    }
    throw error;
  }
}

async function exchangeCodex2ApiCallback(state) {
  validateSettings(state, ['codex2apiUrl', 'codex2apiAdminKey', 'codex2apiSessionId', 'localhostUrl']);
  const callback = parseCallback(state.localhostUrl);
  if (state.codex2apiOAuthState && callback.state !== state.codex2apiOAuthState) {
    throw new Error('Codex2API 回调 state 与当前授权会话不匹配。');
  }
  const origin = normalizeUrl(state.codex2apiUrl);
  return requestJson(origin, '/api/admin/oauth/exchange-code', {
    adminKey: state.codex2apiAdminKey,
    method: 'POST',
    body: {
      session_id: state.codex2apiSessionId,
      code: callback.code,
      state: callback.state,
    },
  });
}

async function runStep(stepId, settings = {}) {
  const stepStartedAt = Date.now();
  let state = await setState({
    ...settings,
    password: settings.password || (await getState()).password || generatePassword(),
  });
  await markStep(stepId, 'running');
  await setCurrentStatus(`正在执行：${STEP_LABELS[stepId] || stepId}`);
  await addLog(`开始：${STEP_LABELS[stepId] || stepId}`);

  try {
    if (!['open-chatgpt', 'submit-email'].includes(stepId)) {
      await skipSurveyIfPresentSafely();
    }
    if (stepId === 'open-chatgpt') {
      await setCurrentStatus('当前页面：ChatGPT 首页；操作：打开官网');
      await ensureOpenAiTab(CHATGPT_URL);
    } else if (stepId === 'submit-email') {
      await setCurrentStatus('当前页面：注册页；操作：填写邮箱和密码并发送邮箱验证码');
      validateSettings(state, ['email', 'password']);
      let tabId = await ensureExistingOpenAiTab(CHATGPT_URL);
      let result;
      try {
        result = await sendToOpenAi({
          type: 'START_SIGNUP_WITH_EMAIL',
          payload: {
            email: state.email,
            password: state.password,
          },
        }, 60000, { noRetry: true });
      } catch (error) {
        const phase = await detectOpenAiPhaseSafely();
          if (['verification', 'phone', 'survey', 'ready'].includes(phase)) {
          await addLog(`页面已进入 ${phase} 阶段，第二步按成功处理。`, 'ok');
          result = { ok: true, phase };
        } else if (isLikelyNavigationProgress(error)) {
          await addLog('页面已跳转到下一步，忽略浏览器消息通道关闭提示。', 'ok');
          result = { ok: true };
        } else
        if (shouldRetrySignupDirectly(error)) {
          result = { error: error.message };
        } else throw error;
      }

      if (result?.error) throw new Error(result.error);
      await markStep('email-code-sent', 'completed');
      await setState({ tabIds: { [OPENAI_AUTH_SOURCE]: tabId } });
    } else if (stepId === 'manual-email-code') {
      await setCurrentStatus('当前页面：邮箱验证码页；操作：填入邮箱验证码并继续');
      const emailCode = String(settings.emailCode || '').replace(/\D/g, '').trim();
      if (!emailCode) {
        throw new Error('请输入邮箱验证码。');
      }
      const result = await sendToOpenAi({
        type: 'SUBMIT_EMAIL_CODE',
        payload: {
          code: emailCode,
        },
      }, 30000);
      if (result?.error) throw new Error(result.error);
    } else if (stepId === 'fill-profile') {
      await setCurrentStatus('当前页面：注册后确认；操作：填写资料、处理注册后页面并确认完成');
      const result = await completeRegistrationAfterEmailSafely();
      await addLog(`注册完成确认通过：资料处理 ${result.profileFillCount || 0} 次，注册后页面处理 ${result.guideHandledCount || 0} 次，耗时 ${formatElapsedDuration(result.elapsedMs || 0)}。`, 'ok');
    } else if (stepId === 'oauth-login') {
      await setCurrentStatus('当前页面：注册后确认；操作：确认账号可用后生成 SUB2API 授权链接');
      state = await getState();
      validateSettings(state, ['email']);
      await waitForRegistrationCompletionSafely(30000);
      await markStep('sub2api-generate-openai-oauth', 'running');
      const oauth = await generateSub2ApiOpenAiOAuth(state);
      state = await setState(oauth);
      await markStep('sub2api-generate-openai-oauth', 'completed');
      await ensureOpenAiTab(oauth.sub2apiOAuthUrl);
      await addLog(`SUB2API OpenAI 授权链接已生成并打开：${oauth.sub2apiOAuthUrl}`, 'ok');
      const result = await sendToOpenAi({
        type: 'PREPARE_OAUTH_EMAIL_LOGIN',
        payload: {
          email: state.email,
        },
      }, 30000);
      if (result?.error) throw new Error(result.error);
      await addLog(getOAuthEmailLoginLog(result?.phase), 'info');
      if (result?.phase === 'consent') {
        await setCurrentStatus('当前页面：Codex 授权确认页；操作：点击继续并导入 SUB2API');
        await addLog('已进入 Codex 授权确认页，自动继续并导入 SUB2API。', 'info');
        const importResult = await confirmOAuthAndImportToSub2Api();
        if (importResult?.preparedNextRun) {
          await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
          return getState();
        }
        await markStep(stepId, 'completed');
        await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
        return getState();
      } else {
        const phase = await detectOpenAiPhaseSafely();
        if (phase === 'consent') {
          await setCurrentStatus('当前页面：Codex 授权确认页；操作：点击继续并导入 SUB2API');
          await addLog('检测到 Codex 授权确认页，自动继续并导入 SUB2API。', 'info');
          const importResult = await confirmOAuthAndImportToSub2Api();
          if (importResult?.preparedNextRun) {
            await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
            return getState();
          }
          await markStep(stepId, 'completed');
          await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
          return getState();
        }
      }
    } else if (stepId === 'phone-verification') {
      await setCurrentStatus('当前页面：检测手机号流程；操作：判断是否需要绑定手机号');
      await markStep('phone-check', 'running');
      state = await getState();
      const currentPhase = await detectOpenAiPhaseSafely();
      await markStep('phone-check', 'completed');
      if (currentPhase !== 'phone') {
        if (currentPhase === 'consent') {
          await setCurrentStatus('当前页面：Codex 授权确认页；操作：跳过手机号并导入 SUB2API');
          await addLog('未检测到绑定手机号页面，已进入 OAuth 确认页，直接导入 SUB2API。', 'info');
          const importResult = await confirmOAuthAndImportToSub2Api();
          if (importResult?.preparedNextRun) {
            await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
            return getState();
          }
          await markStep(stepId, 'completed');
          await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
          return getState();
        }
        await addLog(`手机号阶段检测结果为 ${currentPhase || 'unknown'}，尝试按手机号页继续提交。`, 'warn');
      }
      const phoneAttempt = await submitPhoneAndFetchCodeFromPool(state);
      await markStep('phone-code-fetch', 'completed');
      await setCurrentStatus('当前页面：短信验证码页；操作：已收到验证码，正在填入并继续');
      await addLog(`已收到短信验证码：${phoneAttempt.phoneCode}（手机号：${phoneAttempt.phone}）`, 'ok');
      await markStep('phone-code-submit', 'running');
      const codeResult = await sendToOpenAi({
        type: 'SUBMIT_PHONE_CODE',
        payload: {
          code: phoneAttempt.phoneCode,
        },
      }, 30000);
      if (codeResult?.error) throw new Error(codeResult.error);
      await markStep('phone-code-submit', 'completed');
      await setCurrentStatus('当前页面：Codex 授权确认页；操作：自动确认并导入 SUB2API');
      await addLog('手机号绑定完成，正在自动确认 Codex OAuth。', 'info');
      const importResult = await confirmOAuthAndImportToSub2Api();
      if (importResult?.preparedNextRun) {
        await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
        return getState();
      }
      await markStep(stepId, 'completed');
      await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
      return getState();
    } else if (stepId === 'manual-phone-code') {
      const phoneCode = String(settings.phoneCode || '').replace(/\D/g, '').trim();
      if (!phoneCode) {
        throw new Error('请输入短信验证码。');
      }
      const result = await sendToOpenAi({
        type: 'SUBMIT_PHONE_CODE',
        payload: {
          code: phoneCode,
        },
      }, 30000);
      if (result?.error) throw new Error(result.error);
    } else if (stepId === 'confirm-oauth') {
      state = await getState();
      const callback = await clickOauthAndCaptureCallback(state.sub2apiOAuthState || state.codex2apiOAuthState);
      await setState({
        localhostUrl: callback.url,
        sub2apiCallbackUrl: callback.url,
      });
      await addLog(`已捕获 localhost 回调：${callback.url}`, 'ok');
    } else if (stepId === 'codex2api-callback') {
      state = await getState();
      const result = await exchangeCodex2ApiCallback(state);
      await addLog(String(result?.message || 'Codex2API OAuth 账号添加成功'), 'ok');
    } else if (stepId === 'sub2api-generate-openai-oauth') {
      state = await getState();
      await setCurrentStatus('当前页面：注册后确认；操作：确认账号可用后生成 SUB2API 授权链接');
      await waitForRegistrationCompletionSafely(30000);
      const oauth = await generateSub2ApiOpenAiOAuth(state);
      state = await setState(oauth);
      await chrome.tabs.create({ url: oauth.sub2apiOAuthUrl, active: true });
      await addLog(`SUB2API OpenAI 授权链接已生成并打开：${oauth.sub2apiOAuthUrl}`, 'ok');
    } else if (stepId === 'sub2api-create-openai-account') {
      state = await getState();
      const result = await createSub2ApiOpenAiAccount(state);
      await setState({ sub2apiCallbackUrl: result.sub2apiCallbackUrl });
      await addLog(`SUB2API 已添加 OpenAI OAuth 账号：${result.accountName || result.accountId || 'unknown'}`, 'ok');
      await logAutoFlowRoundCompletedOnce();
    } else {
      throw new Error(`未知步骤：${stepId}`);
    }

    await markStep(stepId, 'completed');
    await setCurrentStatus(`完成：${STEP_LABELS[stepId] || stepId}`);
    await addLog(`完成：${STEP_LABELS[stepId] || stepId}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'ok');
  } catch (error) {
    await markStep(stepId, 'failed');
    await setCurrentStatus(`失败：${STEP_LABELS[stepId] || stepId}；原因：${error.message}`);
    await addLog(`${STEP_LABELS[stepId] || stepId} 失败：${error.message}，耗时 ${formatElapsedDuration(Date.now() - stepStartedAt)}`, 'error');
  }

  return getState();
}

async function runAutoFlow(settings = {}) {
  await setState({ autoFlowStopped: false });
  if (settings.restartFlow) {
    await resetFlowRuntime();
  }
  const roundStartedAt = Date.now();
  const currentEmail = await selectCurrentEmail(settings);
  const { resetEmailIndex, restartFlow, ...persistableSettings } = settings;
  let state = await setState({
    ...persistableSettings,
    email: currentEmail.email,
    password: settings.password || (await getState()).password || generatePassword(),
    autoFlowRoundStartedAt: roundStartedAt,
  });
  await setCurrentStatus(settings.emailCode
    ? `已收到邮箱验证码，继续自动流程：${currentEmail.email}（${currentEmail.index + 1}/${currentEmail.total}）`
    : `自动流程启动：${currentEmail.email}（${currentEmail.index + 1}/${currentEmail.total}），准备打开 ChatGPT`);
  await addLog(settings.emailCode
    ? `自动流程继续：${currentEmail.email}（${currentEmail.index + 1}/${currentEmail.total}）已收到邮箱验证码。`
    : `自动流程启动：当前邮箱 ${currentEmail.email}（${currentEmail.index + 1}/${currentEmail.total}）。`, 'info');

  if (settings.emailCode) {
    await ensureAutoNotStopped();
    state = await runStep('manual-email-code', settings);
  } else {
    await ensureAutoNotStopped();
    await setCurrentStatus('自动流程：第 1 步，打开 ChatGPT 官网');
    state = await runStep('open-chatgpt', settings);
    if (state.stepStatuses?.['open-chatgpt'] === 'failed') {
      return { state };
    }

    await ensureAutoNotStopped();
    await setCurrentStatus('自动流程：第 2 步，注册并发送邮箱验证码');
    state = await runStep('submit-email', settings);
    if (state.stepStatuses?.['submit-email'] === 'failed') {
      return { state };
    }

    await ensureAutoNotStopped();
    await setCurrentStatus('自动流程暂停：等待手动输入邮箱验证码');
    await addLog('已发送邮箱验证码，等待手动输入验证码后继续自动流程。', 'info');
    notifyAwaitingEmailCode();
    return {
      state: await getState(),
      awaiting: 'email-code',
    };
  }

  if (state.stepStatuses?.['manual-email-code'] === 'failed') {
    return { state };
  }

  await ensureAutoNotStopped();
  await setCurrentStatus('自动流程：确认注册已完成');
  state = await runStep('fill-profile', settings);
  if (state.stepStatuses?.['fill-profile'] === 'failed') {
    return { state };
  }

  await ensureAutoNotStopped();
  await setCurrentStatus('自动流程：登录 Codex 并生成 OAuth 授权');
  state = await runStep('oauth-login', settings);
  if (state.stepStatuses?.['oauth-login'] === 'failed') {
    return { state };
  }

  state = await getState();
  if (state.stepStatuses?.['sub2api-create-openai-account'] === 'completed') {
    await setCurrentStatus('自动流程完成：账号已导入 SUB2API');
    await logAutoFlowRoundCompletedOnce();
    return { state };
  }

  await ensureAutoNotStopped();
  await setCurrentStatus('自动流程：处理手机号绑定或直接导入 SUB2API');
  state = await runStep('phone-verification', settings);
  state = await getState();
  if (state.stepStatuses?.['phone-verification'] === 'failed') {
    return {
      state,
      awaiting: 'phone-pool-entry',
      message: '手机号绑定失败，请补充新的手机号和接码链接后继续。',
    };
  }
  if (state.stepStatuses?.['sub2api-create-openai-account'] === 'completed') {
    await setCurrentStatus('自动流程完成：账号已导入 SUB2API');
    await logAutoFlowRoundCompletedOnce();
  }
  return { state };
}

async function continueAutoFlowFromStep(stepId, settings = {}) {
  await setState({ autoFlowStopped: false });
  const resumeStepMap = {
    'email-code-sent': 'manual-email-code',
    'sub2api-generate-openai-oauth': 'oauth-login',
    'confirm-oauth': 'phone-verification',
    'phone-check': 'phone-verification',
    'phone-code-fetch': 'phone-verification',
    'phone-code-submit': 'phone-verification',
    'manual-phone-code': 'phone-verification',
    'cleanup-cookies': 'sub2api-create-openai-account',
    'close-current-tab': 'sub2api-create-openai-account',
    'prepare-next-run': 'sub2api-create-openai-account',
  };
  const resolvedStepId = resumeStepMap[stepId] || stepId;
  const orderedSteps = [
    'open-chatgpt',
    'submit-email',
    'manual-email-code',
    'fill-profile',
    'oauth-login',
    'phone-verification',
  ];
  const startIndex = orderedSteps.indexOf(resolvedStepId);
  if (startIndex === -1) {
    return { state: await runStep(resolvedStepId, settings) };
  }

  if (resolvedStepId === 'manual-email-code' && !settings.emailCode) {
    return {
      state: await getState(),
      awaiting: 'email-code',
    };
  }

  for (let index = startIndex; index < orderedSteps.length; index += 1) {
    await ensureAutoNotStopped();
    const currentStep = orderedSteps[index];
    const state = await runStep(currentStep, settings);
    if (state.stepStatuses?.[currentStep] === 'failed') {
      if (currentStep === 'phone-verification') {
        return {
          state,
          awaiting: 'phone-pool-entry',
          message: '手机号绑定失败，请补充新的手机号和接码链接后继续。',
        };
      }
      return { state };
    }
    const latest = await getState();
    if (latest.stepStatuses?.['sub2api-create-openai-account'] === 'completed') {
      await setCurrentStatus('自动流程完成：账号已导入 SUB2API');
      await logAutoFlowRoundCompletedOnce();
      return { state: latest };
    }
  }

  return { state: await getState() };
}

function enableSidePanelEntry() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(enableSidePanelEntry);
chrome.runtime.onStartup.addListener(enableSidePanelEntry);

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_STATE':
        return { state: await getState() };
      case 'GET_FLOW_RESUME_INFO':
        return getFlowResumeInfo();
      case 'CHECK_LATEST_RELEASE':
        return { release: await checkLatestRelease() };
      case 'SAVE_SETTINGS':
        return { state: await setState(message.payload || {}) };
      case 'EXPORT_SETTINGS':
        return {
          settings: await exportSettings(),
          state: await getState(),
        };
      case 'IMPORT_SETTINGS':
        return { state: await importSettings(message.payload || {}) };
      case 'PANEL_OPENED':
        return { state: await resetFlowRuntime() };
      case 'RESET_FLOW':
        return { state: await resetFlowRuntime() };
      case 'STOP_AUTO_FLOW':
        return { state: await requestAutoStop() };
      case 'CLEAR_LOGS':
        return { state: await setState({ logs: [] }) };
      case 'LOAD_SUB2API_GROUPS':
        return {
          groups: await listSub2ApiOpenAiGroups({
            ...(await getState()),
            ...(message.payload || {}),
          }),
          state: await getState(),
        };
      case 'IMPORT_SUB2API_CODEX_JSON_ACCOUNT': {
        const state = await setState(message.payload?.settings || {});
        return {
          result: await importSub2ApiCodexJsonAccount(state, message.payload || {}),
          state: await getState(),
        };
      }
      case 'RUN_STEP':
        return { state: await runStep(message.payload?.stepId, message.payload?.settings || {}) };
      case 'CONTINUE_AUTO_FLOW_FROM_STEP':
        return continueAutoFlowFromStep(message.payload?.stepId, message.payload?.settings || {});
      case 'RUN_AUTO_FLOW':
        return runAutoFlow(message.payload?.settings || {});
      default:
        return { state: await getState() };
    }
  })().then(sendResponse).catch(async (error) => {
    await addLog(error.message, 'error');
    sendResponse({ error: error.message, state: await getState() });
  });
  return true;
});
