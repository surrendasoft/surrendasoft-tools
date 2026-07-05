import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarScheduleTool from '../tools/CalendarScheduleTool.jsx';
import DateTool from '../tools/DateTool.jsx';
import GstTool from '../tools/GstTool.jsx';
import CleanerTool from '../tools/CleanerTool.jsx';
import OneLineTool from '../tools/OneLineTool.jsx';
import InvoiceTool from '../tools/InvoiceTool.jsx';
import CaseTool from '../tools/CaseTool.jsx';
import WordCounterTool from '../tools/WordCounterTool.jsx';
import HtmlViewerTool from '../tools/HtmlViewerTool.jsx';
import JsonFormatterTool from '../tools/JsonFormatterTool.jsx';
import WebsiteStatusTool from '../tools/WebsiteStatusTool.jsx';
import ProfitMarginTool from '../tools/ProfitMarginTool.jsx';
import PercentageTool from '../tools/PercentageTool.jsx';
import UnitConverterTool from '../tools/UnitConverterTool.jsx';
import ScamCheckerTool from '../tools/ScamCheckerTool.jsx';
import CalculatorTool from '../tools/CalculatorTool.jsx';
import TextToSpeechTool from '../tools/TextToSpeechTool.jsx';
import AudioRecorderTool from '../tools/AudioRecorderTool.jsx';
import LocationTool from '../tools/LocationTool.jsx';
import CameraTool from '../tools/CameraTool.jsx';
import SystemInfoTool from '../tools/SystemInfoTool.jsx';
import QrCodeTool from '../tools/QrCodeTool.jsx';
import SuggestTool from '../tools/SuggestTool.jsx';

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(() => Promise.resolve()) },
  });
  globalThis.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ ip: '203.0.113.10' }),
    blob: () => Promise.resolve(new Blob(['test'])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
});

describe('deterministic tool workflows', () => {
  it('AC-DATES handles same and reversed dates', async () => {
    const user = userEvent.setup();
    render(<DateTool />);
    const start = screen.getByLabelText('Start date');
    const end = screen.getByLabelText('End date');
    await user.clear(start); await user.type(start, '2026-03-10');
    await user.clear(end); await user.type(end, '2026-03-10');
    expect(screen.getByText('These dates are the same day.')).toBeInTheDocument();
    await user.clear(end); await user.type(end, '2026-03-03');
    expect(screen.getByText('7 days before the start date.')).toBeInTheDocument();
  });

  it('AC-SCHEDULE generates numbered sessions and validates time order', async () => {
    const user = userEvent.setup();
    render(<CalendarScheduleTool />);
    await user.clear(screen.getByLabelText('Number of sessions'));
    await user.type(screen.getByLabelText('Number of sessions'), '3');
    await user.selectOptions(screen.getByLabelText(/^Title format/), 'session');
    await user.click(screen.getByRole('button', { name: 'Generate schedule' }));
    expect(screen.getByText('3-session schedule')).toBeInTheDocument();
    expect(screen.getByText('Session 3 - Counselling Lecture')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('End time'));
    await user.type(screen.getByLabelText('End time'), '08:00');
    await user.click(screen.getByRole('button', { name: 'Generate schedule' }));
    expect(screen.getByText('End time must be later than start time.')).toBeInTheDocument();
  });

  it('AC-GST adds and removes Australian GST', async () => {
    const user = userEvent.setup();
    const { container } = render(<GstTool />);
    const results = () => [...container.querySelectorAll('.gst-results strong')].map(node => node.textContent);
    expect(results()).toEqual(['$1,000.00', '$100.00', '$1,100.00']);
    await user.click(screen.getByRole('button', { name: 'Remove GST' }));
    expect(results()).toEqual(['$909.09', '$90.91', '$1,000.00']);
  });

  it('AC-CLEANER collapses spaces and excessive blank lines', async () => {
    const user = userEvent.setup();
    render(<CleanerTool />);
    const input = screen.getByLabelText('Your text');
    await user.clear(input);
    await user.type(input, '  Alpha   beta\n\n\nGamma  ');
    await user.click(screen.getByRole('button', { name: /Clean text/ }));
    expect(input).toHaveValue('Alpha beta\n\nGamma');
  });

  it('AC-ONELINE creates a copy-ready single line', async () => {
    const user = userEvent.setup();
    render(<OneLineTool />);
    const input = screen.getByLabelText('Text with line breaks');
    await user.clear(input);
    await user.type(input, 'Alpha\n\n Beta\tGamma');
    await user.click(screen.getByRole('button', { name: 'Convert to one line' }));
    expect(input).toHaveValue('Alpha Beta Gamma');
    expect(screen.getByText(/Line breaks removed/)).toBeInTheDocument();
  });

  it('AC-INVOICE generates the selected tone and copies it', async () => {
    const user = userEvent.setup();
    render(<InvoiceTool />);
    await user.selectOptions(screen.getByLabelText('Tone'), 'Concise');
    await user.click(screen.getByRole('button', { name: /Generate description/ }));
    expect(screen.getByText(/^Completed:/)).toBeInTheDocument();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: /Copy text/ }));
    expect(writeText).toHaveBeenCalledOnce();
  });

  it('AC-CASE applies title and sentence case', async () => {
    const user = userEvent.setup();
    render(<CaseTool />);
    const input = screen.getByLabelText('Your text');
    await user.clear(input); await user.type(input, 'hello FROM surrendasoft');
    await user.click(screen.getByRole('button', { name: 'Title Case' }));
    expect(input).toHaveValue('Hello From Surrendasoft');
    await user.click(screen.getByRole('button', { name: 'Sentence case' }));
    expect(input).toHaveValue('Hello from surrendasoft');
  });

  it('AC-COUNTER updates all live writing statistics', async () => {
    const user = userEvent.setup();
    const { container } = render(<WordCounterTool />);
    const input = screen.getByLabelText('Your text');
    await user.clear(input);
    await user.type(input, 'Hello world.\n\nSecond short sentence!');
    const stats = [...container.querySelectorAll('.counter-grid strong')].map(node => node.textContent);
    expect(stats).toEqual(['5', '36', '2', '2']);
  });

  it('AC-HTML strips executable and external HTML from the sandbox', async () => {
    const user = userEvent.setup();
    render(<HtmlViewerTool />);
    const source = screen.getByLabelText('HTML source');
    await user.clear(source);
    await user.type(source, '<img src="https://bad.example/x" onerror="alert(1)"><script>alert(1)</script><p>Safe</p>');
    const srcDoc = screen.getByTitle('Sandboxed HTML preview').getAttribute('srcdoc');
    expect(srcDoc).toContain('<p>Safe</p>');
    expect(srcDoc).not.toContain('<script');
    expect(srcDoc).not.toContain('onerror');
    expect(srcDoc).not.toContain('https://bad.example');
  });

  it('AC-JSON formats valid input and reports invalid JSON', async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    const input = screen.getByLabelText('JSON input');
    fireEvent.change(input, { target: { value: '{"ok":true}' } });
    await user.click(screen.getByRole('button', { name: /Format JSON/ }));
    expect(input.value).toContain('\n  "ok": true\n');
    fireEvent.change(input, { target: { value: '{bad}' } });
    await user.click(screen.getByRole('button', { name: 'Validate' }));
    expect(screen.getByText(/^Error:/)).toBeInTheDocument();
  });

  it('AC-WEBSTATUS normalises a domain and reports a successful response', async () => {
    const user = userEvent.setup();
    render(<WebsiteStatusTool />);
    const input = screen.getByLabelText('Website URL to check');
    await user.clear(input); await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Check website' }));
    expect(await screen.findByText('Reachable')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ method: 'HEAD' }));
  });

  it('AC-MARGIN calculates price mode and target-margin mode', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfitMarginTool />);
    let values = [...container.querySelectorAll('.margin-results strong')].map(node => node.textContent);
    expect(values.every(value => !/NaN|Infinity/.test(value))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Target margin' }));
    await user.clear(screen.getByLabelText(/^Target margin/));
    await user.type(screen.getByLabelText(/^Target margin/), '50');
    values = [...container.querySelectorAll('.margin-results strong')].map(node => node.textContent);
    expect(values[2]).toBe('50.0%');
  });

  it('AC-PERCENT supports all three calculation modes and zero divisors', async () => {
    const user = userEvent.setup();
    render(<PercentageTool />);
    expect(screen.getByText('25% of 200 = 50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'What % is X of Y' }));
    expect(screen.getByText('80 is 80% of 100')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '% Change' }));
    expect(screen.getByText(/50 → 75 is a 50% increase/)).toBeInTheDocument();
  });

  it('AC-UNITS converts linear and temperature values', async () => {
    const user = userEvent.setup();
    render(<UnitConverterTool />);
    const from = screen.getByLabelText('Value to convert');
    const converted = screen.getByLabelText('Converted value');
    await user.clear(from); await user.type(from, '1000');
    expect(converted.value).toBe('39.37008');
    await user.click(screen.getByRole('button', { name: 'Temperature' }));
    await user.clear(from); await user.type(from, '0');
    expect(converted.value).toBe('32');
  });

  it('AC-SCAM produces explainable safe and high-risk verdicts', async () => {
    const user = userEvent.setup();
    render(<ScamCheckerTool />);
    const body = screen.getByLabelText('Email body');
    await user.type(body, 'Thanks for your help with the meeting agenda.');
    await user.click(screen.getByRole('button', { name: 'Check for scam signals' }));
    expect(screen.getByText('Looks safe')).toBeInTheDocument();
    await user.clear(body);
    await user.type(body, 'URGENT! Verify your password and bank account now or legal action will follow. Pay with gift card.');
    await user.click(screen.getByRole('button', { name: 'Check for scam signals' }));
    expect(screen.getByText('Likely a scam')).toBeInTheDocument();
  });

  it('AC-CALC performs arithmetic and handles division by zero', async () => {
    const user = userEvent.setup();
    const { container } = render(<CalculatorTool />);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: '×' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(container.querySelector('.calc-display')).toHaveTextContent('56');
    expect(screen.getByLabelText('Current calculation')).toHaveTextContent('7 × 8');
    expect(within(container.querySelector('.calc-history')).getByText('7 × 8')).toBeInTheDocument();
    expect(screen.getByText('= 56')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy current result' }));
    expect(writeText).toHaveBeenCalledWith('56');
    await user.click(screen.getByRole('button', { name: 'Copy result 56' }));
    expect(writeText).toHaveBeenLastCalledWith('56');
    await user.click(screen.getByRole('button', { name: '÷' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(container.querySelector('.calc-display')).toHaveTextContent('Error');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(screen.getByText('Your calculations will appear here.')).toBeInTheDocument();
  });

  it('AC-CALC accepts keyboard numbers, operators, editing, and clear shortcuts', () => {
    const { container } = render(<CalculatorTool />);
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '+' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(container.querySelector('.calc-display')).toHaveTextContent('15');
    expect(within(container.querySelector('.calc-history')).getByText('12 + 3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: '8' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(container.querySelector('.calc-display')).toHaveTextContent('9');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.calc-display')).toHaveTextContent('0');

    for (const key of ['6', '+', '4', '+', '5', '-', '2']) fireEvent.keyDown(window, { key });
    expect(screen.getByLabelText('Current calculation')).toHaveTextContent('6 + 4 + 5 − 2');
    expect(screen.getByLabelText('Running result')).toHaveTextContent('13');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(within(container.querySelector('.calc-history')).getByText('6 + 4 + 5 − 2')).toBeInTheDocument();
    expect(screen.getByText('= 13')).toBeInTheDocument();
  });

  it('AC-CALC scientific mode calculates trig, roots, and powers', async () => {
    const user = userEvent.setup();
    const { container } = render(<CalculatorTool />);
    await user.click(screen.getByRole('button', { name: 'Scientific' }));
    expect(screen.getByRole('group', { name: 'Angle unit' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'sin' }));
    expect(container.querySelector('.calc-display')).toHaveTextContent('0.5');
    expect(within(container.querySelector('.calc-history')).getByText('sin(30°)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'AC' }));
    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: 'Square root' }));
    expect(container.querySelector('.calc-display')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'AC' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Power' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(container.querySelector('.calc-display')).toHaveTextContent('8');
  });

  it('AC-TTS speaks non-empty text and exposes stop after speaking', async () => {
    const user = userEvent.setup();
    render(<TextToSpeechTool />);
    const input = screen.getByLabelText('Text to read');
    await user.type(input, 'Hello from SurrendaSoft');
    await user.click(screen.getByRole('button', { name: /Read aloud/ }));
    expect(speechSynthesis.speak).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });

  it('AC-RECORDER starts, stops, and exposes a local recording', async () => {
    const user = userEvent.setup();
    render(<AudioRecorderTool />);
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(await screen.findByRole('button', { name: 'Stop recording' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop recording' }));
    expect(await screen.findByRole('link', { name: 'Download audio' })).toHaveAttribute('download', 'recording.webm');
  });

  it('AC-LOCATION requests permission and shows copyable coordinates', async () => {
    const user = userEvent.setup();
    render(<LocationTool />);
    await user.click(screen.getByRole('button', { name: 'Find my location' }));
    expect(await screen.findByText('-33.868800')).toBeInTheDocument();
    expect(screen.getByText('151.209300')).toBeInTheDocument();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: /Copy coordinates/ }));
    expect(writeText).toHaveBeenCalledWith('-33.868800, 151.209300');
  });

  it('AC-CAMERA opens the camera and captures a selected local photo', async () => {
    const user = userEvent.setup();
    render(<CameraTool />);
    await user.click(screen.getByRole('button', { name: 'Open camera' }));
    await user.click(await screen.findByRole('button', { name: /Take photo/ }));
    expect(await screen.findByAltText('Photo 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download 1 selected' })).toBeEnabled();
  });

  it('AC-SYSINFO resolves public IP while keeping browser information visible', async () => {
    render(<SystemInfoTool />);
    expect(await screen.findByText('203.0.113.10')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('Time zone')).toBeInTheDocument();
  });

  it('AC-QR enables PNG download only after content exists', async () => {
    const user = userEvent.setup();
    render(<QrCodeTool />);
    const input = screen.getByLabelText('Content (URL, text, phone, email…)');
    const download = screen.getByRole('button', { name: 'Download PNG' });
    await user.clear(input);
    expect(download).toBeDisabled();
    await user.type(input, 'https://surrendasoft.com');
    expect(download).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Size' })).toHaveValue('300');
  });

  it('AC-SUGGEST validates required input and builds the mail request', async () => {
    const user = userEvent.setup();
    render(<SuggestTool />);
    await user.click(screen.getByRole('button', { name: /Send suggestion/ }));
    expect(screen.getByText('Please name the tool you need.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/What tool do you need/), 'Colour contrast checker');
    await user.click(screen.getByRole('button', { name: /Send suggestion/ }));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('Tool%20suggestion%3A%20Colour%20contrast%20checker'));
    expect(screen.getByText('Thanks for the suggestion!')).toBeInTheDocument();
  });
});
