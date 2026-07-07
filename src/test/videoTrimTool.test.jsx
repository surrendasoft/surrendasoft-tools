import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VideoTrimTool from '../tools/VideoTrimTool.jsx';

vi.mock('../utils/videoTrim.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    exportTrimmedVideo: vi.fn(async () => new Blob(['trimmed'], { type: 'video/mp4' })),
  };
});

afterEach(() => cleanup());

function makeVideoFile(name = 'clip.mp4', type = 'video/mp4') {
  return new File(['video-bytes'], name, { type });
}

describe('VideoTrimTool', () => {
  it('renders the drop zone', () => {
    const { container } = render(<VideoTrimTool />);
    expect(container.querySelector('.vtrim-root')).toBeInTheDocument();
    expect(screen.getByLabelText(/Drop a video to trim/)).toBeInTheDocument();
  });

  it('loads a video and exposes trim controls after metadata loads', async () => {
    const user = userEvent.setup();
    const { container } = render(<VideoTrimTool />);
    await user.upload(screen.getByLabelText(/Drop a video to trim/), makeVideoFile());

    const video = container.querySelector('video');
    Object.defineProperty(video, 'duration', { configurable: true, value: 30 });
    fireEvent.loadedMetadata(video);

    expect(screen.getByText(/0:30 total/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export trimmed video/i })).toBeInTheDocument();
    expect(screen.getByText(/Remove a middle section/i)).toBeInTheDocument();
  });

  it('rejects unsupported file types', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<VideoTrimTool />);
    await user.upload(screen.getByLabelText(/Drop a video to trim/), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText(/Choose a video file/i)).toBeInTheDocument();
  });
});
