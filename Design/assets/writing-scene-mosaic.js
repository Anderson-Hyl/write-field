(() => {
  const compare = document.getElementById('compareTension');
  const question = document.getElementById('question');
  const discussion = document.getElementById('discussionCard');
  const reopen = document.getElementById('reopenDiscussion');
  if (!compare || !question || !discussion || !reopen) return;

  compare.addEventListener('click', () => {
    if (discussion.hidden) reopen.click();
    question.value = '这个反例会怎样限制我对 traverse 的说法？';
    question.dispatchEvent(new InputEvent('input', { bubbles: true }));
    question.focus({ preventScroll: true });
    discussion.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
})();
