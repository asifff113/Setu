/**
 * GET /node-qr — a zero-JavaScript page showing a big QR of this relay's
 * `ws://<lan-ip>:<port>` address, for phones to scan on the "Connect to local
 * node" screen. Also prints the address as text so it can be typed by hand.
 */
import QRCode from 'qrcode';
import { lanIPv4 } from './net.js';

export async function nodeQrPage(port: number): Promise<string> {
  const ip = lanIPv4() ?? 'localhost';
  const wsUrl = `ws://${ip}:${port}`;
  const svg = await QRCode.toString(wsUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#121212', light: '#ffffff' },
  });

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Setu · Local node</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 20px; padding: 24px;
    background: #121212; color: #f5f5f5;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    text-align: center;
  }
  h1 { margin: 0; font-size: 22px; }
  .qr { background: #fff; padding: 14px; border-radius: 16px; width: 300px; max-width: 82vw; }
  .qr svg { width: 100%; height: auto; display: block; }
  .url {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 18px;
    background: #262628; padding: 10px 16px; border-radius: 10px; word-break: break-all;
  }
  p { margin: 0; max-width: 380px; color: rgba(245,245,245,0.7); line-height: 1.5; font-size: 14px; }
  .accent { color: #e5322d; }
</style>
</head>
<body>
  <h1><span class="accent">সেতু</span> · Local node</h1>
  <div class="qr">${svg}</div>
  <div class="url">${wsUrl}</div>
  <p>Setu অ্যাপে <b>Sync → Connect to local node</b> খুলে এই QR স্ক্যান করুন,
     অথবা উপরের ঠিকানা টাইপ করুন।</p>
  <p>In the Setu app open <b>Sync → Connect to local node</b> and scan this QR,
     or type the address above. Both phones must be on this same Wi-Fi / hotspot —
     no internet needed.</p>
</body>
</html>`;
}
