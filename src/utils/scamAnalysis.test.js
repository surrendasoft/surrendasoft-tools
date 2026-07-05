import { describe, expect, it } from 'vitest';
import {
  analyseEmail,
  analyseLink,
  analyseQrPayload,
  analyseSingleUrl,
  classifyQrPayload,
  computeVerdict,
} from './scamAnalysis.js';

describe('scamAnalysis', () => {
  it('scores safe and high-risk email content', () => {
    expect(analyseEmail({ body: 'Thanks for the meeting notes.' }).verdict).toBe('safe');
    expect(analyseEmail({
      body: 'URGENT! Verify your password and bank account now or legal action will follow. Pay with gift card. https://bit.ly/scam',
    }).verdict).toBe('scam');
  });

  it('classifies QR payload types', () => {
    expect(classifyQrPayload('https://example.com/login').type).toBe('url');
    expect(classifyQrPayload('mailto:bank@evil.com').type).toBe('mailto');
    expect(classifyQrPayload('javascript:alert(1)').type).toBe('javascript');
    expect(classifyQrPayload('WIFI:T:WPA;S:Cafe_Free_WiFi;;').type).toBe('wifi');
  });

  it('flags typosquatting and dangerous URL patterns', () => {
    const { flags } = analyseSingleUrl('https://paypa1-secure-verify.xyz/login');
    expect(flags.some(flag => /PayPal/i.test(flag))).toBe(true);
    expect(flags.some(flag => /login/i.test(flag))).toBe(true);
  });

  it('analyses pasted links via analyseLink', () => {
    const result = analyseLink('https://paypa1-secure-verify.xyz/login');
    expect(result.verdict).toBe('suspicious');
    expect(result.parsed.host).toBe('paypa1-secure-verify.xyz');
  });

  it('leaves URL checks to the link tool when decoding QR payloads', () => {
    const result = analyseQrPayload('https://paypa1-secure-verify.xyz/login');
    expect(result.payloadType).toBe('url');
    expect(result.urlFlags).toHaveLength(0);
    expect(result.parsed.host).toBe('paypa1-secure-verify.xyz');
  });

  it('flags javascript QR payloads as scam', () => {
    const result = analyseQrPayload('javascript:alert(document.cookie)');
    expect(result.verdict).toBe('scam');
    expect(result.payloadFlags.some(flag => /JavaScript/i.test(flag))).toBe(true);
  });

  it('computes verdict thresholds', () => {
    expect(computeVerdict(0)).toBe('safe');
    expect(computeVerdict(2)).toBe('suspicious');
    expect(computeVerdict(3)).toBe('scam');
  });
});
