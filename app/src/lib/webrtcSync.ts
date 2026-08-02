import type { SetuEvent } from '@setu/shared';
import { decodeBundle, encodeBundle } from './bundle';
import { ingestEvents, type IngestResult } from '../db/events';

export const WEBRTC_OFFER_PREFIX = 'SETURTC_OFFER:';
export const WEBRTC_ANSWER_PREFIX = 'SETURTC_ANSWER:';

/** Compress SDP text to base64 string */
export function compressSdp(sdp: string): string {
  const binary = new TextEncoder().encode(sdp);
  let str = '';
  for (let i = 0; i < binary.length; i++) {
    str += String.fromCharCode(binary[i]!);
  }
  return btoa(str);
}

/** Decompress base64 string back to SDP text */
export function decompressSdp(b64: string): string {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export class DirectWebRtcSync {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private incomingChunks: Uint8Array[] = [];

  constructor() {
    // LAN-only: no STUN/TURN servers required
    this.pc = new RTCPeerConnection({ iceServers: [] });
  }

  async createOffer(): Promise<string> {
    this.channel = this.pc.createDataChannel('setu-sync', { ordered: true });
    this.setupChannel(this.channel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await this.waitForIceGathering();
    const sdp = this.pc.localDescription?.sdp ?? '';
    return `${WEBRTC_OFFER_PREFIX}${compressSdp(sdp)}`;
  }

  async handleOfferAndCreateAnswer(offerPayload: string): Promise<string> {
    if (!offerPayload.startsWith(WEBRTC_OFFER_PREFIX)) {
      throw new Error('invalid offer prefix');
    }
    const b64 = offerPayload.slice(WEBRTC_OFFER_PREFIX.length);
    const sdp = decompressSdp(b64);

    this.pc.ondatachannel = (event) => {
      this.channel = event.channel;
      this.setupChannel(this.channel);
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await this.waitForIceGathering();
    const answerSdp = this.pc.localDescription?.sdp ?? '';
    return `${WEBRTC_ANSWER_PREFIX}${compressSdp(answerSdp)}`;
  }

  async handleAnswer(answerPayload: string): Promise<void> {
    if (!answerPayload.startsWith(WEBRTC_ANSWER_PREFIX)) {
      throw new Error('invalid answer prefix');
    }
    const b64 = answerPayload.slice(WEBRTC_ANSWER_PREFIX.length);
    const sdp = decompressSdp(b64);

    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
  }

  async sendBundle(events: SetuEvent[]): Promise<void> {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('data channel not open');
    }

    const bundleBytes = await encodeBundle(events);
    const CHUNK_SIZE = 16 * 1024; // 16KB chunks

    // Send total size header first: "SIZE:<bytes>"
    this.channel.send(`SIZE:${bundleBytes.length}`);

    for (let offset = 0; offset < bundleBytes.length; offset += CHUNK_SIZE) {
      const chunk = bundleBytes.subarray(offset, offset + CHUNK_SIZE);
      this.channel.send(chunk);
    }
    this.channel.send('EOF');
  }

  onReceiveBundle?: (result: IngestResult) => void;

  private setupChannel(ch: RTCDataChannel) {
    ch.binaryType = 'arraybuffer';
    let expectedSize = 0;

    ch.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        if (event.data.startsWith('SIZE:')) {
          expectedSize = parseInt(event.data.slice(5), 10);
          this.incomingChunks = [];
        } else if (event.data === 'EOF') {
          const totalLength = this.incomingChunks.reduce((acc, c) => acc + c.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of this.incomingChunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          this.incomingChunks = [];

          try {
            const decodedEvents = await decodeBundle(combined);
            const res = await ingestEvents(decodedEvents);
            this.onReceiveBundle?.(res);
          } catch {
            // failed decode
          }
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.incomingChunks.push(new Uint8Array(event.data));
      }
    };
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const check = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      this.pc.addEventListener('icegatheringstatechange', check);
      // Fallback timeout after 1.5s
      setTimeout(resolve, 1500);
    });
  }

  close() {
    this.channel?.close();
    this.pc.close();
  }
}
