/**
 * GET /sms-sim — a fake-phone page that POSTs to the same /api/sms/inbound
 * webhook the real gateways hit, and shows the relay's reply inline. This is
 * the demo fallback if a physical SMS gateway misbehaves: it exercises the
 * exact same parse → store → sync → reply path, and a sent SAFE/HELP appears on
 * every connected app instantly.
 *
 * JavaScript is allowed here (unlike /lite) — it's an interactive demo tool.
 *
 * `inboundKey` is the optional SMS_INBOUND_KEY: when the relay is locked down,
 * it's embedded here so the simulator's POSTs still authenticate. JSON.stringify
 * yields a safe JS string literal (or `undefined` -> no header sent).
 */
export function smsSimPage(inboundKey?: string): string {
  const keyLiteral = JSON.stringify(inboundKey ?? '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Setu · SMS simulator</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;gap:14px;
  padding:20px 14px;background:#0c0c0d;color:#f5f5f5;font-family:system-ui,"Segoe UI",Roboto,sans-serif}
h1{font-size:20px;margin:4px 0 0}
h1 span{color:#e5322d}
.hint{color:#9a9a9a;font-size:12px;text-align:center;max-width:360px;margin:0}
.phone{width:340px;max-width:94vw;background:#1a1a1c;border:1px solid #303033;border-radius:22px;
  padding:14px;display:flex;flex-direction:column;gap:10px}
.to{font-size:12px;color:#9a9a9a;text-align:center}
.log{background:#111;border-radius:12px;padding:10px;height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.msg{max-width:82%;padding:8px 11px;border-radius:14px;font-size:14px;line-height:1.35;word-break:break-word}
.out{align-self:flex-end;background:#e5322d;color:#fff;border-bottom-right-radius:4px}
.in{align-self:flex-start;background:#2a2a2c;color:#f0f0f0;border-bottom-left-radius:4px}
.meta{align-self:center;color:#7a7a7a;font-size:11px}
.row{display:flex;gap:8px}
input{flex:1;min-width:0;background:#0f0f10;border:1px solid #303033;color:#fff;border-radius:10px;padding:10px;font-size:14px}
input:focus{outline:2px solid #e5322d;border-color:transparent}
button{background:#e5322d;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer}
button:disabled{opacity:.5;cursor:default}
.num{width:150px;flex:none}
.quick{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:360px}
.quick button{background:#232325;color:#e8e8e8;font-weight:500;font-size:12px;padding:7px 10px}
.foot{color:#7a7a7a;font-size:11px;text-align:center;max-width:360px}
.foot a{color:#7fb3ff}
</style>
</head>
<body>
<h1><span>সেতু</span> · SMS simulator</h1>
<p class="hint">Type an SMS the way a button phone would send it. It hits the real
<code>/api/sms/inbound</code> webhook — a valid SAFE/HELP shows up on every connected app,
and the relay's reply appears below.</p>

<div class="quick" id="quick"></div>

<div class="phone">
  <div class="to">To: Setu gateway &nbsp;·&nbsp; From: <span id="fromLabel">+8801711000001</span></div>
  <div class="log" id="log"></div>
  <div class="row">
    <input id="from" class="num" value="+8801711000001" aria-label="Sender number">
  </div>
  <div class="row">
    <input id="text" placeholder="SAFE Rahim Mirpur" aria-label="Message text" autocomplete="off">
    <button id="send">Send</button>
  </div>
</div>

<p class="foot">Zero-JS read-only board: <a href="/lite">/lite</a> &nbsp;·&nbsp; Local node QR: <a href="/node-qr">/node-qr</a></p>

<script>
var INBOUND_KEY = ${keyLiteral};
var EXAMPLES = [
  'SAFE Rahim Mirpur',
  'HELP WATER Karim Feni - stuck on roof',
  'MISSING Fatima Sylhet',
  'FOUND Fatima Sylhet',
  'FIND Rahim',
  'hello'
];
var log = document.getElementById('log');
var textEl = document.getElementById('text');
var fromEl = document.getElementById('from');
var sendEl = document.getElementById('send');
var fromLabel = document.getElementById('fromLabel');

fromEl.addEventListener('input', function(){ fromLabel.textContent = fromEl.value || '?'; });

function bubble(cls, text){
  var d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}
function meta(text){
  var d = document.createElement('div');
  d.className = 'meta';
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function send(){
  var text = textEl.value.trim();
  if(!text) return;
  bubble('out', text);
  textEl.value = '';
  sendEl.disabled = true;
  var headers = { 'content-type': 'application/json' };
  if (INBOUND_KEY) headers['x-setu-key'] = INBOUND_KEY;
  fetch('/api/sms/inbound', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ from: fromEl.value.trim(), message: text })
  })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if(j && j.reply) bubble('in', j.reply);
    if(j && typeof j.stored === 'number'){
      meta(j.stored > 0 ? ('✓ stored & synced to all devices ('+j.stored+' new)') : '· no new event stored');
    }
  })
  .catch(function(){ meta('✗ webhook error'); })
  .then(function(){ sendEl.disabled = false; textEl.focus(); });
}

sendEl.addEventListener('click', send);
textEl.addEventListener('keydown', function(e){ if(e.key === 'Enter') send(); });

var quick = document.getElementById('quick');
EXAMPLES.forEach(function(ex){
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = ex;
  b.addEventListener('click', function(){ textEl.value = ex; textEl.focus(); });
  quick.appendChild(b);
});
</script>
</body>
</html>`;
}
