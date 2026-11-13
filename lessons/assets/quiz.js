/*
  Reusable quiz component. Markup per question:

    <fieldset class="quiz" data-answer="b" data-why="Shown after any answer.">
      <legend>Question text</legend>
      <label><input type="radio" name="q1" value="a" /> Option</label>
      ...
    </fieldset>

  Typed answers: put <label><input type="text" /></label> in the fieldset instead of radios; data-answer is
  compared case-insensitively.

  Feedback is immediate: picking an option marks it right or wrong and reveals the reason. A running score
  appears in any element with id="quiz-score".
*/
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .quiz { border: 1px solid var(--rule, #ddd); border-radius: 4px; margin: 1.1rem 0; padding: .8rem 1rem 1rem; }
    .quiz legend { padding: 0 .3rem; font-weight: 600; }
    .quiz label { display: block; padding: .3rem .5rem; margin: .15rem 0; border-radius: 3px; cursor: pointer; }
    .quiz label:hover { background: #f3f1ea; }
    .quiz label.right { background: #e6f4ea; outline: 1px solid var(--good, #1a7f37); }
    .quiz label.wrong { background: #fde8e7; outline: 1px solid var(--bad, #b42318); }
    .quiz .why { display: none; margin-top: .6rem; font-size: .9rem; color: var(--muted, #555); }
    .quiz.answered .why { display: block; }
  `;
  document.head.append(style);

  const quizzes = [...document.querySelectorAll('fieldset.quiz')];
  const score = document.getElementById('quiz-score');
  let correct = 0;
  let answered = 0;

  const render = () => {
    if (score) {
      score.textContent = `${correct} of ${answered} correct (${quizzes.length} questions)`;
    }
  };

  const record = (isRight) => {
    answered += 1;
    correct += isRight ? 1 : 0;
    render();
  };

  for (const quiz of quizzes) {
    const why = document.createElement('p');
    why.className = 'why';
    why.innerHTML = quiz.dataset.why ?? '';
    quiz.append(why);

    // Typed answer: <fieldset class="quiz" data-answer="300"><input type="text" /> …; checked on Enter or Check
    const typed = quiz.querySelector('input[type="text"]');
    if (typed) {
      const check = Object.assign(document.createElement('button'), {
        type: 'button',
        textContent: 'Check',
      });
      typed.after(check);
      const submit = () => {
        if (quiz.classList.contains('answered') || !typed.value.trim()) {
          return;
        }
        const isRight = typed.value.trim().toLowerCase() === quiz.dataset.answer.toLowerCase();
        quiz.classList.add('answered');
        typed.closest('label').classList.add(isRight ? 'right' : 'wrong');
        typed.disabled = true;
        check.disabled = true;
        why.innerHTML = `${isRight ? '' : `Answer: <b>${quiz.dataset.answer}</b>. `}${quiz.dataset.why ?? ''}`;
        record(isRight);
      };
      check.addEventListener('click', submit);
      typed.addEventListener('keydown', (event) => event.key === 'Enter' && submit());
      continue;
    }

    quiz.addEventListener('change', (event) => {
      if (quiz.classList.contains('answered')) {
        return;
      }
      const picked = event.target.closest('label');
      const isRight = event.target.value === quiz.dataset.answer;
      quiz.classList.add('answered');
      picked.classList.add(isRight ? 'right' : 'wrong');
      // Always show which option was right, so a wrong pick still teaches
      quiz
        .querySelector(`input[value="${quiz.dataset.answer}"]`)
        .closest('label')
        .classList.add('right');
      quiz.querySelectorAll('input').forEach((input) => (input.disabled = true));
      record(isRight);
    });
  }

  render();
})();
