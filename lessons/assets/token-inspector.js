/*
  Reusable JWT inspector. Markup:

    <div class="token-inspector" data-token="eyJ..."></div>

  Shows a textarea (pre-filled with data-token) and decodes the three dot-separated parts as you type: header and
  payload as JSON, iat/exp as dates, the signature as opaque bytes. It only decodes; like jwt.decode, it cannot tell
  whether the signature is genuine, because that needs the server's secret.
*/
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .token-inspector textarea { width: 100%; min-height: 5.5rem; font: .78rem/1.4 ui-monospace, Menlo, monospace;
      padding: .6rem; border: 1px solid var(--rule, #ddd); border-radius: 4px; word-break: break-all; }
    .token-inspector .parts { display: grid; gap: .5rem; margin-top: .6rem; }
    .token-inspector .part { border-left: 4px solid; padding: .4rem .7rem; background: #fff; font-size: .85rem; }
    .token-inspector .part pre { margin: .3rem 0 0; background: none; padding: 0; white-space: pre-wrap; }
    .token-inspector .h { border-color: #b42318; } .token-inspector .p { border-color: #6f42c1; }
    .token-inspector .s { border-color: #0f6b5c; }
    .token-inspector .error { color: var(--bad, #b42318); font-size: .85rem; }
  `;
  document.head.append(style);

  const bytesOf = (part) =>
    Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const decode = (part) => new TextDecoder().decode(bytesOf(part));

  const describeTimes = (payload) =>
    ['iat', 'exp']
      .filter((claim) => typeof payload[claim] === 'number')
      .map((claim) => `${claim} = ${new Date(payload[claim] * 1000).toISOString()}`)
      .join('\n');

  for (const root of document.querySelectorAll('.token-inspector')) {
    const input = document.createElement('textarea');
    input.spellcheck = false;
    input.setAttribute('aria-label', 'JWT to decode');
    input.value = root.dataset.token ?? '';
    const out = document.createElement('div');
    out.className = 'parts';
    root.append(input, out);

    const render = () => {
      const parts = input.value.trim().split('.');
      if (parts.length !== 3) {
        out.innerHTML = '<p class="error">A JWT has exactly three parts separated by dots.</p>';
        return;
      }
      try {
        const header = JSON.parse(decode(parts[0]));
        const payload = JSON.parse(decode(parts[1]));
        const times = describeTimes(payload);
        out.innerHTML = '';
        const add = (cls, title, text) => {
          const div = document.createElement('div');
          div.className = `part ${cls}`;
          const pre = document.createElement('pre');
          pre.textContent = text;
          div.append(Object.assign(document.createElement('b'), { textContent: title }), pre);
          out.append(div);
        };
        add('h', 'Header', JSON.stringify(header, null, 2));
        add(
          'p',
          'Payload (claims)',
          JSON.stringify(payload, null, 2) + (times ? `\n\n${times}` : '')
        );
        add(
          's',
          'Signature',
          `${parts[2]}\n\n(${bytesOf(parts[2]).length} bytes; meaningless without the secret)`
        );
      } catch {
        out.innerHTML = '<p class="error">Not valid base64url JSON: did a character get lost?</p>';
      }
    };

    input.addEventListener('input', render);
    render();
  }
})();
