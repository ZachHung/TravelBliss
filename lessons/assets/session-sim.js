/*
  Reusable session simulator: a model of SessionService's refresh-token logic, small enough to play with.

    <div class="session-sim"></div>                                  lesson 3: you + an attacker
    <div class="session-sim" data-actors="laptop,phone"
         data-tabs="yes" data-password="yes"></div>                    lesson 4: devices, two tabs, password change

  Options: data-actors (comma list, default "you"), data-attacker="no" to hide the attacker (who steals from the
  first actor), data-tabs="yes" for "two tabs refresh at once", data-password="yes" for "change password".

  It mirrors apps/api/src/modules/session/session.service.ts:
    start(remember)  → new refresh token, Redis key refreshToken:<user>:<token>, cookie set
    refresh(cookie)  → no cookie: INVALID_COOKIES; Redis DEL of its key: removed → rotate (new token + cookie);
                       not there → reuse: delete every refreshToken:<user>:* key, INVALID_TOKEN
    end(cookie)      → blacklist the access token, DEL the cookie's key, clear the cookie
    changePassword   → stores the new hash only; no session is touched
  Expiry and signatures are left out: every token here is genuine and unexpired.
*/
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .session-sim { border: 1px solid var(--rule, #ddd); border-radius: 4px; padding: .9rem 1rem; margin: 1.2rem 0;
      background: #fff; font-size: .88rem; }
    .session-sim .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .8rem; }
    .session-sim h4 { margin: 0 0 .3rem; font-variant: small-caps; letter-spacing: .05em; font-weight: 400;
      color: var(--accent, #0f6b5c); }
    .session-sim .actions button { display: block; width: 100%; margin: .25rem 0; padding: .35rem .5rem;
      font: inherit; text-align: left; border: 1px solid var(--rule, #ddd); border-radius: 3px; background: #faf8f2;
      cursor: pointer; }
    .session-sim .actions button:hover { background: #f1ede1; }
    .session-sim code { font-size: .8rem; }
    .session-sim ol.log { margin: .8rem 0 0; padding-left: 1.4rem; max-height: 14rem; overflow-y: auto; }
    .session-sim .ok { color: var(--good, #1a7f37); } .session-sim .no { color: var(--bad, #b42318); }
    .session-sim .muted { color: var(--muted, #59636e); }
  `;
  document.head.append(style);

  const title = (name) => name[0].toUpperCase() + name.slice(1);

  for (const root of document.querySelectorAll('.session-sim')) {
    const actors = (root.dataset.actors ?? 'you').split(',').map((a) => a.trim());
    const withAttacker = root.dataset.attacker !== 'no';
    const holders = withAttacker ? [...actors, 'attacker'] : actors;
    const fresh = () => ({
      next: 1,
      redis: new Set(),
      cookie: Object.fromEntries(holders.map((h) => [h, null])),
    });
    let state = fresh();
    const key = (token) => `refreshToken:u1:${token}`;
    const issue = () => `rt${state.next++}`;
    const log = [];
    const say = (who, text, ok) => log.unshift({ who, text, ok });

    // One request's view of the server: same order as SessionService.refresh
    const serverRefresh = (token) => {
      if (state.redis.delete(key(token))) {
        const next = issue();
        state.redis.add(key(next));
        return { ok: true, next };
      }
      const revoked = [...state.redis].map((k) => k.split(':')[2]);
      state.redis.clear();
      return { ok: false, revoked };
    };
    const describeReuse = (token, revoked) =>
      `refresh with <code>${token}</code> → key already gone: <b>reuse detected</b>, INVALID_TOKEN. Revoked: ${
        revoked.length ? revoked.map((t) => `<code>${t}</code>`).join(', ') : 'nothing left'
      }`;

    const refresh = (who) => {
      const token = state.cookie[who];
      if (!token) {
        return say(who, 'refresh → <b>INVALID_COOKIES</b>: no refresh cookie to send', false);
      }
      const result = serverRefresh(token);
      if (result.ok) {
        state.cookie[who] = result.next;
        return say(
          who,
          `refresh with <code>${token}</code> → new access token, cookie now <code>${result.next}</code>`,
          true
        );
      }
      say(who, describeReuse(token, result.revoked), false);
    };

    // Two tabs share one cookie; both requests leave before either response sets the new cookie
    const twoTabs = (who) => {
      const token = state.cookie[who];
      if (!token) {
        return say(who, 'two tabs refresh → <b>INVALID_COOKIES</b> twice: no cookie', false);
      }
      const first = serverRefresh(token);
      state.cookie[who] = first.ok ? first.next : token;
      say(
        who,
        `tab 1: refresh with <code>${token}</code> → new access token, cookie now <code>${first.next}</code>`,
        true
      );
      const second = serverRefresh(token);
      say(who, `tab 2: ${describeReuse(token, second.revoked)}`, false);
    };

    const actions = [];
    for (const actor of actors) {
      actions.push([
        `${title(actor)}: sign in with Remember Me`,
        () => {
          const token = issue();
          state.redis.add(key(token));
          state.cookie[actor] = token;
          say(actor, `sign in → access token + refresh cookie <code>${token}</code>`, true);
        },
      ]);
      actions.push([`${title(actor)}: refresh`, () => refresh(actor)]);
      if (root.dataset.tabs === 'yes') {
        actions.push([`${title(actor)}: two tabs refresh at once`, () => twoTabs(actor)]);
      }
      actions.push([
        `${title(actor)}: sign out`,
        () => {
          const token = state.cookie[actor];
          if (token) {
            state.redis.delete(key(token));
          }
          state.cookie[actor] = null;
          say(
            actor,
            `sign out → access token blacklisted${token ? `, key <code>${token}</code> deleted` : ''}, cookie cleared`,
            true
          );
        },
      ]);
    }
    if (withAttacker) {
      const victim = actors[0];
      actions.push([
        `Attacker: steal ${victim === 'you' ? 'your' : `${victim}'s`} cookie`,
        () => {
          state.cookie.attacker = state.cookie[victim];
          say(
            'attacker',
            state.cookie[victim]
              ? `copies cookie <code>${state.cookie[victim]}</code>`
              : 'nothing to copy',
            !!state.cookie[victim]
          );
        },
      ]);
      actions.push(['Attacker: refresh', () => refresh('attacker')]);
    }
    if (root.dataset.password === 'yes') {
      actions.push([
        `${title(actors[0])}: change password`,
        () => {
          say(
            actors[0],
            `password changed → new hash stored. Refresh tokens still in Redis: ${state.redis.size}`,
            state.redis.size === 0
          );
        },
      ]);
    }
    actions.push([
      'Reset',
      () => {
        state = fresh();
        log.length = 0;
      },
    ]);

    const view = document.createElement('div');
    root.append(view);
    const render = () => {
      const cookie = (who) =>
        state.cookie[who] ? `<code>${state.cookie[who]}</code>` : '<span class="muted">none</span>';
      view.innerHTML = `
        <div class="cols">
          <div class="actions"><h4>Actions</h4></div>
          <div><h4>Cookies</h4>${holders.map((h) => `${title(h)}: ${cookie(h)}`).join('<br />')}</div>
          <div><h4>Redis</h4>${
            state.redis.size
              ? [...state.redis].map((k) => `<code>${k}</code>`).join('<br />')
              : '<span class="muted">empty</span>'
          }</div>
        </div>
        <ol class="log" reversed>${log
          .map((e) => `<li class="${e.ok ? 'ok' : 'no'}"><b>${e.who}</b>: ${e.text}</li>`)
          .join('')}</ol>`;
      const box = view.querySelector('.actions');
      for (const [label, run] of actions) {
        const button = Object.assign(document.createElement('button'), {
          type: 'button',
          textContent: label,
        });
        button.addEventListener('click', () => {
          run();
          render();
        });
        box.append(button);
      }
    };
    render();
  }
})();
