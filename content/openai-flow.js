(() => {
const FLOW_SENTINEL = 'manual-codex2api-flow-loaded';
const CHATGPT_HOME_URL = 'https://chatgpt.com/';
const SIGNUP_ENTRY_PATTERNS = [
  /免费注册/,
  /立即注册/,
  /注册/,
  /sign\s*up/i,
  /register/i,
  /create\s+account/i,
  /get\s+started/i,
  /start\s+now/i,
  /try\s+chatgpt/i,
  /サインアップ/,
  /新規登録/,
  /登録する/,
  /アカウント.*作成/,
];

const EMAIL_SIGNUP_PATTERNS = [
  /email/i,
  /e-mail/i,
  /邮箱/,
  /電子郵件/,
  /メール/,
  /continue\s+with\s+email/i,
  /sign\s*up\s+with\s+email/i,
];

if (document.documentElement.getAttribute(FLOW_SENTINEL) === '1' && globalThis.__manualCodex2ApiFlowListener) {
  chrome.runtime.onMessage.removeListener(globalThis.__manualCodex2ApiFlowListener);
}

document.documentElement.setAttribute(FLOW_SENTINEL, '1');
globalThis.__manualCodex2ApiFlowListener = (message, sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...(result || {}) }))
    .catch((error) => sendResponse({ error: error.message || String(error) }));
  return true;
};
chrome.runtime.onMessage.addListener(globalThis.__manualCodex2ApiFlowListener);

async function handleMessage(message) {
  switch (message.type) {
    case 'START_SIGNUP_WITH_EMAIL':
      return startSignupWithEmail(message.payload || {});
    case 'PREPARE_OAUTH_EMAIL_LOGIN':
      return prepareOAuthEmailLogin(message.payload || {});
    case 'DETECT_OPENAI_PHASE':
      return detectOpenAiPhase();
    case 'SKIP_SURVEY_IF_PRESENT':
      return { skipped: await skipUseReasonSurveyIfPresent(8000) };
    case 'SUBMIT_EMAIL_CODE':
      return submitEmailCode(message.payload || {});
    case 'WAIT_REGISTRATION_COMPLETION':
      return waitForRegistrationCompletion(message.payload || {});
    case 'COMPLETE_REGISTRATION_AFTER_EMAIL':
      return completeRegistrationAfterEmail(message.payload || {});
    case 'FILL_PROFILE':
      return fillProfile();
    case 'SUBMIT_PHONE':
      return submitPhone(message.payload || {});
    case 'SUBMIT_PHONE_CODE':
      return submitPhoneCode(message.payload || {});
    case 'CLICK_OAUTH_CONSENT':
      return clickOauthConsent();
    default:
      return {};
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && rect.width > 0
    && rect.height > 0;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getCandidateText(candidate) {
  return normalizeText([
    candidate.innerText,
    candidate.textContent,
    candidate.value,
    candidate.getAttribute('aria-label'),
    candidate.getAttribute('title'),
    candidate.getAttribute('href'),
    candidate.dataset?.testid,
    candidate.dataset?.testId,
  ].filter(Boolean).join(' '));
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryVisible(selectors) {
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    const found = nodes.find((node) => isVisible(node) && !node.disabled && !node.readOnly);
    if (found) return found;
  }
  return null;
}

function getClickableCandidates() {
  return Array.from(document.querySelectorAll([
    'button',
    'a',
    '[role="button"]',
    '[role="link"]',
    'input[type="button"]',
    'input[type="submit"]',
  ].join(','))).filter((candidate) => (
    isVisible(candidate)
    && !candidate.disabled
    && candidate.getAttribute('aria-disabled') !== 'true'
  ));
}

function findButtonByText(patterns) {
  const candidates = getClickableCandidates();
  for (const candidate of candidates) {
    const text = getCandidateText(candidate);
    if (patterns.some((pattern) => pattern.test(text))) {
      return candidate;
    }
  }
  return null;
}

function hasCandidateText(candidate, patterns) {
  const text = getCandidateText(candidate);
  return patterns.some((pattern) => pattern.test(text));
}

function fillInput(input, value) {
  input.focus();
  if ('value' in input) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
  } else {
    input.textContent = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickNode(node) {
  try {
    node.scrollIntoView?.({ behavior: 'auto', block: 'center', inline: 'center' });
  } catch {
    // Best effort.
  }
  try {
    node.focus?.();
  } catch {
    // Best effort.
  }
  node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  node.click();
}

async function waitFor(predicate, timeoutMs = 20000, intervalMs = 200) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = predicate();
    if (value) return value;
    await sleep(intervalMs);
  }
  return predicate();
}

function getEmailInput() {
  return queryVisible([
    'input[type="email"]',
    'input[inputmode="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
    'input[type="text"][name*="email" i]',
    'input[type="text"][id*="email" i]',
    'input[placeholder*="email" i]',
    'input[aria-label*="email" i]',
    'input[placeholder*="邮箱"]',
    'input[aria-label*="邮箱"]',
    'input[placeholder*="電子郵件"]',
    'input[aria-label*="電子郵件"]',
    'input[placeholder*="メール"]',
    'input[aria-label*="メール"]',
  ]);
}

function getPasswordInput() {
  return queryVisible([
    'input[type="password"]',
    'input[name*="password" i]',
    'input[autocomplete="new-password"]',
    'input[autocomplete="current-password"]',
  ]);
}

function getPhoneInput() {
  return queryVisible([
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[id*="phone" i]',
    'input[autocomplete="tel"]',
    'input[placeholder*="phone" i]',
    'input[aria-label*="phone" i]',
    'input[placeholder*="手机"]',
    'input[placeholder*="电话"]',
    'input[aria-label*="手机"]',
    'input[aria-label*="电话"]',
  ]);
}

function getVerificationInputs() {
  if (isAboutYouPage() || isAgeQuestionPage() || isNameQuestionPage()) {
    return [];
  }
  const selectors = [
    'input[autocomplete="one-time-code"]',
    'input[inputmode="numeric"]',
    'input[name*="code" i]',
    'input[id*="code" i]',
    'input[placeholder*="code" i]',
    'input[aria-label*="code" i]',
    'input[placeholder*="验证码"]',
    'input[aria-label*="验证码"]',
    'input[placeholder*="認証"]',
    'input[aria-label*="認証"]',
  ];
  const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  return Array.from(new Set(nodes))
    .filter((node) => isVisible(node) && !node.disabled && !node.readOnly);
}

function getContinueButton() {
  return findButtonByText([
    /continue/i,
    /next/i,
    /sign\s*up/i,
    /create/i,
    /submit/i,
    /继续/,
    /下一步/,
    /注册/,
    /创建/,
    /確認|続行|次へ/,
  ]);
}

function getButtonByText(patterns) {
  return findButtonByText(patterns);
}

function isCodexChatGptConsentUrl() {
  return /\/sign-in-with-chatgpt\/codex\/consent(?:[/?#]|$)/i.test(location.pathname);
}

function getEnabledSubmitButton() {
  return Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], form button:not([type])'))
    .filter((candidate) => isVisible(candidate) && !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true')
    .find((candidate) => {
      const text = getCandidateText(candidate);
      return !/cancel|back|deny|取消|返回|拒绝/i.test(text);
    }) || null;
}

function getOAuthConsentButton() {
  if (isCodexChatGptConsentUrl()) {
    const submitButton = getEnabledSubmitButton();
    if (submitButton) return submitButton;
  }

  const button = findButtonByText([
    /continue/i,
    /continue\s+(?:to|as|with)\s+codex/i,
    /authorize/i,
    /allow/i,
    /confirm/i,
    /approve/i,
    /accept/i,
    /继续/,
    /继续操作/,
    /确认/,
    /同意/,
    /授权/,
    /允许/,
    /使用\s*Codex/,
    /继续使用\s*Codex/,
    /確認|許可|続行/,
  ]);
  if (button) return button;
  if (!isOAuthConsentPage()) return null;

  const rejectPatterns = [
    /cancel/i,
    /back/i,
    /deny/i,
    /取消/,
    /返回/,
    /拒绝/,
  ];
  const primaryButtons = getClickableCandidates().filter((candidate) => {
    const tagName = candidate.tagName.toLowerCase();
    const role = String(candidate.getAttribute('role') || '').toLowerCase();
    const isButton = tagName === 'button'
      || role === 'button'
      || candidate.matches('input[type="button"], input[type="submit"]');
    return isButton && !hasCandidateText(candidate, rejectPatterns);
  });
  const fallbackSubmit = getEnabledSubmitButton();
  return primaryButtons[primaryButtons.length - 1] || fallbackSubmit || null;
}

function findAccountOptionByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const directCandidates = Array.from(document.querySelectorAll([
    'button',
    'a',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]',
  ].join(',')));
  const direct = directCandidates.find((candidate) => {
    if (!isVisible(candidate) || candidate.disabled || candidate.getAttribute('aria-disabled') === 'true') {
      return false;
    }
    return getCandidateText(candidate).toLowerCase().includes(normalizedEmail);
  });
  if (direct) return direct;

  const emailTextPattern = new RegExp(escapeRegExp(normalizedEmail), 'i');
  const textNodes = Array.from(document.querySelectorAll('body *')).filter((node) => {
    if (!isVisible(node)) return false;
    const text = normalizeText(node.textContent || '');
    return emailTextPattern.test(text);
  });
  for (const node of textNodes) {
    const clickable = node.closest('button, a, [role="button"], [role="link"], [tabindex]');
    if (clickable && isVisible(clickable) && !clickable.disabled && clickable.getAttribute('aria-disabled') !== 'true') {
      return clickable;
    }
  }
  return null;
}

function getSkipButton() {
  return findButtonByText([
    /skip/i,
    /not\s+now/i,
    /maybe\s+later/i,
    /跳过/,
    /暂不/,
    /稍后/,
    /スキップ/,
    /後で/,
  ]);
}

function getRegistrationGuideActionButton() {
  const actionPatterns = [
    /skip/i,
    /not\s+now/i,
    /maybe\s+later/i,
    /continue/i,
    /next/i,
    /done/i,
    /finish/i,
    /start/i,
    /get\s+started/i,
    /agree/i,
    /accept/i,
    /allow/i,
    /confirm/i,
    /跳过/,
    /暂不/,
    /稍后/,
    /继续/,
    /下一步/,
    /同意/,
    /接受/,
    /允许/,
    /确认/,
    /完成/,
    /开始/,
    /开始使用/,
    /スキップ/,
    /続行/,
    /次へ/,
    /同意/,
    /許可/,
    /完了/,
    /始める/,
  ];
  const rejectPatterns = [
    /back/i,
    /cancel/i,
    /deny/i,
    /decline/i,
    /返回/,
    /取消/,
    /拒绝/,
  ];
  return getClickableCandidates().find((candidate) => {
    const text = getCandidateText(candidate);
    return text
      && actionPatterns.some((pattern) => pattern.test(text))
      && !rejectPatterns.some((pattern) => pattern.test(text));
  }) || null;
}

function isChatGptHost() {
  return ['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com'].includes(location.hostname);
}

function isRegistrationBlockingPhase(phase) {
  return ['verification', 'password', 'email', 'profile', 'survey', 'ready'].includes(phase);
}

function isUseReasonSurveyPage() {
  const text = normalizeText(document.body?.innerText || document.body?.textContent || '');
  return /是什么促使你使用\s*ChatGPT/.test(text)
    || /what\s+brings\s+you\s+to\s+chatgpt/i.test(text)
    || /what\s+prompted\s+you\s+to\s+use\s+chatgpt/i.test(text)
    || /use\s+these\s+details\s+to\s+suggest/i.test(text);
}

function isRegistrationGuidePage() {
  if (isProfilePagePresent()) {
    return false;
  }
  return isUseReasonSurveyPage()
    || isReadyPage()
    || /welcome|onboarding|get started|personalize|introduce yourself|let'?s get started|tell us about yourself|new to chatgpt|before you continue|terms|privacy|欢迎|开始使用|个性化|介绍一下|继续|下一步|同意/i.test(getPageText())
      && Boolean(getRegistrationGuideActionButton());
}

function isReadyPage() {
  const text = normalizeText(document.body?.innerText || document.body?.textContent || '');
  return /你已准备就绪/.test(text)
    || /you'?re\s+ready/i.test(text)
    || /you\s+are\s+ready/i.test(text)
    || /ChatGPT\s+可能会出错/.test(text)
    || /do\s+not\s+share\s+sensitive\s+information/i.test(text);
}

function isOAuthConsentPage() {
  const text = normalizeText(document.body?.innerText || document.body?.textContent || '');
  return isCodexChatGptConsentUrl()
    || /使用\s*ChatGPT\s*登录到\s*Codex/i.test(text)
    || /ChatGPT\s*将与\s*Codex\s*共享/.test(text)
    || /共享你的姓名、电子邮箱/.test(text)
    || /sign\s+in\s+to\s+Codex\s+with\s+ChatGPT/i.test(text)
    || /share\s+your\s+name.*email/i.test(text)
    || /continue\s+(?:to|as|with)\s+codex/i.test(text)
    || /authorize\s+codex/i.test(text)
    || /codex/i.test(text) && /continue|allow|authorize|approve|confirm|继续|授权|允许|确认|同意/i.test(text);
}

async function readChatGptSessionState() {
  if (!isChatGptHost()) {
    return { hasSession: false, sessionEmail: '', accessTokenPresent: false };
  }
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
    const session = await response.json().catch(() => ({}));
    const email = String(session?.user?.email || session?.user?.emailAddress || '').trim();
    const accessToken = String(session?.accessToken || '').trim();
    return {
      hasSession: Boolean(email || accessToken),
      sessionEmail: email,
      accessTokenPresent: Boolean(accessToken),
    };
  } catch (error) {
    return {
      hasSession: false,
      sessionEmail: '',
      accessTokenPresent: false,
      sessionError: error.message || String(error),
    };
  }
}

function getSubmitButtonForInput(input) {
  const formButton = input?.form?.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
  if (formButton && isVisible(formButton) && !formButton.disabled) {
    return formButton;
  }

  let parent = input?.parentElement;
  for (let depth = 0; parent && depth < 5; depth += 1, parent = parent.parentElement) {
    const scopedButton = Array.from(parent.querySelectorAll('button, input[type="submit"], [role="button"]'))
      .find((candidate) => isVisible(candidate) && !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true');
    if (scopedButton) return scopedButton;
  }

  return getContinueButton();
}

function submitInput(input) {
  const button = getSubmitButtonForInput(input);
  if (button) {
    clickNode(button);
    return true;
  }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
  return false;
}

function submitInputAfterResponse(input) {
  const button = getSubmitButtonForInput(input);
  if (button) {
    setTimeout(() => clickNode(button), 120);
    return true;
  }
  setTimeout(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
  }, 120);
  return false;
}

async function openEmailSignupOption() {
  const emailButton = findButtonByText(EMAIL_SIGNUP_PATTERNS);
  if (emailButton) {
    clickNode(emailButton);
    await sleep(800);
    return true;
  }
  return false;
}

async function openSignupEntry() {
  if (getEmailInput() || getPasswordInput()) {
    return true;
  }

  const signupButton = findButtonByText(SIGNUP_ENTRY_PATTERNS);
  if (signupButton) {
    clickNode(signupButton);
    await sleep(1500);
    await openEmailSignupOption();
    return true;
  }
  await openEmailSignupOption();
  return Boolean(getEmailInput() || getPasswordInput());
}

async function startSignupWithEmail(payload) {
  const email = String(payload.email || '').trim();
  const password = String(payload.password || '').trim();
  if (!email) throw new Error('缺少邮箱。');
  if (!password) throw new Error('缺少密码。');

  if (!payload.skipOpenEntry) {
    await openSignupEntry();
  }
  await openEmailSignupOption();

  const firstInput = await waitFor(() => getEmailInput() || getPasswordInput(), 25000);
  if (!firstInput) {
    throw new Error('未找到邮箱输入框。');
  }

  if (firstInput.type !== 'password') {
    fillInput(firstInput, email);
    await sleep(300);
    submitInput(firstInput);
  }

  const passwordInput = await waitFor(getPasswordInput, 25000);
  if (!passwordInput) {
    throw new Error('未找到密码输入框。');
  }
  fillInput(passwordInput, password);
  await sleep(300);
  if (!submitInputAfterResponse(passwordInput)) {
    throw new Error('未找到密码页继续按钮。');
  }
  return {
    email,
    phase: 'password-submitted',
  };
}

function detectOpenAiPhase() {
  if (isProfilePagePresent()) {
    return { phase: 'profile' };
  }
  if (getVerificationInputs().length > 0) {
    return { phase: 'verification' };
  }
  if (getPhoneInput()) {
    return { phase: 'phone' };
  }
  if (getPasswordInput()) {
    return { phase: 'password' };
  }
  if (getEmailInput()) {
    return { phase: 'email' };
  }
  if (isOAuthConsentPage()) {
    return { phase: 'consent' };
  }
  if (isUseReasonSurveyPage()) {
    return { phase: 'survey' };
  }
  if (isReadyPage()) {
    return { phase: 'ready' };
  }
  return { phase: 'unknown' };
}

async function prepareOAuthEmailLogin(payload) {
  const email = String(payload.email || '').trim();
  if (!email) throw new Error('缺少邮箱。');

  const existingVerificationInputs = getVerificationInputs();
  if (existingVerificationInputs.length > 0) {
    return { phase: 'verification' };
  }

  const consentButton = isOAuthConsentPage() ? getOAuthConsentButton() : findButtonByText([
    /continue/i,
    /authorize/i,
    /allow/i,
    /confirm/i,
    /同意/,
    /授权/,
    /继续/,
    /確認|許可|続行/,
  ]);
  if (consentButton) {
    return { phase: 'consent' };
  }

  const accountOption = await waitFor(() => findAccountOptionByEmail(email) || getEmailInput(), 12000);
  if (accountOption && accountOption !== getEmailInput()) {
    clickNode(accountOption);
    await sleep(1200);
    return { phase: 'account-selected' };
  }

  const emailInput = getEmailInput();
  if (!emailInput) {
    throw new Error('未找到账号选择项或邮箱输入框。');
  }

  fillInput(emailInput, email);
  await sleep(300);
  submitInput(emailInput);
  await sleep(1200);

  if (getVerificationInputs().length > 0) {
    return { phase: 'verification' };
  }
  return { phase: 'email-submitted' };
}

async function submitEmailCode(payload) {
  const code = String(payload.code || '').replace(/\D/g, '').trim();
  if (!code) throw new Error('缺少邮箱验证码。');

  const inputs = await waitFor(() => {
    const found = getVerificationInputs();
    return found.length > 0 ? found : null;
  }, 25000);

  if (!inputs || inputs.length === 0) {
    throw new Error('未找到验证码输入框，请确认 OpenAI 页面已经到邮箱验证码页。');
  }

  const singleCharInputs = inputs.filter((input) => Number(input.maxLength) === 1 || inputs.length >= code.length);
  if (singleCharInputs.length >= code.length) {
    code.split('').forEach((digit, index) => {
      fillInput(singleCharInputs[index], digit);
    });
    submitInput(singleCharInputs[Math.min(code.length - 1, singleCharInputs.length - 1)]);
  } else {
    fillInput(inputs[0], code);
    submitInput(inputs[0]);
  }

  await sleep(500);
  const continueButton = getContinueButton();
  if (continueButton) {
    clickNode(continueButton);
  }
  await clearTransientOnboardingPages(10000);
  return { codeLength: code.length };
}

function randomProfile() {
  const firstNames = ['Lina', 'Nora', 'Milo', 'Ada', 'Evan', 'Iris'];
  const lastNames = ['Chen', 'Lin', 'Wang', 'Zhao', 'Liu', 'Xu'];
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const age = 20 + Math.floor(Math.random() * 21);
  const today = new Date();
  const birthDate = new Date(today.getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  if (birthDate > today) {
    birthDate.setFullYear(birthDate.getFullYear() - 1);
  }
  return {
    firstName: pick(firstNames),
    lastName: pick(lastNames),
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    age: String(age),
    month: String(birthDate.getMonth() + 1),
    day: String(birthDate.getDate()),
    year: String(birthDate.getFullYear()),
  };
}

function getPageText() {
  return normalizeText(document.body?.innerText || document.body?.textContent || '');
}

function isAboutYouPage() {
  return /\/about-you(?:[/?#]|$)/i.test(location.pathname);
}

function isAgeQuestionPage() {
  const text = getPageText();
  return isAboutYouPage()
    || /你的年龄是多少|年龄是多少|请输入你的年龄|这有助于我们根据隐私政策|how old are you|what'?s your age|your age|privacy policy/i.test(text);
}

function isNameQuestionPage() {
  const text = getPageText();
  return /你的名字|你叫什么|姓名|名字|what'?s your name|your name|full name|first name|last name/i.test(text);
}

function getGenericProfileInputs() {
  const verificationInputs = new Set(getVerificationInputs());
  return Array.from(document.querySelectorAll('input, [role="textbox"], [contenteditable="true"]'))
    .filter((input) => {
      const type = String(input.type || '').toLowerCase();
      const tagName = String(input.tagName || '').toLowerCase();
      return isVisible(input)
      && !input.disabled
      && !input.readOnly
      && input.getAttribute('aria-disabled') !== 'true'
      && !verificationInputs.has(input)
      && (tagName !== 'input' || !['hidden', 'password', 'email', 'checkbox', 'radio', 'submit', 'button'].includes(type))
      && !/email|phone|tel|code|otp|password/i.test([
        input.name,
        input.id,
        input.placeholder,
        input.getAttribute('aria-label'),
        input.getAttribute('autocomplete'),
      ].filter(Boolean).join(' '))
    });
}

function findInputByHints(hints) {
  const inputs = Array.from(document.querySelectorAll('input, select'));
  return inputs.find((input) => {
    if (!isVisible(input) || input.disabled || input.readOnly) return false;
    const id = String(input.id || '').trim();
    const escapedId = id && globalThis.CSS?.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const labelText = id
      ? normalizeText(Array.from(document.querySelectorAll(`label[for="${escapedId}"]`)).map((label) => label.textContent).join(' '))
      : '';
    const nearbyText = normalizeText(input.closest('label, fieldset, div, form')?.textContent || '');
    const haystack = normalizeText([
      input.name,
      input.id,
      input.placeholder,
      input.getAttribute('aria-label'),
      input.getAttribute('autocomplete'),
      labelText,
      nearbyText,
    ].filter(Boolean).join(' ')).toLowerCase();
    return hints.some((hint) => haystack.includes(hint));
  }) || null;
}

function getProfileInputs() {
  const fullNameInput = findInputByHints(['full name', 'your name', 'name', '姓名', '名字']);
  const firstNameInput = findInputByHints(['first', 'given', '名']);
  const lastNameInput = findInputByHints(['last', 'family', '姓']);
  const genericInputs = getGenericProfileInputs();
  const ageInput = findInputByHints(['age', '年龄', '年齢'])
    || (isAgeQuestionPage() ? genericInputs.find((input) => {
      const type = String(input.type || '').toLowerCase();
      const inputMode = String(input.getAttribute?.('inputmode') || '').toLowerCase();
      return type === 'number' || type === 'tel' || type === 'text' || inputMode === 'numeric' || inputMode === 'decimal' || !type;
    }) || genericInputs[0] : null);
  const monthInput = findInputByHints(['month', '月']);
  const dayInput = findInputByHints(['day', '日']);
  const yearInput = findInputByHints(['year', '年']);
  const nameFallbacks = isNameQuestionPage()
    ? genericInputs.filter((input) => input !== ageInput)
    : [];
  return {
    fullNameInput,
    firstNameInput: firstNameInput || (!fullNameInput ? nameFallbacks[0] : null) || null,
    lastNameInput: lastNameInput || nameFallbacks[1] || null,
    ageInput,
    monthInput,
    dayInput,
    yearInput,
  };
}

function isProfilePagePresent() {
  const {
    fullNameInput,
    firstNameInput,
    lastNameInput,
    ageInput,
    monthInput,
    dayInput,
    yearInput,
  } = getProfileInputs();
  return Boolean(
    fullNameInput
    || firstNameInput
    || lastNameInput
    || ageInput
    || isAgeQuestionPage()
    || isNameQuestionPage()
    || (monthInput && dayInput && yearInput)
  );
}

async function fillProfile() {
  if (await continueReadyPageIfPresent(1200)) {
    return { skipped: true, reason: 'ready-page' };
  }
  const profile = randomProfile();
  const inputs = await waitFor(() => {
    const current = getProfileInputs();
    return current.fullNameInput
      || current.firstNameInput
      || current.lastNameInput
      || current.ageInput
      || current.monthInput
      || current.dayInput
      || current.yearInput
      ? current
      : null;
  }, isAboutYouPage() ? 12000 : 3000);
  const {
    fullNameInput,
    firstNameInput,
    lastNameInput,
    ageInput,
    monthInput,
    dayInput,
    yearInput,
  } = inputs || getProfileInputs();

  if (fullNameInput) fillInput(fullNameInput, profile.fullName);
  if (firstNameInput && firstNameInput !== fullNameInput) fillInput(firstNameInput, profile.firstName);
  if (lastNameInput) fillInput(lastNameInput, profile.lastName);
  if (ageInput) {
    fillInput(ageInput, profile.age);
  } else {
    if (monthInput) fillInput(monthInput, profile.month);
    if (dayInput) fillInput(dayInput, profile.day);
    if (yearInput) fillInput(yearInput, profile.year);
  }

  if (!fullNameInput && !firstNameInput && !lastNameInput && !ageInput && !monthInput && !dayInput && !yearInput) {
    await clearTransientOnboardingPages(3000);
    return { skipped: true, reason: 'profile-page-not-present' };
  }

  await sleep(400);
  const continueButton = getContinueButton();
  if (continueButton) {
    clickNode(continueButton);
  } else if (isAboutYouPage() && (ageInput || fullNameInput || firstNameInput || lastNameInput)) {
    const submitTarget = ageInput || fullNameInput || firstNameInput || lastNameInput;
    submitInput(submitTarget);
  }
  await clearTransientOnboardingPages();
  return profile;
}

async function getRegistrationCompletionSnapshot() {
  const phase = detectOpenAiPhase().phase;
  const session = await readChatGptSessionState();
  const chatGptHost = isChatGptHost();
  const blockingPhase = isRegistrationBlockingPhase(phase);
  const completed = Boolean(session.hasSession && chatGptHost && !blockingPhase);
  return {
    completed,
    phase,
    url: location.href,
    chatGptHost,
    shouldNavigateToChatGpt: !chatGptHost && !blockingPhase,
    ...session,
  };
}

async function waitForRegistrationCompletion(payload = {}) {
  const timeoutMs = Number(payload.timeoutMs || 90000);
  const intervalMs = Number(payload.intervalMs || 1000);
  const startedAt = Date.now();
  let lastSnapshot = await getRegistrationCompletionSnapshot();

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await getRegistrationCompletionSnapshot();
    if (lastSnapshot.completed) {
      return {
        ...lastSnapshot,
        elapsedMs: Date.now() - startedAt,
      };
    }
    if (lastSnapshot.shouldNavigateToChatGpt) {
      location.assign(CHATGPT_HOME_URL);
      return {
        ...lastSnapshot,
        phase: 'navigating-chatgpt',
        navigated: true,
        elapsedMs: Date.now() - startedAt,
      };
    }

    const phase = lastSnapshot.phase;
    if (phase === 'profile') {
      await fillProfile();
      await sleep(1400);
    } else if (phase === 'survey' || phase === 'ready') {
      await clearTransientOnboardingPages(5000);
      await sleep(1200);
    }

    await sleep(intervalMs);
  }

  return {
    ...lastSnapshot,
    completed: false,
    elapsedMs: Date.now() - startedAt,
    error: `注册完成确认超时，当前阶段：${lastSnapshot.phase || 'unknown'}`,
  };
}

async function completeRegistrationAfterEmail(payload = {}) {
  const timeoutMs = Number(payload.timeoutMs || 90000);
  const intervalMs = Number(payload.intervalMs || 1000);
  const stableCompletionMs = Number(payload.stableCompletionMs || 5000);
  const startedAt = Date.now();
  let lastResult = null;
  let profileFillCount = 0;
  let guideHandledCount = 0;
  let completedSince = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const phase = detectOpenAiPhase().phase;
    if (phase === 'survey' || phase === 'ready' || isRegistrationGuidePage()) {
      const handled = await clearTransientOnboardingPages(5000);
      if (handled) {
        guideHandledCount += 1;
      }
      completedSince = 0;
      await sleep(1200);
    } else if (phase === 'profile' || isProfilePagePresent()) {
      await fillProfile();
      profileFillCount += 1;
      completedSince = 0;
      await sleep(1400);
    }

    lastResult = await getRegistrationCompletionSnapshot();
    if (lastResult.completed) {
      if (!completedSince) {
        completedSince = Date.now();
      }
      const stableForMs = Date.now() - completedSince;
      if (stableForMs >= stableCompletionMs) {
        return {
          ...lastResult,
          profileFillCount,
          guideHandledCount,
          stableForMs,
          elapsedMs: Date.now() - startedAt,
        };
      }
      await sleep(Math.min(intervalMs, Math.max(300, stableCompletionMs - stableForMs)));
      continue;
    } else {
      completedSince = 0;
    }
    if (lastResult.shouldNavigateToChatGpt) {
      location.assign(CHATGPT_HOME_URL);
      return {
        ...lastResult,
        phase: 'navigating-chatgpt',
        navigated: true,
        profileFillCount,
        guideHandledCount,
        elapsedMs: Date.now() - startedAt,
      };
    }

    await sleep(intervalMs);
  }

  return {
    ...(lastResult || {}),
    completed: false,
    profileFillCount,
    guideHandledCount,
    elapsedMs: Date.now() - startedAt,
    error: `注册完成确认超时，当前阶段：${lastResult?.phase || detectOpenAiPhase().phase || 'unknown'}`,
  };
}

async function clearTransientOnboardingPages(timeoutMs = 8000) {
  const startedAt = Date.now();
  let handled = false;

  while (Date.now() - startedAt < timeoutMs) {
    if (!isRegistrationGuidePage()) {
      break;
    }

    const actionButton = await waitFor(() => {
      if (!isRegistrationGuidePage()) return null;
      return getSkipButton() || getRegistrationGuideActionButton() || getContinueButton();
    }, Math.min(1800, Math.max(300, timeoutMs - (Date.now() - startedAt))));
    if (!actionButton) {
      break;
    }

    clickNode(actionButton);
    handled = true;
    await sleep(1000);
  }

  return handled;
}

async function skipUseReasonSurveyIfPresent(timeoutMs = 8000) {
  if (!isUseReasonSurveyPage()) {
    return false;
  }
  const skipButton = await waitFor(() => {
    if (!isUseReasonSurveyPage()) return null;
    return getSkipButton();
  }, timeoutMs);
  if (skipButton) {
    clickNode(skipButton);
    return true;
  }
  return false;
}

async function continueReadyPageIfPresent(timeoutMs = 8000) {
  if (!isReadyPage()) {
    return false;
  }
  const continueButton = await waitFor(() => {
    if (!isReadyPage()) return null;
    return getContinueButton();
  }, timeoutMs);
  if (continueButton) {
    clickNode(continueButton);
    return true;
  }
  return false;
}

async function submitPhone(payload) {
  const phone = String(payload.phone || '').trim();
  if (!phone) throw new Error('缺少手机号。');

  const phoneInput = await waitFor(getPhoneInput, 20000);
  if (!phoneInput) {
    throw new Error('未找到手机号输入框。若页面还没到手机号验证，请先完成登录验证码或 OAuth 前置页面。');
  }
  fillInput(phoneInput, phone);
  await sleep(300);
  const continueButton = getContinueButton();
  if (continueButton) {
    clickNode(continueButton);
  }
  return { phone };
}

async function submitPhoneCode(payload) {
  const code = String(payload.code || '').replace(/\D/g, '').trim();
  if (!code) throw new Error('缺少短信验证码。');

  const inputs = await waitFor(() => {
    const found = getVerificationInputs();
    return found.length > 0 ? found : null;
  }, 25000);

  if (!inputs || inputs.length === 0) {
    throw new Error('未找到短信验证码输入框，请确认页面已经到手机号验证码页。');
  }

  const singleCharInputs = inputs.filter((input) => Number(input.maxLength) === 1 || inputs.length >= code.length);
  if (singleCharInputs.length >= code.length) {
    code.split('').forEach((digit, index) => {
      fillInput(singleCharInputs[index], digit);
    });
    submitInput(singleCharInputs[Math.min(code.length - 1, singleCharInputs.length - 1)]);
  } else {
    fillInput(inputs[0], code);
    submitInput(inputs[0]);
  }

  await sleep(500);
  const continueButton = getContinueButton();
  if (continueButton) {
    clickNode(continueButton);
  }
  return { codeLength: code.length };
}

async function clickOauthConsent() {
  const button = await waitFor(() => {
    if (isOAuthConsentPage()) {
      return getOAuthConsentButton();
    }
    return findButtonByText([
    /continue/i,
    /continue\s+(?:to|as|with)\s+codex/i,
    /authorize/i,
    /allow/i,
    /confirm/i,
    /approve/i,
    /accept/i,
    /同意/,
    /授权/,
    /继续/,
    /確認|許可|続行/,
    ]);
  }, 25000);
  if (!button) {
    const form = Array.from(document.querySelectorAll('form')).find(isVisible);
    if (form) {
      const submitButton = getEnabledSubmitButton();
      if (submitButton) {
        form.requestSubmit?.(submitButton);
      } else {
        form.requestSubmit?.();
      }
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      return { submittedForm: true };
    }
    throw new Error(`未找到 OAuth 同意页继续按钮。当前页面文本：${getPageText().slice(0, 180)}`);
  }
  clickNode(button);
  await sleep(800);
  const followUpButton = isOAuthConsentPage() ? getOAuthConsentButton() : null;
  if (followUpButton && followUpButton !== button) {
    clickNode(followUpButton);
  }
  return {};
}
})();
