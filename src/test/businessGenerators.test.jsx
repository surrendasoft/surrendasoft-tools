import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MultiStopMapTool from '../tools/MultiStopMapTool.jsx';
import PaymentRequestTool from '../tools/PaymentRequestTool.jsx';
import SimpleInvoicePdfTool from '../tools/SimpleInvoicePdfTool.jsx';
import { buildGoogleMapsRoute } from '../utils/mapRoute.js';
import { buildBpointUrl, buildPaymentRequest } from '../utils/paymentRequest.js';
import { calculateInvoiceTotals, createInvoicePdf } from '../utils/simpleInvoice.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AC-MAPROUTE multi-stop routes', () => {
  it('builds valid no-stop and multi-stop Google Maps links', () => {
    const direct = buildGoogleMapsRoute({ destination: 'Sydney NSW', stops: [], travelMode: 'walking' });
    const directUrl = new URL(direct.url);
    expect(directUrl.searchParams.get('destination')).toBe('Sydney NSW');
    expect(directUrl.searchParams.get('origin')).toBeNull();
    expect(directUrl.searchParams.get('travelmode')).toBe('walking');

    const route = buildGoogleMapsRoute({ origin: 'Gymea NSW', destination: 'Sutherland NSW', stops: ['Miranda NSW', '', 'Kirrawee NSW'], travelMode: 'driving' });
    const routeUrl = new URL(route.url);
    expect(routeUrl.searchParams.get('waypoints')).toBe('Miranda NSW|Kirrawee NSW');
    expect(route.summary).toContain('Stop 2: Kirrawee NSW');
  });

  it('generates and copies a route message in the UI', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<MultiStopMapTool />);
    await user.type(screen.getByLabelText(/Destination/), 'Sutherland NSW');
    await user.type(screen.getByLabelText('Stop 1'), 'Miranda NSW');
    await user.click(screen.getByRole('button', { name: 'Generate map link' }));
    expect(screen.getByLabelText('Generated map route')).toBeInTheDocument();
    expect(screen.getByText(/Stop 1: Miranda NSW/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Copy route message/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Open in Google Maps:'));
  });
});

describe('AC-PAYREQUEST safe request messages', () => {
  it('validates payment methods and builds link and bank outputs', () => {
    expect(() => buildPaymentRequest({ amount: 0, method: 'link' })).toThrow(/greater than zero/);
    expect(() => buildPaymentRequest({ amount: 20, method: 'bank' })).toThrow(/account name/);
    const request = buildPaymentRequest({ businessName: 'SurrendaSoft', customerName: 'John', amount: 120, currency: 'AUD', reference: 'INV-1042', description: 'Website support', dueDate: '2026-08-12', method: 'both', paymentUrl: 'https://pay.example/1042', accountName: 'SurrendaSoft', bsb: '062-000', accountNumber: '12345678', bankReference: 'INV-1042' });
    expect(request.sms).toContain('please pay $120.00');
    expect(request.email).toContain('Subject: Payment request INV-1042');
    expect(request.qrContent).toBe('https://pay.example/1042');
    expect(request.details).toContain('BSB: 062-000');
  });

  it('builds encoded BPOINT links and omits empty parameters', () => {
    expect(() => buildBpointUrl({})).toThrow(/shop short name/i);
    expect(buildBpointUrl({ bpointShop: 'simple-shop' })).toBe('https://www.bpoint.com.au/epages/simple-shop.sf/');
    const url = buildBpointUrl({
      bpointShop: 'my shop',
      bpointBillerCode: '123 & 4',
      bpointRef1: 'INV 100',
      bpointRef2: '',
      bpointRef3: 'Customer/One',
      bpointAmount: '10',
    });
    expect(url).toBe('https://www.bpoint.com.au/epages/my%20shop.sf/?BillerCode=123%20%26%204&Ref1=INV%20100&Ref3=Customer%2FOne&Amount=10.00');
    expect(url).not.toContain('Ref2=');

    const request = buildPaymentRequest({ method: 'bpoint', bpointShop: 'simple-shop', bpointRef1: 'INV-100', description: 'Support' });
    expect(request.qrContent).toBe('https://www.bpoint.com.au/epages/simple-shop.sf/?Ref1=INV-100');
    expect(request.sms).toContain('please use the BPOINT link');
    expect(request.email).toContain(request.paymentUrl);
    expect(request.providerWarning).toMatch(/locked or pre-filled/i);
  });

  it('generates copyable BPOINT URL, messages, and QR output in the UI', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const { container } = render(<PaymentRequestTool />);
    await user.click(screen.getByRole('button', { name: 'BPOINT' }));
    expect(screen.queryByLabelText('Payment amount')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Shop short name/), 'test shop');
    await user.type(screen.getByLabelText(/Biller Code/), '100 200');
    await user.type(screen.getByLabelText(/Ref1/), 'INV-7');
    await user.type(screen.getByLabelText('BPOINT amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Generate request' }));

    const output = screen.getByLabelText('Generated payment request');
    const expectedUrl = 'https://www.bpoint.com.au/epages/test%20shop.sf/?BillerCode=100%20200&Ref1=INV-7&Amount=10.00';
    expect(within(output).getAllByText(expectedUrl)).not.toHaveLength(0);
    expect(within(output).getByText(/may be locked or pre-filled/i)).toBeInTheDocument();
    expect(container.querySelector('.prg-qr canvas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy BPOINT URL' }));
    expect(writeText).toHaveBeenCalledWith(expectedUrl);
  });

  it('contains no card fields and generates copyable messages', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<PaymentRequestTool />);
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Customer name'), 'John');
    await user.type(screen.getByLabelText('Payment amount'), '120');
    await user.type(screen.getByLabelText('Description'), 'Website support');
    await user.type(screen.getByLabelText('Secure payment URL'), 'https://pay.example/1042');
    await user.click(screen.getByRole('button', { name: 'Generate request' }));
    expect(screen.getByLabelText('Generated payment request')).toBeInTheDocument();
    expect(screen.getAllByText(/please pay \$120.00/i)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Copy SMS message' }));
    expect(writeText).toHaveBeenCalled();
  });
});

describe('AC-INVOICEPDF calculations and local PDF', () => {
  const items = [{ description: 'Design', quantity: 2, unitPrice: 100 }];
  const invoice = { businessName: 'SurrendaSoft', clientName: 'Example Client', invoiceNumber: 'INV-1001', invoiceDate: '2026-07-05', dueDate: '2026-07-19', currency: 'AUD', gstMode: 'added', items, paymentInstructions: 'Pay by bank transfer.', accountName: 'SurrendaSoft', bsb: '062-000', accountNumber: '12345678', paymentReference: 'INV-1001', notes: 'Thanks', terms: '14 days', footerText: 'Thank you for your business.' };

  it('calculates every GST mode correctly', () => {
    expect(calculateInvoiceTotals(items, 'none')).toEqual({ subtotal: 200, gst: 0, total: 200 });
    expect(calculateInvoiceTotals(items, 'added')).toEqual({ subtotal: 200, gst: 20, total: 220 });
    const included = calculateInvoiceTotals([{ description: 'Support', quantity: 1, unitPrice: 110 }], 'included');
    expect(included.subtotal).toBeCloseTo(100);
    expect(included.gst).toBeCloseTo(10);
    expect(included.total).toBe(110);
  });

  it('creates a valid browser-generated PDF', async () => {
    const bytes = await createInvoicePdf(invoice);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('supports multiple items, preview, PDF download, and payment copy', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<SimpleInvoicePdfTool />);
    await user.type(screen.getByLabelText('Business name'), 'SurrendaSoft');
    await user.type(screen.getByLabelText(/^Client name/), 'Example Client');
    await user.type(screen.getByLabelText('Item 1 description'), 'Website support');
    await user.type(screen.getByLabelText('Item 1 unit price'), '100');
    await user.click(screen.getByRole('button', { name: 'Add line item' }));
    await user.type(screen.getByLabelText('Item 2 description'), 'Hosting');
    await user.type(screen.getByLabelText('Item 2 unit price'), '50');
    await user.click(screen.getByRole('button', { name: 'Preview invoice' }));
    const preview = screen.getByLabelText('Invoice preview');
    expect(preview).toBeInTheDocument();
    expect(within(preview).getByText('$165.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create PDF' }));
    expect(await screen.findByText('Invoice PDF ready')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy payment message' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Amount due: $165.00'));
  });
});
