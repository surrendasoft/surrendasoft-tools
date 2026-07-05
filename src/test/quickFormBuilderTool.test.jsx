import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import QuickFormBuilderTool from '../tools/QuickFormBuilderTool.jsx';
import { buildToolRouteUrl, buildToolShareUrl } from '../utils/toolShare.js';
import { buildResponse, clientIntakeTemplate } from '../utils/quickForm.js';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AC-QUICKFORM builder workflow', () => {
  it('shows a live estimated link size while building a form', async () => {
    const user = userEvent.setup();
    render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Client intake template' }));

    expect(await screen.findByText('Estimated link size', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/chars$/)).toBeInTheDocument();
  });

  it('caps field label and option input length in the builder', async () => {
    const user = userEvent.setup();
    render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Client intake template' }));

    const nameLabelInput = screen.getAllByDisplayValue('Name')[0];
    expect(nameLabelInput).toHaveAttribute('maxLength', '80');
  });

  it('shows a recipient preview of the form being built', async () => {
    const user = userEvent.setup();
    render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Client intake template' }));
    await user.click(screen.getByRole('tab', { name: 'Preview' }));

    expect(await screen.findByText('Recipient view')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client intake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share completed form' })).toBeDisabled();
  });

  it('creates a form link and opens it in fill mode', async () => {
    const user = userEvent.setup();
    const first = render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Client intake template' }));
    await user.click(screen.getByRole('button', { name: 'Generate form link' }));

    const linkInput = await screen.findByLabelText('Share link');
    const formUrl = linkInput.value;
    expect(formUrl).toContain('#quickform/share/');
    first.unmount();

    window.history.replaceState(null, '', new URL(formUrl).hash);
    render(<QuickFormBuilderTool />);

    expect(await screen.findByRole('heading', { name: 'Client intake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share completed form' })).toBeInTheDocument();
  });

  it('lets a recipient rate with stars and adjust a slider, and shows them back in the response', async () => {
    const user = userEvent.setup();
    render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Feedback survey template' }));
    await user.click(screen.getByRole('button', { name: 'Generate form link' }));
    const formUrl = (await screen.findByLabelText('Share link')).value;

    cleanup();
    window.history.replaceState(null, '', new URL(formUrl).hash);
    render(<QuickFormBuilderTool />);

    await screen.findByRole('heading', { name: 'Feedback survey' });
    await user.click(screen.getByRole('button', { name: '4 stars' }));
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });
    await user.click(screen.getByRole('button', { name: 'Share completed form' }));

    expect(await screen.findByText('Form completed')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('offers a PDF download of the completed response', async () => {
    const user = userEvent.setup();
    const form = clientIntakeTemplate();
    const response = buildResponse(form, { [form.fields[0].id]: 'Alex Smith' });
    const responseUrl = await buildToolRouteUrl('quickform', 'response', response);

    window.history.replaceState(null, '', new URL(responseUrl).hash);
    render(<QuickFormBuilderTool />);

    await screen.findByRole('heading', { name: 'Client intake' });
    const pdfButton = screen.getByRole('button', { name: /Download PDF/ });
    await user.click(pdfButton);
    expect(await screen.findByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('offers a fillable PDF download while building a form', async () => {
    const user = userEvent.setup();
    render(<QuickFormBuilderTool />);
    await user.click(await screen.findByRole('button', { name: 'Client intake template' }));

    const pdfButton = screen.getByRole('button', { name: /Download fillable PDF/ });
    await user.click(pdfButton);
    expect(await screen.findByRole('button', { name: 'Download fillable PDF' })).toBeInTheDocument();
  });

  it('returns a completed response link that opens in response view', async () => {
    const user = userEvent.setup();
    const form = clientIntakeTemplate();
    const response = buildResponse(form, {
      [form.fields[0].id]: 'Alex Smith',
      [form.fields[1].id]: '0400 111 222',
    });
    const responseUrl = await buildToolRouteUrl('quickform', 'response', response);

    window.history.replaceState(null, '', new URL(responseUrl).hash);
    render(<QuickFormBuilderTool />);

    expect(await screen.findByRole('heading', { name: 'Client intake' })).toBeInTheDocument();
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy all' })).toBeInTheDocument();
  });
});
