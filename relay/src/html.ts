/** Escape untrusted text for interpolation into HTML. SMS-sourced names and
 *  messages are attacker-controlled, so every dynamic value on /lite and
 *  /sms-sim passes through here. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
