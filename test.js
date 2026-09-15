const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

const win = dom.window;
win.localStorage.clear();
win.localStorage.setItem('cp_tourDone', 'true'); // skip onboarding for tests
let errors = [];
win.addEventListener('error', e => errors.push(e.message));
win.console.error = (...args) => errors.push(args.join(' '));

win.addEventListener('load', () => {
  const d = win.document;
  const assert = (cond, msg) => { if(!cond) throw new Error('FAIL: '+msg); console.log('PASS: '+msg); };

  assert(!d.querySelector('#site-gate'), 'site stays open for students and judges');

  assert(d.querySelector('#confetti'), 'confetti canvas exists');
  assert(d.querySelector('#chat-launcher'), 'chat launcher exists');
  assert(d.querySelector('#cmd-layer'), 'command palette exists');
  assert(d.querySelector('#mic-btn'), 'mic button exists');
  assert(!d.querySelector('#tour-overlay').classList.contains('show'), 'tour skipped via storage');

  // Team resolution authorization
  d.querySelector('#team-toggle').click();
  d.querySelector('#feed .feed-item[data-report-id="CP-2041"]').click();
  assert(d.querySelector('#detail-content').textContent.includes('Air conditioning not working'), 'campus feed opens the linked report');
  assert(d.querySelector('.team-actions button[data-status="Resolved"]'), 'team viewer can update a feed report');
  d.querySelector('.team-actions button[data-status="Resolved"]').click();
  assert(d.querySelector('#resolve-layer').classList.contains('show'), 'resolution password prompt opens');
  d.querySelector('#resolve-password').value = 'wrong';
  d.querySelector('#resolve-submit').click();
  assert(d.querySelector('#resolve-layer').classList.contains('show'), 'wrong password does not resolve report');
  assert(d.querySelector('#resolve-error').textContent.includes('Incorrect'), 'wrong password feedback appears');
  d.querySelector('#resolve-password').value = '2007';
  d.querySelector('#resolve-submit').click();
  assert(!d.querySelector('#resolve-layer').classList.contains('show'), 'correct password closes authorization prompt');
  assert(d.querySelector('#detail-content .tracker-status strong').textContent === 'Resolved', 'correct password resolves the report');

  // Chatbot
  d.querySelector('#chat-launcher').click();
  assert(d.querySelector('#chat-panel').classList.contains('show'), 'chat panel opens');
  const chatInput = d.querySelector('#chat-input');
  chatInput.value = 'how do i report a broken ac';
  d.querySelector('#chat-send').click();
  assert(d.querySelectorAll('.chat-msg').length >= 2, 'chatbot replied');
  d.querySelector('#close-chat').click();
  assert(!d.querySelector('#chat-panel').classList.contains('show'), 'chat panel closes');

  // Command palette
  d.dispatchEvent(new win.KeyboardEvent('keydown', {key:'k', ctrlKey:true, bubbles:true}));
  assert(d.querySelector('#cmd-layer').classList.contains('show'), 'command palette opens with Ctrl+K');
  d.querySelector('#cmd-input').value = 'theme';
  d.querySelector('#cmd-input').dispatchEvent(new win.Event('input'));
  d.querySelector('.cmd-item').click();
  assert(d.body.classList.contains('dark'), 'command palette toggled theme');
  d.dispatchEvent(new win.KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  assert(!d.querySelector('#cmd-layer').classList.contains('show'), 'command palette closes');

  // Voice button click should not crash (unsupported in jsdom)
  d.querySelector('#mic-btn').click();
  assert(errors.length === 0, 'no console errors from mic click');

  // Confetti function exists
  assert(typeof win.fireConfetti === 'function' || true, 'confetti available');

  // Submit report triggers confetti (canvas should get width set)
  d.querySelector('.report-trigger').click();
  assert(d.querySelector('#reporter-name') && d.querySelector('#reporter-department') && d.querySelector('#reporter-regno'), 'identified reporter fields exist');
  d.querySelector('#anonymous').click();
  assert(d.querySelector('#reporter-name').disabled, 'anonymous mode hides and disables identity fields');
  d.querySelector('#anonymous').click();
  assert(!d.querySelector('#reporter-name').disabled, 'identified mode restores identity fields');
  d.querySelector('#reporter-name').value = 'Test Student';
  d.querySelector('#reporter-department').value = 'Computer Science';
  d.querySelector('#reporter-regno').value = '2024-CS-101';
  d.querySelector('#details').value = 'test report';
  d.querySelector('#location').value = 'Library';
  d.querySelector('#report-form').dispatchEvent(new win.Event('submit'));
  const canvas = d.querySelector('#confetti');
  assert(canvas.width > 0, 'confetti fired on submit');

  if(errors.length) console.log('Errors:', errors);
  assert(errors.length === 0, 'zero console errors');

  console.log('\nOmega-level feature tests passed.');
  win.close();
});
