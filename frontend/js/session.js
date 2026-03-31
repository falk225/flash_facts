const params = new URLSearchParams(window.location.search);
const accountId = params.get('account');

// Session state
let deck = [];
let totalCards = 0;
let currentCard = null;
let seenOnce = new Set();
let firstTryCorrect = new Set();
let cardResults = {};   // { cardId: { label, operation, firstTryCorrect } }
let soundsLoaded = false;

const problemDisplay = document.getElementById('problem-display');
const answerInput    = document.getElementById('answer-input');
const submitBtn      = document.getElementById('submit-btn');
const progressFill   = document.getElementById('progress-fill');
const scoreDisplay   = document.getElementById('score-display');
const cardsLeft      = document.getElementById('cards-left');
const feedbackEl     = document.getElementById('feedback-overlay');
const sessionView    = document.getElementById('session-view');
const endScreen      = document.getElementById('end-screen');

async function init() {
  if (!accountId) { window.location.href = '/'; return; }

  const [accounts, config] = await Promise.all([
    API.getAccounts(),
    API.getConfig(accountId)
  ]);
  const acc = accounts.find(a => a.id === accountId);
  if (!acc || !config.operations) { window.location.href = '/'; return; }

  document.getElementById('session-user').textContent = acc.name;

  deck = generateDeck(config);
  totalCards = deck.length;

  if (totalCards === 0) {
    alert('No cards to practice! Go to settings and enable at least one operation.');
    window.location.href = '/';
    return;
  }

  Sound.load().then(() => { soundsLoaded = true; });
  nextCard();
}

function nextCard() {
  if (deck.length === 0) {
    endSession();
    return;
  }
  currentCard = deck.shift();
  renderCard();
  answerInput.value = '';
  answerInput.focus();
}

function renderCard() {
  // Re-create element to retrigger animation
  const parent = problemDisplay.parentElement;
  parent.classList.remove('flash-card');
  void parent.offsetWidth; // reflow
  parent.classList.add('flash-card');

  problemDisplay.textContent = currentCard.display;
  updateProgress();
}

function updateProgress() {
  const completed = totalCards - deck.length;
  const pct = totalCards > 0 ? (completed / totalCards) * 100 : 0;
  progressFill.style.width = pct + '%';

  const correct = firstTryCorrect.size;
  const seen = seenOnce.size;
  scoreDisplay.textContent = `${correct} / ${seen} correct on first try`;
  cardsLeft.textContent = `${deck.length} card${deck.length !== 1 ? 's' : ''} left`;
}

function showFeedback(type) {
  feedbackEl.className = 'feedback-overlay';
  void feedbackEl.offsetWidth;
  feedbackEl.textContent = type === 'correct' ? '⭐' : '💪';
  feedbackEl.classList.add(type === 'correct' ? 'show-correct' : 'show-wrong');
}

function submitAnswer() {
  const raw = answerInput.value.trim();
  if (raw === '') return;
  const userAnswer = parseInt(raw, 10);
  if (isNaN(userAnswer)) return;

  const isFirstSeen = !seenOnce.has(currentCard.id);
  const isCorrect = userAnswer === currentCard.answer;

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
    setTimeout(nextCard, 500);
  } else {
    Sound.play('wrong');
    showFeedback('wrong');
    answerInput.classList.add('shake');
    answerInput.addEventListener('animationend', () => {
      answerInput.classList.remove('shake');
    }, { once: true });
    deck.push(currentCard); // re-queue
    setTimeout(nextCard, 600);
  }
}

submitBtn.addEventListener('click', submitAnswer);

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

async function endSession() {
  const total = totalCards;
  const correct = firstTryCorrect.size;
  const scorePct = total > 0 ? Math.round(correct / total * 100) : 0;

  // Save to server
  await API.saveSession(accountId, {
    total_cards: total,
    first_try_correct: correct,
    card_results: Object.values(cardResults)
  });

  // Show end screen
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
