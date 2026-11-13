/*
  Reusable quiz component. Markup per question:

    <fieldset class="quiz" data-answer="b" data-why="Shown after any answer.">
      <legend>Question text</legend>
      <label><input type="radio" name="q1" value="a" /> Option</label>
      ...
    </fieldset>

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

  for (const quiz of quizzes) {
    const why = document.createElement('p');
    why.className = 'why';
    why.innerHTML = quiz.dataset.why ?? '';
    quiz.append(why);

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
      answered += 1;
      correct += isRight ? 1 : 0;
      render();
    });
  }

  render();
})();
