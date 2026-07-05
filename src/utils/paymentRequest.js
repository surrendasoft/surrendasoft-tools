const dateLabel = value => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export const money = (amount, currency = 'AUD') => new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(Number(amount) || 0);

export function buildBpointUrl(data) {
  const shop = data.bpointShop?.trim();
  if (!shop) throw new Error('Enter the BPOINT shop short name.');
  const parameters = [
    ['BillerCode', data.bpointBillerCode],
    ['Ref1', data.bpointRef1],
    ['Ref2', data.bpointRef2],
    ['Ref3', data.bpointRef3],
  ];
  const amountValue = String(data.bpointAmount ?? '').trim();
  if (amountValue) {
    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid BPOINT amount greater than zero, or leave it blank.');
    parameters.push(['Amount', amount.toFixed(2)]);
  }
  const query = parameters
    .filter(([, value]) => String(value ?? '').trim())
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value).trim())}`)
    .join('&');
  return `https://www.bpoint.com.au/epages/${encodeURIComponent(shop)}.sf/${query ? `?${query}` : ''}`;
}

export function buildPaymentRequest(data) {
  const method = ['link', 'bank', 'both', 'bpoint'].includes(data.method) ? data.method : 'link';
  const isBpoint = method === 'bpoint';
  const rawAmount = isBpoint ? String(data.bpointAmount ?? '').trim() : String(data.amount ?? '').trim();
  const amountProvided = Boolean(rawAmount);
  const amount = amountProvided ? Number(rawAmount) : 0;
  if (!isBpoint && (!Number.isFinite(amount) || amount <= 0)) throw new Error('Enter a payment amount greater than zero.');
  const needsLink = method === 'link' || method === 'both';
  const needsBank = method === 'bank' || method === 'both';
  if (needsLink && !data.paymentUrl?.trim()) throw new Error('Enter the secure payment URL.');
  if (needsBank && !data.accountName?.trim()) throw new Error('Enter the bank account name.');
  if (needsBank && !data.bsb?.trim()) throw new Error('Enter the BSB.');
  if (needsBank && !data.accountNumber?.trim()) throw new Error('Enter the account number.');

  const business = data.businessName?.trim() || 'Your business';
  const customer = data.customerName?.trim() || 'there';
  const amountText = amountProvided ? money(amount, isBpoint ? 'AUD' : (data.currency || 'AUD')) : '';
  const description = data.description?.trim() || 'the supplied services';
  const reference = data.reference?.trim() || (isBpoint ? data.bpointRef1?.trim() : '');
  const due = dateLabel(data.dueDate);
  const link = isBpoint ? buildBpointUrl(data) : data.paymentUrl?.trim();
  const referenceText = reference ? `, reference ${reference}` : '';
  const dueText = due ? `, by ${due}` : '';
  const linkBlock = needsLink || isBpoint ? `\n\n${isBpoint ? 'BPOINT payment link' : 'Secure payment link'}:\n${link}` : '';
  const bankLines = needsBank ? [
    'Bank transfer:',
    `Account name: ${data.accountName.trim()}`,
    `BSB: ${data.bsb.trim()}`,
    `Account number: ${data.accountNumber.trim()}`,
    `Reference: ${(data.bankReference || reference || 'Please include your name').trim()}`,
  ] : [];
  const bankBlock = bankLines.length ? `\n\n${bankLines.join('\n')}` : '';
  const contactLines = [data.contactEmail && `Email: ${data.contactEmail.trim()}`, data.contactPhone && `Phone: ${data.contactPhone.trim()}`].filter(Boolean);
  const notesBlock = data.notes?.trim() ? `\n\n${data.notes.trim()}` : '';
  const contactBlock = contactLines.length ? `\n\nQuestions?\n${contactLines.join('\n')}` : '';
  const paymentSentence = amountProvided ? `please pay ${amountText} for ${description}` : `please use the BPOINT link to make payment for ${description}`;
  const sms = `Hi ${customer}, ${paymentSentence}${referenceText}${dueText}.${linkBlock}${bankBlock}${notesBlock}\n\nThank you,\n${business}`;
  const subject = `Payment request${reference ? ` ${reference}` : ''}`;
  const emailSentence = amountProvided ? `Please pay ${amountText} for ${description}.` : `Please use the BPOINT link below to make payment for ${description}.`;
  const email = `Subject: ${subject}\n\nHi ${customer},\n\n${emailSentence}\n\n${reference ? `Reference: ${reference}\n` : ''}${due ? `Due date: ${due}\n` : ''}${linkBlock}${bankBlock}${notesBlock}${contactBlock}\n\nThank you,\n${business}`.replace(/\n{3,}/g, '\n\n');
  const details = [amountProvided && `Amount: ${amountText}`, reference && `Reference: ${reference}`, due && `Due date: ${due}`, ...bankLines, (needsLink || isBpoint) && `${isBpoint ? 'BPOINT payment link' : 'Payment link'}: ${link}`].filter(Boolean).join('\n');
  const qrContent = link || details;
  return {
    sms, email, details, qrContent, paymentUrl: link || '', provider: isBpoint ? 'bpoint' : '',
    providerWarning: isBpoint ? 'BPOINT fields included in the URL may be locked or pre-filled on the BPOINT payment page.' : '',
    warning: link && !/^https:\/\//i.test(link) ? 'For safety, use a payment URL beginning with https://.' : '',
    referenceWarning: reference ? '' : 'A reference or invoice number is recommended.',
  };
}
