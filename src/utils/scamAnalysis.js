export const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'mail.com', 'ymail.com', 'msn.com',
];

export const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'buff.ly', 'short.io',
  'rebrand.ly', 'cutt.ly', 'rb.gy', 'is.gd', 'v.gd', 'tiny.cc', 'bl.ink',
];

export const TEXT_SCAM_PATTERNS = [
  { id: 'urgent', label: 'Urgency / pressure', re: /\b(urgent|immediately|act now|within 24 hours|limited time|expires today|respond asap|last chance|time sensitive|final notice)\b/gi },
  { id: 'prize', label: 'Prize / lottery / windfall', re: /\b(you.ve? won|you are a winner|lottery|jackpot|prize|claim your|million dollars?|inheritance|next of kin|unclaimed funds?|beneficiary)\b/gi },
  { id: 'money', label: 'Money / payment request', re: /\b(wire transfer|western union|moneygram|bitcoin|crypto|gift card|itunes card|google play card|send money|transfer funds?|pay via)\b/gi },
  { id: 'creds', label: 'Credential / info request', re: /\b(verify your (account|identity|details)|confirm your (password|pin|ssn|bank account|credit card)|log ?in to confirm|suspended|account locked|unusual activity|security alert)\b/gi },
  { id: 'impersonate', label: 'Impersonation signals', re: /\b(microsoft|apple|amazon|paypal|netflix|your bank|australian tax|ato|irs|hmrc|federal bureau|fbi|interpol|official notice|government department)\b/gi },
  { id: 'secrecy', label: 'Secrecy / confidentiality', re: /\b(keep (this |it )?confidential|do not (tell|share|discuss)|strictly private|top secret|for your eyes only)\b/gi },
  { id: 'threat', label: 'Threat / fear tactic', re: /\b(legal action|arrest warrant|court order|suspend your account|cancel your (service|subscription)|report you|law enforcement|your account will be (closed|terminated))\b/gi },
  { id: 'grammar', label: 'Scam phrasing patterns', re: /(\bkindly\b|\bdo the needful\b|\bdearest\b|\bbeloved\b|\bGod bless you\b|\bAllah\b.*\btransfer\b|\brespected sir\b|\bdear friend\b.*\bproposal\b)/gi },
];

const OFFICIAL_BRAND_SUFFIXES = [
  { brand: 'PayPal', suffixes: ['paypal.com'] },
  { brand: 'Amazon', suffixes: ['amazon.com', 'amazon.co.uk', 'amazon.com.au', 'amazon.de', 'amazon.fr'] },
  { brand: 'Apple', suffixes: ['apple.com'] },
  { brand: 'Microsoft', suffixes: ['microsoft.com', 'live.com', 'outlook.com'] },
  { brand: 'Netflix', suffixes: ['netflix.com'] },
  { brand: 'Google', suffixes: ['google.com', 'gmail.com', 'youtube.com'] },
  { brand: 'Facebook', suffixes: ['facebook.com', 'fb.com', 'meta.com'] },
  { brand: 'Commonwealth Bank', suffixes: ['commbank.com.au'] },
  { brand: 'NAB', suffixes: ['nab.com.au'] },
  { brand: 'Westpac', suffixes: ['westpac.com.au'] },
  { brand: 'ANZ', suffixes: ['anz.com', 'anz.com.au'] },
];

const BRAND_KEYWORDS = [
  { brand: 'PayPal', re: /paypa[l1]|pay-pal|paypa1/i },
  { brand: 'Amazon', re: /amaz[o0]n|amazonn|amazom/i },
  { brand: 'Apple', re: /app[l1]e-id|app[l1]e-support|icloud-verify/i },
  { brand: 'Microsoft', re: /micros[o0]ft|microsfot/i },
  { brand: 'Netflix', re: /netf[l1]ix|netfl1x/i },
  { brand: 'ATO', re: /ato[-.]?(refund|verify|gov)|australian[-.]?tax/i },
  { brand: 'MyGov', re: /my[-.]?gov[-.]?(verify|login|claim)/i },
];

const CREDENTIAL_PATH_RE = /\b(login|signin|sign-in|verify|secure|account|wallet|claim|otp|2fa|authenticate|update-password|reset-password)\b/i;

export function computeVerdict(total) {
  if (total === 0) return 'safe';
  if (total <= 2) return 'suspicious';
  return 'scam';
}

export function analyseTextPatterns(text) {
  return TEXT_SCAM_PATTERNS
    .map(pattern => ({
      ...pattern,
      hits: [...text.matchAll(pattern.re)].map(match => match[0].toLowerCase()),
    }))
    .filter(pattern => pattern.hits.length > 0);
}

export function analyseEmailSender(sender) {
  const flags = [];
  const value = sender.trim().toLowerCase();
  if (!value) return flags;

  const domain = (value.match(/@([\w.-]+)$/) || [])[1] || '';
  const local = value.split('@')[0] || '';

  if (FREE_EMAIL_PROVIDERS.includes(domain) && /\b(bank|ato|tax|gov|amazon|paypal|microsoft|apple|netflix|support|security|noreply|admin|service)\b/.test(value)) {
    flags.push('Free email provider (e.g. Gmail) pretending to be a company or service');
  }
  if (/[a-z]{1,4}[0-9]{5,}|[0-9]{4,}[a-z]{1,4}/.test(local)) {
    flags.push('Username looks auto-generated (random letters and numbers)');
  }
  if (domain && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    flags.push('Sender domain looks malformed or unusual');
  }
  return flags;
}

function isOfficialBrandHost(host, brandEntry) {
  const normalised = host.toLowerCase().replace(/^www\./, '');
  return brandEntry.suffixes.some(suffix => normalised === suffix || normalised.endsWith(`.${suffix}`));
}

function checkBrandImpersonation(host) {
  const flags = [];
  const normalised = host.toLowerCase().replace(/^www\./, '');

  for (const { brand, re } of BRAND_KEYWORDS) {
    if (!re.test(normalised)) continue;
    const official = OFFICIAL_BRAND_SUFFIXES.find(entry => entry.brand === brand);
    if (official && isOfficialBrandHost(normalised, official)) continue;
    flags.push(`Domain resembles ${brand} but is not an official site`);
  }

  const parts = normalised.split('.');
  if (parts.length > 2) {
    const subdomain = parts.slice(0, -2).join('.');
    for (const { brand, re } of BRAND_KEYWORDS) {
      if (re.test(subdomain)) {
        flags.push(`Known brand "${brand}" appears in subdomain — real site may be ${parts.slice(-2).join('.')}`);
      }
    }
  }

  return flags;
}

export function normaliseUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function analyseSingleUrl(raw) {
  const flags = [];
  const detail = { scheme: '', host: '', path: '', registrable: '' };

  try {
    const normalised = normaliseUrl(raw) || raw;
    const url = new URL(normalised);
    detail.scheme = url.protocol.replace(':', '');
    detail.host = url.hostname;
    detail.path = `${url.pathname}${url.search}`;
    detail.registrable = url.hostname.replace(/^www\./, '');

    const host = url.hostname.replace(/^www\./, '');

    if (['javascript:', 'data:', 'file:', 'blob:'].includes(url.protocol)) {
      flags.push(`Dangerous URL scheme: ${url.protocol} — never open from an unknown link`);
      return { flags, detail };
    }

    if (URL_SHORTENERS.includes(host)) {
      flags.push(`Shortened URL hides the real destination: ${raw.slice(0, 55)}${raw.length > 55 ? '…' : ''}`);
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      flags.push(`IP address used as domain: ${host}`);
    }
    if (/[^\x00-\x7F]/.test(host)) {
      flags.push('Non-ASCII characters in domain — possible homoglyph impersonation');
    }
    if (/xn--/i.test(host)) {
      flags.push('Punycode domain (xn--) — may visually mimic a well-known brand');
    }
    if (url.protocol === 'http:') {
      flags.push('Uses HTTP, not HTTPS — credentials could be intercepted');
    }
    if (raw.includes('@')) {
      flags.push('@ symbol in URL can hide the real destination host');
    }
    if (raw.length > 120 || (url.search?.length || 0) > 80) {
      flags.push('Unusually long or encoded URL — may be obfuscating the destination');
    }
    if (CREDENTIAL_PATH_RE.test(`${url.pathname}${url.search}`)) {
      flags.push('Path looks like a login, verify, or payment page');
    }

    flags.push(...checkBrandImpersonation(host));
  } catch {
    flags.push('URL could not be parsed — treat as suspicious');
  }

  return { flags, detail };
}

export function analyseUrlsInText(text) {
  const flags = [];
  const urls = [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match => match[0]);
  urls.forEach(raw => {
    const { flags: urlFlags } = analyseSingleUrl(raw);
    urlFlags.forEach(flag => flags.push(flag));
  });
  return flags;
}

export function analyseEmail({ sender = '', body = '' }) {
  const text = `${sender} ${body}`;
  const flags = analyseTextPatterns(text);
  const senderFlags = analyseEmailSender(sender);
  const urlFlags = analyseUrlsInText(body);
  const total = flags.length + senderFlags.length + urlFlags.length;
  return { flags, senderFlags, urlFlags, total, verdict: computeVerdict(total) };
}

export function analyseLink(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { url: '', parsed: {}, urlFlags: [], total: 0, verdict: 'safe' };
  }

  const { flags, detail } = analyseSingleUrl(trimmed);
  let verdict = computeVerdict(flags.length);
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) verdict = 'scam';

  return {
    url: normaliseUrl(trimmed) || trimmed,
    raw: trimmed,
    parsed: detail,
    urlFlags: flags,
    total: flags.length,
    verdict,
  };
}

function parseUrlDetail(raw) {
  try {
    const normalised = normaliseUrl(raw) || raw;
    const url = new URL(normalised);
    return {
      scheme: url.protocol.replace(':', ''),
      host: url.hostname,
      path: `${url.pathname}${url.search}`,
      registrable: url.hostname.replace(/^www\./, ''),
    };
  } catch {
    return {};
  }
}

const PAYLOAD_LABELS = {
  url: 'Website link',
  mailto: 'Email address',
  tel: 'Phone number',
  sms: 'SMS message',
  wifi: 'Wi-Fi network',
  vcard: 'Contact card',
  javascript: 'JavaScript code',
  data: 'Embedded data URL',
  text: 'Plain text',
};

export function classifyQrPayload(raw) {
  const decoded = raw.trim();
  if (!decoded) return { type: 'text', decoded: '', label: PAYLOAD_LABELS.text };

  if (/^javascript:/i.test(decoded)) return { type: 'javascript', decoded, label: PAYLOAD_LABELS.javascript };
  if (/^data:/i.test(decoded)) return { type: 'data', decoded, label: PAYLOAD_LABELS.data };
  if (/^mailto:/i.test(decoded)) return { type: 'mailto', decoded, label: PAYLOAD_LABELS.mailto };
  if (/^tel:/i.test(decoded)) return { type: 'tel', decoded, label: PAYLOAD_LABELS.tel };
  if (/^(sms:|smsto:)/i.test(decoded)) return { type: 'sms', decoded, label: PAYLOAD_LABELS.sms };
  if (/^WIFI:/i.test(decoded)) return { type: 'wifi', decoded, label: PAYLOAD_LABELS.wifi };
  if (/^BEGIN:VCARD/i.test(decoded)) return { type: 'vcard', decoded, label: PAYLOAD_LABELS.vcard };
  if (/^https?:\/\//i.test(decoded)) return { type: 'url', decoded, label: PAYLOAD_LABELS.url };
  if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(decoded)) return { type: 'url', decoded, label: PAYLOAD_LABELS.url };
  return { type: 'text', decoded, label: PAYLOAD_LABELS.text };
}

function parseWifiPayload(raw) {
  const ssid = (raw.match(/S:([^;]*)/i) || [])[1] || '';
  const hidden = /H:true/i.test(raw);
  const auth = (raw.match(/T:([^;]*)/i) || [])[1] || '';
  return { ssid: ssid.replace(/\\([:;,"])/g, '$1'), hidden, auth };
}

function parseMailtoPayload(raw) {
  const address = raw.replace(/^mailto:/i, '').split('?')[0];
  return { address: decodeURIComponent(address) };
}

export function analyseQrPayload(raw) {
  const { type, decoded, label } = classifyQrPayload(raw);
  const payloadFlags = [];
  const urlFlags = [];
  const textFlags = analyseTextPatterns(decoded);
  const parsed = {};

  if (type === 'javascript') {
    payloadFlags.push('JavaScript QR codes can run code in your browser — do not open');
  }
  if (type === 'data') {
    payloadFlags.push('Data URLs can embed hidden content — treat as suspicious');
  }

  if (type === 'url') {
    Object.assign(parsed, parseUrlDetail(decoded));
  }

  if (type === 'mailto') {
    const { address } = parseMailtoPayload(decoded);
    parsed.address = address;
    payloadFlags.push(...analyseEmailSender(address));
    if (/\b(verify|secure|support|bank|ato|tax|claim)\b/i.test(address)) {
      payloadFlags.push('Email address uses trust or urgency wording');
    }
  }

  if (type === 'tel' || type === 'sms') {
    parsed.number = decoded.replace(/^(tel:|sms:|smsto:)/i, '').split('?')[0];
    if (/^(\+?1)?900/.test(parsed.number.replace(/\D/g, ''))) {
      payloadFlags.push('Premium-rate phone number pattern detected');
    }
  }

  if (type === 'wifi') {
    const wifi = parseWifiPayload(decoded);
    parsed.ssid = wifi.ssid;
    parsed.auth = wifi.auth;
    if (/^nopass$|^none$/i.test(wifi.auth)) {
      payloadFlags.push('Open Wi-Fi network with no password — common hotspot scam');
    }
    if (/\b(free|public|starbucks|mcdonalds|wifi|guest|login|secure)\b/i.test(wifi.ssid)) {
      payloadFlags.push('SSID mimics a public hotspot name — verify before connecting');
    }
  }

  if (type === 'vcard') {
    parsed.urls = [...decoded.matchAll(/(?:^|\n)URL[^:]*:(.+)$/gim)].map(match => match[1].trim());
    if (/\b(bank|verify|claim|urgent|support)\b/i.test(decoded)) {
      payloadFlags.push('Contact card contains trust or urgency wording');
    }
  }

  if (type === 'text') {
    parsed.urls = [...decoded.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match => match[0]);
  }

  const total = payloadFlags.length + urlFlags.length + textFlags.length;
  let verdict = computeVerdict(total);
  if (type === 'javascript' || type === 'data') verdict = 'scam';

  return {
    decoded,
    payloadType: type,
    payloadLabel: label,
    parsed,
    payloadFlags,
    urlFlags,
    textFlags,
    total,
    verdict,
  };
}
