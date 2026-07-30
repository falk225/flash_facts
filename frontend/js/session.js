const params = new URLSearchParams(window.location.search);
const accountId = params.get('account');

// Session state
let deck = [];
let totalCards = 0;
let currentCard = null;
let seenOnce = new Set();
let firstTryCorrect = new Set();
let cardResults = {};   // { cardId: { label, operation, first_try_correct } }
let accepting = true;   // false briefly after an answer to prevent double-submit
let correctSinceLastSave = 0;
const AUTO_SAVE_INTERVAL = 10;
let streak = 0;
let avatarEl = null;

const problemDisplay = document.getElementById('problem-display');
const answerInput    = document.getElementById('answer-input');
const submitBtn      = document.getElementById('submit-btn');
const progressFill   = document.getElementById('progress-fill');
const scoreDisplay   = document.getElementById('score-display');
const cardsLeft      = document.getElementById('cards-left');
const feedbackEl     = document.getElementById('feedback-overlay');
const answerReveal   = document.getElementById('correct-answer-reveal');
const sessionView    = document.getElementById('session-view');
const endScreen      = document.getElementById('end-screen');
const resumeDialog   = document.getElementById('resume-dialog');

async function init() {
  if (!accountId) { window.location.href = '/'; return; }

  const [accounts, config, draft] = await Promise.all([
    API.getAccounts(),
    API.getConfig(accountId),
    API.getDraft(accountId)
  ]);

  const acc = accounts.find(a => a.id === accountId);
  if (!acc || !config.operations) { window.location.href = '/'; return; }
  document.getElementById('session-user').textContent = acc.name;

  const avatarContainer = document.getElementById('session-avatar');
  avatarEl = makeAvatarEl(acc, 44);
  avatarContainer.appendChild(avatarEl);

  Sound.load();

  if (draft && draft.remaining_deck && draft.remaining_deck.length > 0) {
    showResumeDialog(draft, config);
  } else {
    startFresh(config);
  }
}

function showResumeDialog(draft, config) {
  const done = draft.total_cards - draft.remaining_deck.length;
  const pct  = draft.total_cards > 0 ? Math.round(done / draft.total_cards * 100) : 0;
  const when = draft.saved_at ? draft.saved_at.replace('T', ' at ').slice(0, 19) : '';
  document.getElementById('resume-subtitle').textContent =
    `${pct}% complete (${done} of ${draft.total_cards} cards done)` +
    (when ? ` · Saved ${when}` : '');

  resumeDialog.style.display = 'flex';

  document.getElementById('resume-btn').addEventListener('click', () => {
    resumeDialog.style.display = 'none';
    loadDraft(draft);
  }, { once: true });

  document.getElementById('fresh-btn').addEventListener('click', () => {
    resumeDialog.style.display = 'none';
    API.deleteDraft(accountId);
    startFresh(config);
  }, { once: true });
}

function startFresh(config) {
  deck = generateDeck(config);
  totalCards = deck.length;

  if (totalCards === 0) {
    alert('No cards to practice! Go to settings and enable at least one operation.');
    window.location.href = '/';
    return;
  }

  nextCard();
}

function loadDraft(draft) {
  deck            = draft.remaining_deck;
  totalCards      = draft.total_cards;
  seenOnce        = new Set(draft.seen_once || []);
  firstTryCorrect = new Set(draft.first_try_correct || []);
  cardResults     = draft.card_results || {};
  correctSinceLastSave = 0;
  nextCard();
}

function nextCard() {
  if (deck.length === 0) {
    endSession();
    return;
  }
  accepting = true;
  currentCard = deck.shift();
  renderCard();
  answerInput.value = '';
  answerInput.focus();
}

function renderCard() {
  const parent = problemDisplay.parentElement;
  parent.classList.remove('flash-card');
  void parent.offsetWidth;
  parent.classList.add('flash-card');
  problemDisplay.textContent = currentCard.display;
  answerReveal.textContent = '';
  answerReveal.classList.remove('visible');
  updateProgress();
}

function updateProgress() {
  const pct = totalCards > 0 ? ((totalCards - deck.length) / totalCards) * 100 : 0;
  progressFill.style.width = pct + '%';
  scoreDisplay.textContent = `${firstTryCorrect.size} / ${seenOnce.size} correct on first try`;
  cardsLeft.textContent = `${deck.length} card${deck.length !== 1 ? 's' : ''} left`;
}

function animateAvatar(type) {
  if (!avatarEl) return;
  avatarEl.classList.remove('avatar-correct', 'avatar-wrong');
  void avatarEl.offsetWidth;
  avatarEl.classList.add(type === 'correct' ? 'avatar-correct' : 'avatar-wrong');
  avatarEl.addEventListener('animationend', () => {
    avatarEl.classList.remove('avatar-correct', 'avatar-wrong');
  }, { once: true });
}

function updateStreak() {
  const streakDisplay = document.getElementById('streak-display');
  const streakCount = document.getElementById('streak-count');
  if (streak >= 2) {
    streakDisplay.style.display = '';
    streakCount.textContent = streak;
    if (streak === 5 || (streak >= 10 && streak % 5 === 0)) {
      streakDisplay.classList.remove('streak-milestone');
      void streakDisplay.offsetWidth;
      streakDisplay.classList.add('streak-milestone');
    }
  } else {
    streakDisplay.style.display = 'none';
  }
}

function showFeedback(type) {
  feedbackEl.className = 'feedback-overlay';
  void feedbackEl.offsetWidth;
  feedbackEl.textContent = type === 'correct' ? '⭐' : '💪';
  feedbackEl.classList.add(type === 'correct' ? 'show-correct' : 'show-wrong');
}

function submitAnswer() {
  if (!accepting || !currentCard) return;
  const raw = answerInput.value.trim();
  if (raw === '') return;
  const userAnswer = parseInt(raw, 10);
  if (isNaN(userAnswer)) return;

  accepting = false;

  const isFirstSeen = !seenOnce.has(currentCard.id);
  const isCorrect   = userAnswer === currentCard.answer;

  seenOnce.add(currentCard.id);

  if (!cardResults[currentCard.id]) {
    cardResults[currentCard.id] = {
      label: currentCard.label,
      operation: currentCard.operation,
      first_try_correct: false
    };
  }

  if (isCorrect) {
    Sound.play('correct');
    showFeedback('correct');
    if (isFirstSeen) {
      firstTryCorrect.add(currentCard.id);
      cardResults[currentCard.id].first_try_correct = true;
    }
    streak++;
    updateStreak();
    animateAvatar('correct');
    correctSinceLastSave++;
    if (correctSinceLastSave >= AUTO_SAVE_INTERVAL) {
      correctSinceLastSave = 0;
      API.saveDraft(accountId, {
        total_cards: totalCards,
        remaining_deck: [...deck],
        seen_once: [...seenOnce],
        first_try_correct: [...firstTryCorrect],
        card_results: cardResults
      });
    }
    setTimeout(nextCard, 500);
  } else {
    Sound.play('wrong');
    showFeedback('wrong');
    answerInput.classList.add('shake');
    answerInput.addEventListener('animationend', () => {
      answerInput.classList.remove('shake');
    }, { once: true });
    answerReveal.textContent = `Answer: ${currentCard.answer}`;
    answerReveal.classList.add('visible');
    streak = 0;
    updateStreak();
    animateAvatar('wrong');
    deck.push(currentCard);
    setTimeout(nextCard, 1500);
  }
}

submitBtn.addEventListener('click', submitAnswer);
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

// --- Quit & save progress ---

document.getElementById('quit-btn').addEventListener('click', async () => {
  // Re-add current card to front of deck so it's included in the save
  const remainingDeck = currentCard ? [currentCard, ...deck] : [...deck];

  await API.saveDraft(accountId, {
    total_cards: totalCards,
    remaining_deck: remainingDeck,
    seen_once: [...seenOnce],
    first_try_correct: [...firstTryCorrect],
    card_results: cardResults
  });

  window.location.href = '/';
});

// --- End session ---

async function endSession() {
  const total   = totalCards;
  const correct = firstTryCorrect.size;
  const scorePct = total > 0 ? Math.round(correct / total * 100) : 0;

  // Clear any saved draft and save completed session
  await Promise.all([
    API.deleteDraft(accountId),
    API.saveSession(accountId, {
      total_cards: total,
      first_try_correct: correct,
      card_results: Object.values(cardResults)
    })
  ]);

  sessionView.style.display = 'none';
  endScreen.style.display = 'flex';

  document.getElementById('end-emoji').textContent = scorePct >= 80 ? '🌟' : scorePct >= 60 ? '👍' : '💪';
  document.getElementById('end-message').innerHTML =
    `You got <em>${correct} out of ${total}</em> right on your first try!`;
  document.getElementById('end-pct').textContent = `${scorePct}%`;
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  window.location.href = `session.html?account=${accountId}`;
});

document.getElementById('home-btn').addEventListener('click', () => {
  window.location.href = '/';
});

document.getElementById('stats-btn-end').addEventListener('click', () => {
  window.location.href = `stats.html?account=${accountId}`;
});

init();
