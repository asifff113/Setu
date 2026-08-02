import { describe, expect, it } from 'vitest';
import { compressSdp, decompressSdp } from './webrtcSync';

describe('webrtcSync sdp compression', () => {
  it('compress and decompress sdp strings losslessly', () => {
    const sdp = 'v=0\r\no=- 420 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv';
    const compressed = compressSdp(sdp);
    const back = decompressSdp(compressed);
    expect(back).toBe(sdp);
  });
});
