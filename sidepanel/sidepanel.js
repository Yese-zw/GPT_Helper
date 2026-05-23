const STEPS = [
  { id: 'open-chatgpt', title: '打开 ChatGPT 官网', runnable: true },
  { id: 'submit-email', title: '填写邮箱和密码', runnable: true },
  { id: 'email-code-sent', title: '发送邮箱验证码' },
  { id: 'manual-email-code', title: '输入邮箱验证码', runnable: true },
  { id: 'fill-profile', title: '确认注册完成', runnable: true },
  { id: 'sub2api-generate-openai-oauth', title: '生成 SUB2API 授权链接' },
  { id: 'oauth-login', title: '登录 Codex', runnable: true },
  { id: 'confirm-oauth', title: '确认 Codex OAuth' },
  { id: 'phone-check', title: '检测手机号流程' },
  { id: 'phone-verification', title: '绑定手机号', runnable: true },
  { id: 'phone-code-fetch', title: '获取短信验证码' },
  { id: 'phone-code-submit', title: '提交短信验证码' },
  { id: 'sub2api-create-openai-account', title: '导入 SUB2API' },
  { id: 'cleanup-cookies', title: '清理 Cookies' },
  { id: 'close-current-tab', title: '关闭当前标签页' },
  { id: 'prepare-next-run', title: '准备下一轮' },
];
const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/Yese-zw/GPT_Helper/releases/latest';

const dom = {
  email: document.getElementById('input-email'),
  phonePool: document.getElementById('input-phone-pool'),
  password: document.getElementById('input-password'),
  sub2apiUrl: document.getElementById('input-sub2api-url'),
  sub2apiAdminKey: document.getElementById('input-sub2api-admin-key'),
  sub2apiOpenAiGroup: document.getElementById('input-sub2api-openai-group'),
  sub2apiRedirectUri: document.getElementById('input-sub2api-redirect-uri'),
  jsonSub2apiUrl: document.getElementById('input-json-sub2api-url'),
  jsonSub2apiAdminKey: document.getElementById('input-json-sub2api-admin-key'),
  jsonSub2apiOpenAiGroup: document.getElementById('input-json-sub2api-openai-group'),
  jsonLoadGroups: document.getElementById('btn-json-load-groups'),
  jsonDirectoryLabel: document.getElementById('input-json-directory-label'),
  jsonPickDirectory: document.getElementById('btn-json-pick-directory'),
  jsonStartImport: document.getElementById('btn-json-start-import'),
  jsonSave: document.getElementById('btn-json-save'),
  jsonSaveTip: document.getElementById('json-save-tip'),
  jsonCurrentAccount: document.getElementById('json-current-account'),
  jsonCurrentIndex: document.getElementById('json-current-index'),
  jsonSuccessCount: document.getElementById('json-success-count'),
  jsonFailedCount: document.getElementById('json-failed-count'),
  jsonClearLog: document.getElementById('btn-json-clear-log'),
  jsonLog: document.getElementById('json-log-area'),
  loadGroups: document.getElementById('btn-load-groups'),
  startAuto: document.getElementById('btn-start-auto'),
  stopAuto: document.getElementById('btn-stop-auto'),
  save: document.getElementById('btn-save'),
  exportSettings: document.getElementById('btn-export-settings'),
  importSettings: document.getElementById('btn-import-settings'),
  importSettingsInput: document.getElementById('input-import-settings'),
  releaseUpdate: document.getElementById('release-update'),
  releaseTitle: document.getElementById('release-title'),
  releaseVersion: document.getElementById('release-version'),
  releaseBody: document.getElementById('release-body'),
  openRelease: document.getElementById('btn-open-release'),
  releaseExportSettings: document.getElementById('btn-release-export-settings'),
  saveTip: document.getElementById('save-tip'),
  reset: document.getElementById('btn-reset'),
  clearLog: document.getElementById('btn-clear-log'),
  currentStatus: document.getElementById('current-status'),
  steps: document.getElementById('steps'),
  log: document.getElementById('log-area'),
  codeDialog: document.getElementById('code-dialog'),
  codeForm: document.getElementById('code-form'),
  codeInput: document.getElementById('input-email-code'),
  codeCancel: document.getElementById('btn-code-cancel'),
  codeTitle: document.getElementById('code-dialog-title'),
  codeDescription: document.getElementById('code-dialog-description'),
  callbackDialog: document.getElementById('callback-dialog'),
  callbackForm: document.getElementById('callback-form'),
  callbackInput: document.getElementById('input-callback-url'),
  callbackCancel: document.getElementById('btn-callback-cancel'),
  phonePoolDialog: document.getElementById('phone-pool-dialog'),
  phonePoolForm: document.getElementById('phone-pool-form'),
  phonePoolEntry: document.getElementById('input-phone-pool-entry'),
  phonePoolCancel: document.getElementById('btn-phone-pool-cancel'),
  modeButtons: Array.from(document.querySelectorAll('[data-mode-tab]')),
  modePanels: Array.from(document.querySelectorAll('[data-mode-panel]')),
  tabButtons: Array.from(document.querySelectorAll('[data-tab]')),
  tabPanels: Array.from(document.querySelectorAll('[data-panel]')),
};

let latestState = {};
let autoSaveTimer = null;
let pendingCodeStepId = '';
let pendingPhoneResumeStepId = 'phone-verification';
let saveTipTimer = null;
let jsonSaveTipTimer = null;
let jsonImportRunning = false;
let jsonDirectoryHandle = null;
let latestReleaseUrl = '';
let forceUpdateRequired = false;

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).then((response) => {
    if (response?.error) {
      const error = new Error(response.error);
      error.response = response;
      throw error;
    }
    return response;
  });
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

function activateSettingsTab(tabId) {
  dom.tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tabId);
  });
  dom.tabPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === tabId);
  });
}

function activateModeTab(modeId) {
  dom.modeButtons.forEach((button) => {
    const isActive = button.dataset.modeTab === modeId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  dom.modePanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.modePanel === modeId);
  });
}

function getSettingsPayload() {
  return {
    emails: dom.email.value.trim(),
    phonePool: dom.phonePool.value.trim(),
    password: dom.password.value.trim(),
    sub2apiUrl: dom.sub2apiUrl.value.trim(),
    sub2apiAdminKey: dom.sub2apiAdminKey.value.trim(),
    sub2apiOpenAiGroup: dom.sub2apiOpenAiGroup.value.trim(),
    sub2apiRedirectUri: dom.sub2apiRedirectUri.value.trim(),
    jsonImportSub2apiOpenAiGroup: dom.jsonSub2apiOpenAiGroup.value.trim(),
    jsonImportDirectoryName: dom.jsonDirectoryLabel?.dataset.directoryName || '',
  };
}

function getJsonImportSettingsPayload() {
  return {
    jsonImportSub2apiUrl: dom.jsonSub2apiUrl.value.trim(),
    jsonImportSub2apiAdminKey: dom.jsonSub2apiAdminKey.value.trim(),
    jsonImportSub2apiOpenAiGroup: dom.jsonSub2apiOpenAiGroup.value.trim(),
    jsonImportDirectoryName: dom.jsonDirectoryLabel?.dataset.directoryName || '',
  };
}

function getJsonImportRuntimePayload() {
  return {
    ...getJsonImportSettingsPayload(),
    sub2apiUrl: dom.jsonSub2apiUrl.value.trim(),
    sub2apiAdminKey: dom.jsonSub2apiAdminKey.value.trim(),
    sub2apiOpenAiGroup: dom.jsonSub2apiOpenAiGroup.value.trim(),
    sub2apiRedirectUri: dom.sub2apiRedirectUri.value.trim(),
  };
}

function getAllSettingsPayload() {
  return {
    ...getSettingsPayload(),
    ...getJsonImportSettingsPayload(),
  };
}

function normalizeImportedSettings(raw) {
  const source = raw?.settings && typeof raw.settings === 'object' ? raw.settings : raw;
  if (!source || typeof source !== 'object') {
    throw new Error('设置文件格式不正确。');
  }
  const allowedKeys = [
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
  const settings = {};
  allowedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      settings[key] = String(source[key] || '').trim();
    }
  });
  if (!settings.phonePool && settings.phone && settings.phoneCodeUrl) {
    settings.phonePool = `${settings.phone}----${settings.phoneCodeUrl}`;
  }
  return settings;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.dataset.forceUpdateAllowed = 'true';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '{}')));
      } catch {
        reject(new Error('无法解析 JSON 设置文件。'));
      }
    };
    reader.onerror = () => reject(new Error('读取设置文件失败。'));
    reader.readAsText(file, 'utf-8');
  });
}

async function exportCurrentSettings() {
  await sendMessage({ type: 'SAVE_SETTINGS', payload: getAllSettingsPayload() });
  const response = await sendMessage({ type: 'EXPORT_SETTINGS' });
  const settings = response.settings || {};
  const hasSensitive = settings.password || settings.sub2apiAdminKey || settings.jsonImportSub2apiAdminKey;
  if (hasSensitive && !window.confirm('导出的设置包含密码或 SUB2API Admin API Key，请确认只在可信环境保存。是否继续导出？')) {
    return false;
  }
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`chatgpt-account-helper-settings-${date}.json`, {
    app: 'ChatGPT 账号入库助手',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  });
  return true;
}

async function readJsonFileHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const text = await file.text();
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new Error('无法解析 JSON 文件。');
  }
}

async function getDirectoryJsonFileHandles(directoryHandle) {
  if (!directoryHandle) return [];
  const files = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file' && /\.json$/i.test(entry.name)) {
      files.push(entry);
    }
  }
  return files.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return {};
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return {};
  }
}

function toIsoFromJwtSeconds(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Date(value * 1000).toISOString();
}

function normalizeJsonImportAccount(raw, fileName = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('JSON 根节点必须是对象。');
  }
  const idToken = String(raw.id_token || '').trim();
  const accessToken = String(raw.access_token || '').trim();
  const refreshToken = String(raw.refresh_token || '').trim();
  const accessClaims = decodeJwtPayload(accessToken);
  const idClaims = decodeJwtPayload(idToken);
  const authClaims = accessClaims['https://api.openai.com/auth'] || idClaims['https://api.openai.com/auth'] || {};
  const profileClaims = accessClaims['https://api.openai.com/profile'] || {};
  const email = String(raw.email || profileClaims.email || idClaims.email || '').trim();
  const accountId = String(raw.account_id || authClaims.chatgpt_account_id || '').trim();
  const lastRefresh = String(raw.last_refresh || toIsoFromJwtSeconds(accessClaims.iat) || new Date().toISOString()).trim();
  const expired = String(raw.expired || toIsoFromJwtSeconds(accessClaims.exp) || '').trim();
  if (!email) {
    throw new Error(`${fileName || 'JSON'} 缺少 email。`);
  }
  if (!accessToken) {
    throw new Error(`${email} 缺少 access_token。`);
  }
  return {
    accountName: email,
    content: JSON.stringify([{
      id_token: idToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      account_id: accountId,
      last_refresh: lastRefresh,
      email,
      type: String(raw.type || 'codex').trim() || 'codex',
      expired,
    }]),
  };
}

function statusLabel(status) {
  switch (status) {
    case 'running': return '执行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return '等待中';
  }
}

function actionLabel(status) {
  switch (status) {
    case 'running': return '执行中';
    case 'failed': return '从此处继续';
    case 'completed': return '从此处继续';
    default: return '从此处继续';
  }
}

function renderSteps() {
  const statuses = latestState.stepStatuses || {};
  dom.steps.innerHTML = STEPS.map((step, index) => {
    const status = statuses[step.id] || 'pending';
    return `
      <li class="step" data-status="${status}">
        <div>
          <div class="step-title">${index + 1}. ${step.title}</div>
          <div class="step-status">${statusLabel(status)}</div>
        </div>
        <button type="button" data-step-id="${step.id}" ${status === 'running' ? 'disabled' : ''}>${actionLabel(status)}</button>
      </li>
    `;
  }).join('');
}

function renderState(state = {}) {
  latestState = state;
  dom.email.value = state.emails || state.email || '';
  dom.phonePool.value = state.phonePool || (state.phone && state.phoneCodeUrl ? `${state.phone}----${state.phoneCodeUrl}` : '');
  dom.password.value = state.password || '';
  dom.sub2apiUrl.value = state.sub2apiUrl || '';
  dom.sub2apiAdminKey.value = state.sub2apiAdminKey || '';
  ensureGroupOption(state.sub2apiOpenAiGroup || 'OpenAI');
  dom.sub2apiOpenAiGroup.value = state.sub2apiOpenAiGroup || 'OpenAI';
  dom.sub2apiRedirectUri.value = state.sub2apiRedirectUri || '';
  dom.jsonSub2apiUrl.value = state.jsonImportSub2apiUrl || state.sub2apiUrl || '';
  dom.jsonSub2apiAdminKey.value = state.jsonImportSub2apiAdminKey || state.sub2apiAdminKey || '';
  ensureJsonGroupOption(state.jsonImportSub2apiOpenAiGroup || state.sub2apiOpenAiGroup || 'OpenAI');
  dom.jsonSub2apiOpenAiGroup.value = state.jsonImportSub2apiOpenAiGroup || state.sub2apiOpenAiGroup || 'OpenAI';
  if (state.jsonImportDirectoryName && !dom.jsonDirectoryLabel.dataset.directoryName) {
    dom.jsonDirectoryLabel.dataset.directoryName = state.jsonImportDirectoryName;
    dom.jsonDirectoryLabel.value = state.jsonImportDirectoryName;
  }
  dom.currentStatus.textContent = state.currentStatus || '等待开始';
  dom.log.textContent = (state.logs || []).join('\n');
  renderSteps();
}

function ensureGroupOption(groupName) {
  const name = String(groupName || '').trim();
  if (!name) return;
  const exists = Array.from(dom.sub2apiOpenAiGroup.options).some((option) => option.value === name);
  if (!exists) {
    dom.sub2apiOpenAiGroup.append(new Option(name, name));
  }
}

function ensureJsonGroupOption(groupName) {
  const name = String(groupName || '').trim();
  if (!name) return;
  const exists = Array.from(dom.jsonSub2apiOpenAiGroup.options).some((option) => option.value === name);
  if (!exists) {
    dom.jsonSub2apiOpenAiGroup.append(new Option(name, name));
  }
}

function renderSelectGroupOptions(select, groups = [], selectedName = '') {
  const current = selectedName || select.value || 'OpenAI';
  select.innerHTML = '';
  const names = groups.map((group) => group.name).filter(Boolean);
  if (!names.includes(current)) {
    names.unshift(current);
  }
  names.forEach((name) => {
    select.append(new Option(name, name));
  });
  select.value = names.includes(current) ? current : names[0] || '';
}

function renderGroupOptions(groups = [], selectedName = '') {
  renderSelectGroupOptions(dom.sub2apiOpenAiGroup, groups, selectedName);
}

function renderJsonGroupOptions(groups = [], selectedName = '') {
  renderSelectGroupOptions(dom.jsonSub2apiOpenAiGroup, groups, selectedName);
}

function openCodeDialog(stepId) {
  pendingCodeStepId = stepId;
  dom.codeInput.value = '';
  if (stepId === 'manual-phone-code') {
    dom.codeTitle.textContent = '输入短信验证码';
    dom.codeDescription.textContent = '把手机收到的验证码填在这里，插件会自动写入绑定手机号页面并点击继续。';
  } else if (stepId === 'auto-email-code') {
    dom.codeTitle.textContent = '输入邮箱验证码';
    dom.codeDescription.textContent = '自动流程已暂停。把邮箱里收到的验证码填在这里，插件会继续完成后续流程。';
  } else {
    dom.codeTitle.textContent = '输入邮箱验证码';
    dom.codeDescription.textContent = '把邮箱里收到的注册或登录验证码填在这里，插件会自动写入 OpenAI 页面并点击继续。';
  }
  dom.codeDialog.hidden = false;
  setTimeout(() => dom.codeInput.focus(), 0);
}

function closeCodeDialog() {
  pendingCodeStepId = '';
  dom.codeDialog.hidden = true;
}

function openCallbackDialog() {
  dom.callbackInput.value = latestState.sub2apiCallbackUrl || '';
  dom.callbackDialog.hidden = false;
  setTimeout(() => dom.callbackInput.focus(), 0);
}

function closeCallbackDialog() {
  dom.callbackDialog.hidden = true;
}

function openPhonePoolDialog(resumeStepId = 'phone-verification') {
  pendingPhoneResumeStepId = resumeStepId || 'phone-verification';
  dom.phonePoolEntry.value = '';
  dom.phonePoolDialog.hidden = false;
  setTimeout(() => dom.phonePoolEntry.focus(), 0);
}

function closePhonePoolDialog() {
  dom.phonePoolDialog.hidden = true;
}

function appendPhonePoolEntry(entry) {
  const value = String(entry || '').trim();
  if (!value) return;
  const current = dom.phonePool.value.trim();
  dom.phonePool.value = current ? `${current}\n${value}` : value;
}

function resolveResumeStepId(stepId) {
  const mapping = {
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
  return mapping[stepId] || stepId;
}

function showSaveTip(message = '设置已保存') {
  clearTimeout(saveTipTimer);
  dom.saveTip.textContent = message;
  dom.saveTip.hidden = false;
  saveTipTimer = setTimeout(() => {
    dom.saveTip.hidden = true;
  }, 1800);
}

function showJsonSaveTip(message = '设置已保存') {
  clearTimeout(jsonSaveTipTimer);
  dom.jsonSaveTip.textContent = message;
  dom.jsonSaveTip.hidden = false;
  jsonSaveTipTimer = setTimeout(() => {
    dom.jsonSaveTip.hidden = true;
  }, 1800);
}

function appendJsonLog(message, level = 'info') {
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const prefix = level === 'error' ? 'ERROR' : level === 'ok' ? 'OK' : level.toUpperCase();
  dom.jsonLog.textContent = `${dom.jsonLog.textContent}\n[${now}] [${prefix}] ${message}`.trim();
  dom.jsonLog.scrollTop = dom.jsonLog.scrollHeight;
}

function renderJsonProgress({ currentAccount = '等待启动', index = 0, total = 0, success = 0, failed = 0 } = {}) {
  dom.jsonCurrentAccount.textContent = currentAccount;
  dom.jsonCurrentIndex.textContent = `${index} / ${total}`;
  dom.jsonSuccessCount.textContent = String(success);
  dom.jsonFailedCount.textContent = String(failed);
}

async function refreshState() {
  const response = await sendMessage({ type: 'PANEL_OPENED' });
  renderState(response?.state || {});
}

function renderReleaseUpdate(release) {
  if (!release?.hasUpdate) {
    dom.releaseUpdate.hidden = true;
    latestReleaseUrl = '';
    forceUpdateRequired = false;
    return;
  }
  latestReleaseUrl = release.url || '';
  forceUpdateRequired = true;
  dom.releaseTitle.textContent = release.title || release.tagName || '插件更新';
  dom.releaseVersion.textContent = `当前版本 ${release.currentVersion || '-'}，最新版本 ${release.tagName || release.latestVersion || '-'}`;
  dom.releaseBody.textContent = release.body || '此版本没有填写更新说明。';
  dom.releaseUpdate.hidden = false;
  lockForForceUpdate();
}

function lockForForceUpdate() {
  document.querySelectorAll('button, input, textarea, select').forEach((element) => {
    if (element === dom.openRelease || element === dom.releaseExportSettings) return;
    element.disabled = true;
  });
  dom.openRelease.disabled = false;
  dom.releaseExportSettings.disabled = false;
  dom.releaseUpdate.hidden = false;
}

function guardForceUpdate(event) {
  if (!forceUpdateRequired) return;
  if (event.target === dom.openRelease || event.target === dom.releaseExportSettings || dom.releaseUpdate.contains(event.target)) return;
  if (event.target?.closest?.('[data-force-update-allowed="true"]')) return;
  if (event.target?.closest?.('a[download]')) return;
  event.preventDefault();
  event.stopPropagation();
  dom.releaseUpdate.hidden = false;
}

async function checkReleaseUpdate() {
  try {
    const response = await sendMessage({ type: 'CHECK_LATEST_RELEASE' });
    if (response?.release) {
      renderReleaseUpdate(response.release);
      return;
    }
  } catch (error) {
    // Fall through to direct fetch. This keeps update prompts working after older service workers.
  }

  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const release = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    const latestVersion = extractVersion(release.tag_name || release.name || '');
    renderReleaseUpdate({
      currentVersion,
      latestVersion,
      hasUpdate: latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false,
      tagName: release.tag_name || '',
      title: release.name || release.tag_name || '插件更新',
      body: release.body || '',
      url: release.html_url || 'https://github.com/Yese-zw/GPT_Helper/releases/latest',
    });
  } catch (error) {
    dom.releaseUpdate.hidden = false;
    latestReleaseUrl = 'https://github.com/Yese-zw/GPT_Helper/releases/latest';
    dom.releaseTitle.textContent = '更新检查失败';
    dom.releaseVersion.textContent = '无法连接 GitHub Releases，请确认插件已重新加载并且网络可访问 GitHub。';
    dom.releaseBody.textContent = error.message || '未知错误';
  }
}

dom.save.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'SAVE_SETTINGS', payload: getSettingsPayload() });
  renderState(response.state);
  showSaveTip();
});

dom.jsonSave.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'SAVE_SETTINGS', payload: getJsonImportSettingsPayload() });
  renderState(response.state);
  showJsonSaveTip();
});

dom.exportSettings.addEventListener('click', async () => {
  const exported = await exportCurrentSettings();
  if (exported) {
    showSaveTip('设置已导出');
  }
});

dom.importSettings.addEventListener('click', () => {
  dom.importSettingsInput.value = '';
  dom.importSettingsInput.click();
});

dom.importSettingsInput.addEventListener('change', async () => {
  const file = dom.importSettingsInput.files?.[0];
  if (!file) return;
  try {
    const json = await readJsonFile(file);
    const settings = normalizeImportedSettings(json);
    const response = await sendMessage({ type: 'IMPORT_SETTINGS', payload: settings });
    renderState(response.state);
    showSaveTip('设置已导入');
  } catch (error) {
    dom.log.textContent = `${dom.log.textContent}\n导入设置失败：${error.message}`.trim();
  }
});

dom.openRelease.addEventListener('click', () => {
  const url = latestReleaseUrl || 'https://github.com/Yese-zw/GPT_Helper/releases/latest';
  chrome.tabs.create({ url });
});

dom.releaseExportSettings.addEventListener('click', async () => {
  await exportCurrentSettings();
});

document.addEventListener('click', guardForceUpdate, true);
document.addEventListener('submit', guardForceUpdate, true);
document.addEventListener('keydown', (event) => {
  if (forceUpdateRequired && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    dom.releaseUpdate.hidden = false;
  }
}, true);

dom.loadGroups.addEventListener('click', async () => {
  dom.loadGroups.disabled = true;
  const originalText = dom.loadGroups.textContent;
  dom.loadGroups.textContent = '获取中';
  try {
    await sendMessage({ type: 'SAVE_SETTINGS', payload: getSettingsPayload() });
    const response = await sendMessage({
      type: 'LOAD_SUB2API_GROUPS',
      payload: getSettingsPayload(),
    });
    renderGroupOptions(response.groups || [], dom.sub2apiOpenAiGroup.value);
    showSaveTip(`已获取 ${response.groups?.length || 0} 个分组`);
  } catch (error) {
    dom.log.textContent = `${dom.log.textContent}\n获取 SUB2API 分组失败：${error.message}`.trim();
  } finally {
    dom.loadGroups.disabled = false;
    dom.loadGroups.textContent = originalText;
  }
});

dom.jsonLoadGroups.addEventListener('click', async () => {
  dom.jsonLoadGroups.disabled = true;
  const originalText = dom.jsonLoadGroups.textContent;
  dom.jsonLoadGroups.textContent = '获取中';
  try {
    await sendMessage({ type: 'SAVE_SETTINGS', payload: getJsonImportSettingsPayload() });
    const response = await sendMessage({
      type: 'LOAD_SUB2API_GROUPS',
      payload: getJsonImportRuntimePayload(),
    });
    renderJsonGroupOptions(response.groups || [], dom.jsonSub2apiOpenAiGroup.value);
    showJsonSaveTip(`已获取 ${response.groups?.length || 0} 个分组`);
  } catch (error) {
    appendJsonLog(`获取 SUB2API 分组失败：${error.message}`, 'error');
  } finally {
    dom.jsonLoadGroups.disabled = false;
    dom.jsonLoadGroups.textContent = originalText;
  }
});

dom.tabButtons.forEach((button) => {
  button.addEventListener('click', () => activateSettingsTab(button.dataset.tab));
});

dom.modeButtons.forEach((button) => {
  button.addEventListener('click', () => activateModeTab(button.dataset.modeTab));
});

dom.jsonPickDirectory.addEventListener('click', async () => {
  if (!window.showDirectoryPicker) {
    appendJsonLog('当前浏览器不支持目录读取 API，请使用较新的 Chrome/Edge。', 'error');
    return;
  }
  try {
    jsonDirectoryHandle = await window.showDirectoryPicker({ mode: 'read' });
    const files = await getDirectoryJsonFileHandles(jsonDirectoryHandle);
    const directoryName = jsonDirectoryHandle.name || '';
    dom.jsonDirectoryLabel.dataset.directoryName = directoryName;
    dom.jsonDirectoryLabel.value = directoryName
      ? `${directoryName}（${files.length} 个 JSON 文件）`
      : files.length > 0
        ? `已读取 ${files.length} 个 JSON 文件`
        : '未选择目录';
    await sendMessage({
      type: 'SAVE_SETTINGS',
      payload: {
        ...getJsonImportSettingsPayload(),
        jsonImportDirectoryName: directoryName,
      },
    });
    appendJsonLog(`已选择目录：${dom.jsonDirectoryLabel.value}`, 'ok');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    appendJsonLog(`选择目录失败：${error.message}`, 'error');
  }
});

dom.jsonClearLog.addEventListener('click', () => {
  dom.jsonLog.textContent = '';
  renderJsonProgress();
});

dom.jsonStartImport.addEventListener('click', async () => {
  if (jsonImportRunning) return;
  const files = await getDirectoryJsonFileHandles(jsonDirectoryHandle);
  if (files.length === 0) {
    appendJsonLog('请先选择包含 JSON 文件的目录。', 'error');
    return;
  }
  jsonImportRunning = true;
  dom.jsonStartImport.disabled = true;
  dom.jsonStartImport.textContent = '导入中';
  let success = 0;
  let failed = 0;
  renderJsonProgress({ currentAccount: '准备导入', index: 0, total: files.length, success, failed });
  try {
    await sendMessage({ type: 'SAVE_SETTINGS', payload: getJsonImportSettingsPayload() });
    appendJsonLog(`开始导入目录：${dom.jsonDirectoryLabel.value}，共 ${files.length} 个 JSON 文件。`, 'info');
    for (let index = 0; index < files.length; index += 1) {
      const fileHandle = files[index];
      let accountName = fileHandle.name;
      try {
        const raw = await readJsonFileHandle(fileHandle);
        const converted = normalizeJsonImportAccount(raw, fileHandle.name);
        accountName = converted.accountName;
        renderJsonProgress({ currentAccount: accountName, index: index + 1, total: files.length, success, failed });
        appendJsonLog(`正在导入：${accountName}（${index + 1}/${files.length}）`, 'info');
        const response = await sendMessage({
          type: 'IMPORT_SUB2API_CODEX_JSON_ACCOUNT',
          payload: {
            settings: getJsonImportRuntimePayload(),
            name: accountName,
            email: accountName,
            content: converted.content,
          },
        });
        const result = response.result || {};
        const item = (result.items || [])[0] || {};
        if (Number(result.failed || 0) > 0 || item.action === 'failed') {
          failed += 1;
          appendJsonLog(`${accountName} 导入失败：${item.message || (result.errors || [])[0]?.message || 'SUB2API 返回失败'}`, 'error');
        } else {
          success += 1;
          appendJsonLog(`${accountName} 导入完成：${item.action || 'created'}${item.account_id ? ` #${item.account_id}` : ''}`, 'ok');
        }
      } catch (error) {
        failed += 1;
        appendJsonLog(`${accountName} 导入失败：${error.message}`, 'error');
      }
      renderJsonProgress({ currentAccount: accountName, index: index + 1, total: files.length, success, failed });
    }
    appendJsonLog(`导入结束：成功 ${success}，失败 ${failed}。`, failed > 0 ? 'warn' : 'ok');
  } finally {
    jsonImportRunning = false;
    dom.jsonStartImport.disabled = false;
    dom.jsonStartImport.textContent = '启动导入';
  }
});

dom.startAuto.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'SAVE_SETTINGS', payload: getSettingsPayload() });
  renderState(response.state);
  const resume = await sendMessage({ type: 'GET_FLOW_RESUME_INFO' });
  let options = { resetEmailIndex: true, restartFlow: true };
  if (resume?.hasUnfinished) {
    const shouldContinue = window.confirm(
      `检测到之前有未完成流程。\n\n停留步骤：${resume.stepTitle}\n当前状态：${resume.currentStatus}\n\n点击“确定”从这里继续；点击“取消”从头开始。`
    );
    options = shouldContinue ? {} : { resetEmailIndex: true, restartFlow: true };
  }
  await runAutoFlow(options);
});

dom.stopAuto.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'STOP_AUTO_FLOW' });
  renderState(response.state);
});

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      await sendMessage({ type: 'SAVE_SETTINGS', payload: getAllSettingsPayload() });
    } catch (error) {
      dom.log.textContent = `${dom.log.textContent}\n自动保存失败：${error.message}`.trim();
    }
  }, 500);
}

function syncSub2ApiFields(source) {
  const sourceMap = {
    semiUrl: [dom.sub2apiUrl, dom.jsonSub2apiUrl],
    jsonUrl: [dom.jsonSub2apiUrl, dom.sub2apiUrl],
    semiKey: [dom.sub2apiAdminKey, dom.jsonSub2apiAdminKey],
    jsonKey: [dom.jsonSub2apiAdminKey, dom.sub2apiAdminKey],
  };
  const pair = sourceMap[source];
  if (!pair) return;
  const [from, to] = pair;
  if (to.value !== from.value) {
    if (to.tagName === 'SELECT') {
      const exists = Array.from(to.options).some((option) => option.value === from.value);
      if (!exists && from.value) {
        to.append(new Option(from.value, from.value));
      }
    }
    to.value = from.value;
  }
}

[
  dom.email,
  dom.phonePool,
  dom.password,
  dom.sub2apiUrl,
  dom.sub2apiAdminKey,
  dom.sub2apiOpenAiGroup,
  dom.sub2apiRedirectUri,
].forEach((input) => {
  input.addEventListener('input', scheduleAutoSave);
  input.addEventListener('change', scheduleAutoSave);
});

[
  [dom.sub2apiUrl, 'semiUrl'],
  [dom.jsonSub2apiUrl, 'jsonUrl'],
  [dom.sub2apiAdminKey, 'semiKey'],
  [dom.jsonSub2apiAdminKey, 'jsonKey'],
].forEach(([input, source]) => {
  input.addEventListener('input', () => syncSub2ApiFields(source));
  input.addEventListener('change', () => syncSub2ApiFields(source));
});

[
  dom.jsonSub2apiUrl,
  dom.jsonSub2apiAdminKey,
  dom.jsonSub2apiOpenAiGroup,
].forEach((input) => {
  input.addEventListener('input', scheduleAutoSave);
  input.addEventListener('change', scheduleAutoSave);
});

dom.callbackCancel.addEventListener('click', closeCallbackDialog);
dom.callbackDialog.addEventListener('click', (event) => {
  if (event.target === dom.callbackDialog) {
    closeCallbackDialog();
  }
});

dom.callbackForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const callbackUrl = dom.callbackInput.value.trim();
  if (!callbackUrl) {
    dom.callbackInput.focus();
    return;
  }
  closeCallbackDialog();
  await runStep('sub2api-create-openai-account', { sub2apiCallbackUrl: callbackUrl });
});

dom.reset.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'RESET_FLOW' });
  renderState(response.state);
});

dom.clearLog.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'CLEAR_LOGS' });
  renderState(response.state);
});

dom.codeCancel.addEventListener('click', closeCodeDialog);
dom.codeDialog.addEventListener('click', (event) => {
  if (event.target === dom.codeDialog) {
    closeCodeDialog();
  }
});

dom.codeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = dom.codeInput.value.replace(/\D/g, '').trim();
  if (!code) {
    dom.codeInput.focus();
    return;
  }
  const stepId = pendingCodeStepId || 'manual-email-code';
  closeCodeDialog();
  if (stepId === 'auto-email-code') {
    await continueAutoFlow({ emailCode: code });
  } else {
    await continueAutoFlowFromStep(stepId, stepId === 'manual-phone-code' ? { phoneCode: code } : { emailCode: code });
  }
});

dom.phonePoolCancel.addEventListener('click', closePhonePoolDialog);
dom.phonePoolDialog.addEventListener('click', (event) => {
  if (event.target === dom.phonePoolDialog) {
    closePhonePoolDialog();
  }
});

dom.phonePoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const entry = dom.phonePoolEntry.value.trim();
  if (!/^\+\d{6,20}----https?:\/\/\S+/i.test(entry)) {
    dom.phonePoolEntry.focus();
    return;
  }
  appendPhonePoolEntry(entry);
  closePhonePoolDialog();
  await sendMessage({ type: 'SAVE_SETTINGS', payload: getSettingsPayload() });
  await continueAutoFlowFromStep(pendingPhoneResumeStepId || 'phone-verification');
});

async function runAutoFlow(extraSettings = {}) {
  try {
    const response = await sendMessage({
      type: 'RUN_AUTO_FLOW',
      payload: {
        settings: {
          ...getSettingsPayload(),
          ...extraSettings,
        },
      },
    });
    renderState(response.state);
    if (response?.awaiting === 'email-code') {
      openCodeDialog('auto-email-code');
    } else if (response?.awaiting === 'phone-pool-entry') {
      openPhonePoolDialog('phone-verification');
    }
  } catch (error) {
    renderState({
      ...(error.response?.state || latestState),
      logs: [
        ...((error.response?.state || latestState).logs || []),
        `侧边栏请求失败：${error.message}`,
      ],
    });
  }
}

async function continueAutoFlow(extraSettings = {}) {
  await runAutoFlow(extraSettings);
}

async function continueAutoFlowFromStep(stepId, extraSettings = {}) {
  try {
    const response = await sendMessage({
      type: 'CONTINUE_AUTO_FLOW_FROM_STEP',
      payload: {
        stepId,
        settings: {
          ...getSettingsPayload(),
          ...extraSettings,
        },
      },
    });
    renderState(response.state);
    if (response?.awaiting === 'email-code') {
      openCodeDialog('auto-email-code');
    } else if (response?.awaiting === 'phone-pool-entry') {
      openPhonePoolDialog('phone-verification');
    }
  } catch (error) {
    renderState({
      ...(error.response?.state || latestState),
      logs: [
        ...((error.response?.state || latestState).logs || []),
        `侧边栏请求失败：${error.message}`,
      ],
    });
  }
}

async function runStep(stepId, extraSettings = {}) {
  renderState({
    ...latestState,
    ...getSettingsPayload(),
    stepStatuses: {
      ...(latestState.stepStatuses || {}),
      [stepId]: 'running',
    },
  });

  try {
    const response = await sendMessage({
      type: 'RUN_STEP',
      payload: {
        stepId,
        settings: {
          ...getSettingsPayload(),
          ...extraSettings,
        },
      },
    });
    renderState(response.state);
  } catch (error) {
    renderState({
      ...latestState,
      stepStatuses: {
        ...(latestState.stepStatuses || {}),
        [stepId]: 'failed',
      },
      logs: [
        ...(latestState.logs || []),
        `侧边栏请求失败：${error.message}`,
      ],
    });
  }
}

dom.steps.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-step-id]');
  if (!button || button.disabled) return;

  const stepId = button.dataset.stepId;
  const resumeStepId = resolveResumeStepId(stepId);
  if (resumeStepId === 'manual-email-code' || resumeStepId === 'manual-phone-code') {
    openCodeDialog(resumeStepId);
    return;
  }
  if (resumeStepId === 'sub2api-create-openai-account') {
    openCallbackDialog();
    return;
  }
  await continueAutoFlowFromStep(resumeStepId);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') {
    renderState(message.state || {});
  } else if (message.type === 'AUTO_FLOW_AWAITING_EMAIL_CODE') {
    openCodeDialog('auto-email-code');
  }
});

refreshState()
  .catch((error) => {
    dom.log.textContent = `初始化失败：${error.message}`;
  })
  .finally(() => {
    checkReleaseUpdate();
  });
