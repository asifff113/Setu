/**
 * ggwave audio-transport primitives — the "sound" half of Chirp (Phase 8).
 *
 * ggwave ships as a single self-contained emscripten module with its WASM
 * embedded as a base64 data-URI, so there is *no* runtime fetch: it works fully
 * offline once precached. It's a UMD file, though, whose Node branches reference
 * `require('fs')`, which trips up bundlers — so rather than `import 'ggwave'`
 * (which Rollup would try to parse), we import it as a plain asset URL and load
 * it as a classic <script>. Its top-level `var ggwave_factory` then lands on
 * `window`, and Workbox precaches the emitted `.js` for offline use.
 *
 * Two operations: `startTransmit` turns a ≤140-byte payload into looping audio
 * out the speaker; `startListen` decodes the mic stream back into payloads. Both
 * take an AudioContext the caller created inside a user gesture (autoplay policy
 * requires it), and neither closes that context — the caller owns its lifecycle.
 */
import ggwaveUrl from 'ggwave/ggwave.js?url';

interface GgwaveParameters {
  payloadLength: number;
  sampleRateInp: number;
  sampleRateOut: number;
  sampleRate: number;
  samplesPerFrame: number;
  soundMarkerThreshold: number;
  sampleFormatInp: number;
  sampleFormatOut: number;
  operatingMode: number;
}

interface GgwaveModule {
  getDefaultParameters(): GgwaveParameters;
  init(params: GgwaveParameters): number;
  free(instance: number): void;
  /** Payload bytes → waveform bytes (raw F32 samples reinterpreted as int8). */
  encode(instance: number, payload: Uint8Array, protocolId: number, volume: number): Int8Array;
  /** Sample bytes (int8 view of F32 mic samples) → decoded payload bytes. */
  decode(instance: number, waveform: Int8Array): Int8Array;
  disableLog?: () => void;
  ProtocolId: Record<string, number | undefined>;
}

declare global {
  interface Window {
    ggwave_factory?: () => Promise<GgwaveModule>;
  }
}

/** Audible protocols, trading transmit time for robustness (see phase-8 notes). */
export type ChirpProtocol = 'fast' | 'fastest';
const PROTOCOL_KEY: Record<ChirpProtocol, string> = {
  fast: 'GGWAVE_PROTOCOL_AUDIBLE_FAST',
  fastest: 'GGWAVE_PROTOCOL_AUDIBLE_FASTEST',
};

// Kept low to stay clear of clipping (>±1.0 F32 distorts the FSK tones and
// wrecks decoding); loudness is the phone's volume dial, not this number.
const DEFAULT_VOLUME = 15;

let scriptPromise: Promise<void> | null = null;
let modulePromise: Promise<GgwaveModule> | null = null;

function loadScript(): Promise<void> {
  if (window.ggwave_factory) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ggwaveUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('chirp: failed to load ggwave'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Load + init the ggwave WASM module once, caching it for later transmissions. */
export async function loadGgwave(): Promise<GgwaveModule> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
    await loadScript();
    const factory = window.ggwave_factory;
    if (!factory) throw new Error('chirp: ggwave factory missing after load');
    const module = await factory();
    module.disableLog?.();
    return module;
  })();
  return modulePromise;
}

/**
 * Copy a typed array's raw bytes into a fresh buffer and view them as another
 * type — the standard ggwave bridge between int8 waveform bytes and F32 audio
 * samples. Copying also lifts the data out of ggwave's transient heap views,
 * which are overwritten on the next call.
 */
function reinterpret<T extends Float32Array | Int8Array>(
  src: ArrayBufferView,
  Ctor: { new (buffer: ArrayBuffer): T },
): T {
  const buffer = new ArrayBuffer(src.byteLength);
  new Uint8Array(buffer).set(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
  return new Ctor(buffer);
}

/** A Web Audio context created via the (prefixed on old Safari) constructor. */
export function createAudioContext(): AudioContext {
  const w = window as unknown as {
    AudioContext?: { new (): AudioContext };
    webkitAudioContext?: { new (): AudioContext };
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error('chirp: Web Audio API unavailable');
  return new Ctor();
}

export interface ChirpTransmission {
  /** Length of one transmission in seconds (it loops until stopped). */
  durationSec: number;
  stop(): void;
}

/**
 * Encode `payload` and play it out `ctx`'s destination on an endless loop (with
 * a short gap between passes so the receiver can re-lock), until `stop()`.
 */
export async function startTransmit(
  ctx: AudioContext,
  payload: Uint8Array,
  protocol: ChirpProtocol = 'fast',
  volume: number = DEFAULT_VOLUME,
): Promise<ChirpTransmission> {
  const g = await loadGgwave();
  const params = g.getDefaultParameters();
  params.sampleRateInp = ctx.sampleRate;
  params.sampleRateOut = ctx.sampleRate;
  const instance = g.init(params);

  const protocolId = g.ProtocolId[PROTOCOL_KEY[protocol]];
  if (protocolId === undefined) {
    g.free(instance);
    throw new Error('chirp: ggwave protocol unavailable');
  }
  const waveform = g.encode(instance, payload, protocolId, volume);
  const samples = reinterpret(waveform, Float32Array);
  g.free(instance);

  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.getChannelData(0).set(samples);

  let stopped = false;
  let node: AudioBufferSourceNode | null = null;
  let gapTimer: ReturnType<typeof setTimeout> | undefined;

  const loop = (): void => {
    if (stopped) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      if (!stopped) gapTimer = setTimeout(loop, 350);
    };
    src.start();
    node = src;
  };
  loop();

  return {
    durationSec: buffer.duration,
    stop() {
      stopped = true;
      if (gapTimer) clearTimeout(gapTimer);
      if (node) {
        node.onended = null;
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
        try {
          node.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    },
  };
}

export interface ChirpReception {
  stop(): void;
}

/**
 * Listen on the microphone and hand every successfully-decoded payload to
 * `onPayload`. The caller decides what a payload means (Chirp decodes it into a
 * SetuEvent) and when to `stop()`.
 */
export async function startListen(
  ctx: AudioContext,
  onPayload: (bytes: Uint8Array) => void,
): Promise<ChirpReception> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('getUserMedia unavailable', 'NotFoundError');
  }
  const g = await loadGgwave();
  // Auto gain / noise suppression / echo cancellation all mangle the FSK tones,
  // so every DSP "enhancement" the browser offers must be turned off.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });

  const params = g.getDefaultParameters();
  params.sampleRateInp = ctx.sampleRate;
  params.sampleRateOut = ctx.sampleRate;
  const instance = g.init(params);

  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(1024, 1, 1);
  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const input = event.inputBuffer.getChannelData(0);
    const samples = reinterpret(input, Int8Array);
    let decoded: Int8Array;
    try {
      decoded = g.decode(instance, samples);
    } catch {
      return; // transient decode hiccup; next buffer tries again
    }
    if (decoded.length > 0) onPayload(new Uint8Array(decoded));
  };

  source.connect(processor);
  // Route through destination so the processor keeps firing; we never fill its
  // output buffer, so it emits silence — no mic→speaker feedback loop.
  processor.connect(ctx.destination);

  return {
    stop() {
      stopped = true;
      processor.onaudioprocess = null;
      try {
        source.disconnect();
      } catch {
        /* noop */
      }
      try {
        processor.disconnect();
      } catch {
        /* noop */
      }
      stream.getTracks().forEach((track) => track.stop());
      g.free(instance);
    },
  };
}
