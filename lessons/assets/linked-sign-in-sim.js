/*
  Linked sign-in callback simulator. Markup: <div class="linked-sign-in-sim"></div>

  Set up a situation, predict where the browser lands, then run it. The run replays the checks of
  LinkedSignInService.finish and userFor (apps/api/src/modules/linked-sign-in/linked-sign-in.service.ts) in order and
  stops at the first that decides the outcome. Ann is a password user (ann@mail.test); Bob is another user.
*/
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .lsi { border: 1px solid var(--rule, #ddd); border-radius: 4px; padding: .8rem 1rem 1rem; margin: 1.2rem 0; background: #fff; font-size: .9rem; }
    .lsi label { display: block; margin: .35rem 0; }
    .lsi select { font: inherit; max-width: 100%; }
    .lsi button { font: inherit; margin-top: .6rem; }
    .lsi ol { margin: .6rem 0 0; padding-left: 1.3rem; }
    .lsi li.pass::marker { color: var(--good, #1a7f37); }
    .lsi li.stop { color: var(--bad, #b42318); }
    .lsi .land { margin-top: .5rem; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .85em; }
    .lsi .verdict.right { color: var(--good, #1a7f37); } .lsi .verdict.wrong { color: var(--bad, #b42318); }
  `;
  document.head.append(style);

  const fields = {
    start: [
      'Started on the sign-in page (signed out)',
      'Started on the account page, signed in as Ann',
    ],
    arrive: [
      'Callback comes back to the browser that started it, in time',
      'Callback opens in another browser, or after 10 minutes',
    ],
    consent: ['Approved at Google', 'Cancelled at Google'],
    link: ['This Google account is linked to nobody', 'It is linked to Ann', 'It is linked to Bob'],
    email: ['Google says the email is new@mail.test', 'Google says the email is ann@mail.test'],
  };
  const outcomes = {
    signedIn: 'Lands on /, signed in as an existing user',
    created: 'Lands on /, signed in as a new user',
    connected: 'Lands on /account, Google connected',
    failed: 'An error: LINKED_SIGN_IN_FAILED',
    emailTaken: 'An error: EMAIL_TAKEN_SIGN_IN_TO_LINK',
    taken: 'An error: LINKED_SIGN_IN_TAKEN',
  };

  // Mirrors finish() then userFor(); returns the trace and where the browser is redirected
  const run = ({ start, arrive, consent, link, email }) => {
    const steps = [];
    const connectingFlow = start === 1;
    const end = (outcome, connecting, error, userNote = '') => {
      const page = connecting ? '/account' : error ? '/sign-in' : '/';
      return { steps, outcome, land: `${page}${error ? `?error=${error}` : ''}${userNote}` };
    };
    if (arrive === 1) {
      // No state cookie here, so not even the mode is known: the error goes to /sign-in
      steps.push([
        'stop',
        'State cookie missing: the state in the URL matches nothing this browser started',
      ]);
      return end('failed', false, 'LINKED_SIGN_IN_FAILED');
    }
    steps.push([
      'pass',
      'State in the URL = state in the cookie; GETDEL takes the flow from Redis (once)',
    ]);
    if (consent === 1) {
      steps.push(['stop', 'No code in the URL: the user cancelled at the provider']);
      return end('failed', connectingFlow, 'LINKED_SIGN_IN_FAILED');
    }
    steps.push(['pass', 'Code + PKCE verifier exchanged at Google → profile { sub, email, name }']);
    const owner = [null, 'Ann', 'Bob'][link];
    if (owner) {
      if (connectingFlow && owner !== 'Ann') {
        steps.push(['stop', `A link for this sub exists, and it belongs to ${owner}, not Ann`]);
        return end('taken', true, 'LINKED_SIGN_IN_TAKEN');
      }
      steps.push(['pass', `A link for this sub exists → user ${owner} (email not even looked at)`]);
      if (connectingFlow) {
        return end('connected', true, undefined, '   (already connected: nothing changes)');
      }
      steps.push(['pass', `SessionService.start(${owner}, remember) sets the rf cookie`]);
      return end('signedIn', false, undefined, `   (as ${owner})`);
    }
    steps.push(['pass', 'No link for this sub yet']);
    if (connectingFlow) {
      steps.push(['pass', 'Connecting: insert a linked_sign_in row for Ann']);
      return end('connected', true);
    }
    if (email === 1) {
      steps.push(['stop', 'ann@mail.test belongs to Ann: never link by email']);
      return end('emailTaken', false, 'EMAIL_TAKEN_SIGN_IN_TO_LINK');
    }
    steps.push([
      'pass',
      'One transaction: create a user without a password + its linked_sign_in row',
    ]);
    steps.push(['pass', 'SessionService.start(new user, remember) sets the rf cookie']);
    return end('created', false);
  };

  const select = (name, options) =>
    `<select name="${name}">${options.map((text, i) => `<option value="${i}">${text}</option>`).join('')}</select>`;

  for (const root of document.querySelectorAll('.linked-sign-in-sim')) {
    root.classList.add('lsi');
    root.innerHTML = `
      ${Object.entries(fields)
        .map(([name, options]) => `<label>${select(name, options)}</label>`)
        .join('')}
      <label><b>Your prediction:</b> ${select('predict', ['…', ...Object.values(outcomes)])}</label>
      <button type="button">Run the callback</button>
      <div class="result" aria-live="polite"></div>`;
    const value = (name) => Number(root.querySelector(`[name="${name}"]`).value);
    const result = root.querySelector('.result');
    root.addEventListener('change', () => (result.innerHTML = ''));
    root.querySelector('button').addEventListener('click', () => {
      const predicted = value('predict');
      if (!predicted) {
        result.innerHTML = '<p>Predict first: that is where the learning happens.</p>';
        return;
      }
      const situation = Object.fromEntries(Object.keys(fields).map((name) => [name, value(name)]));
      const { steps, outcome, land } = run(situation);
      const isRight = Object.keys(outcomes)[predicted - 1] === outcome;
      result.innerHTML = `
        <ol>${steps.map(([kind, text]) => `<li class="${kind}">${text}</li>`).join('')}</ol>
        <p class="land">302 → ${land}</p>
        <p class="verdict ${isRight ? 'right' : 'wrong'}">${isRight ? 'Right.' : `Not quite: ${outcomes[outcome]}.`}</p>`;
    });
  }
})();
