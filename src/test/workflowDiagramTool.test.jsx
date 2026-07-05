import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import WorkflowDiagramTool from '../tools/WorkflowDiagramTool.jsx';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AC-WORKFLOW diagram builder', () => {
  it('adds a shape and removes it via the contextual delete button on selection', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkflowDiagramTool />);

    await user.click(screen.getByRole('button', { name: 'Box' }));
    expect(container.querySelectorAll('.wf-shape')).toHaveLength(1);

    const deleteButton = await screen.findByRole('button', { name: 'Delete selected item' });
    await user.click(deleteButton);
    expect(container.querySelectorAll('.wf-shape')).toHaveLength(0);
  });

  it('undoes and redoes adding a shape', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkflowDiagramTool />);

    await user.click(screen.getByRole('button', { name: 'Box' }));
    expect(container.querySelectorAll('.wf-shape')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(container.querySelectorAll('.wf-shape')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(container.querySelectorAll('.wf-shape')).toHaveLength(1);
  });

  it('creates a share link that reloads the diagram in a fresh mount', async () => {
    const user = userEvent.setup();
    const first = render(<WorkflowDiagramTool />);
    await user.click(screen.getByRole('button', { name: 'Box' }));
    await user.click(screen.getByRole('button', { name: /Create share link/ }));

    const linkInput = await screen.findByLabelText('Share link');
    const shareUrl = linkInput.value;
    expect(shareUrl).toContain('#workflow/share/');
    first.unmount();

    window.history.replaceState(null, '', new URL(shareUrl).hash);
    const second = render(<WorkflowDiagramTool />);
    expect(await screen.findByText(/Loaded a diagram from a shared link/)).toBeInTheDocument();
    expect(second.container.querySelectorAll('.wf-shape')).toHaveLength(1);
  });
});
