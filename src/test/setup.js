import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
Object.defineProperty(window, 'open', { configurable: true, value: vi.fn() });
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MediaRecorderMock {
  constructor() {
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverMock });
Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: MediaRecorderMock });
Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: MediaRecorderMock });
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-object') });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: { writeText: vi.fn(() => Promise.resolve()) },
});
Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }],
    })),
  },
});
Object.defineProperty(navigator, 'geolocation', {
  configurable: true,
  value: {
    getCurrentPosition: vi.fn(success => success({
      coords: { latitude: -33.8688, longitude: 151.2093, accuracy: 12 },
    })),
  },
});

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  value: {
    getVoices: vi.fn(() => [{ name: 'Test Voice', lang: 'en-AU' }]),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: class SpeechSynthesisUtteranceMock {
    constructor(text) { this.text = text; }
  },
});

const canvasContext = {
  beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), strokeRect: vi.fn(),
  clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(), createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  lineWidth: 1, lineCap: 'round', lineJoin: 'round', strokeStyle: '#000', fillStyle: '#fff', shadowColor: '#000', shadowBlur: 0,
};
HTMLCanvasElement.prototype.getContext = vi.fn(() => canvasContext);
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,dGVzdA==');
HTMLCanvasElement.prototype.toBlob = vi.fn(callback => callback(new Blob(['image'], { type: 'image/png' })));
HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
HTMLMediaElement.prototype.pause = vi.fn();

globalThis.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ ip: '203.0.113.10' }),
  blob: () => Promise.resolve(new Blob(['test'])),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
}));

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn((canvas, text, options, callback) => callback?.(null)),
    create: vi.fn(text => ({ modules: { size: 25 + Math.floor(String(text || '').length / 20) } })),
  },
}));
