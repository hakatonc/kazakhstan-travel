import { buildWaUrl, matchTour } from './order.js';
import { agentUrl, askAgent } from './agent.js';

export const CATALOG = [
  { name: 'Кольсайские озёра и Каинды', days: [1, 2], season: ['summer'], tags: ['lakes', 'mountains'] },
  { name: 'Чарынский каньон', days: [1], season: ['summer', 'winter'], tags: ['canyon'] },
  { name: 'Алтын-Эмель и Поющий бархан', days: [1, 2], season: ['summer'], tags: ['desert'] },
  { name: 'Большое Алматинское озеро', days: [1], season: ['summer', 'winter'], tags: ['lakes', 'mountains'] },
  { name: 'Шымбулак и Медео', days: [1], season: ['summer', 'winter'], tags: ['mountains'] },
  { name: 'Золотое кольцо', days: [3, 4, 5, 6], season: ['summer'], tags: ['lakes', 'canyon', 'desert', 'mountains'] },
];

export const STEPS = [
  {
    key: 'people', question: 'Сколько человек поедет?',
    options: [
      { label: '1–2', value: '1–2' },
      { label: '3–6', value: '3–6' },
      { label: '7 и больше', value: '7 и больше' },
    ],
  },
  {
    key: 'days', question: 'На сколько дней хотите поехать?',
    options: [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3 и больше', value: '3' },
    ],
  },
  {
    key: 'season', question: 'В какое время года планируете поездку?',
    options: [{ label: 'Лето', value: 'summer' }, { label: 'Зима', value: 'winter' }],
  },
  {
    key: 'interest', question: 'Что хотите увидеть?',
    options: [
      { label: 'Озёра', value: 'lakes' },
      { label: 'Каньоны', value: 'canyon' },
      { label: 'Горы', value: 'mountains' },
      { label: 'Пустыня', value: 'desert' },
    ],
  },
];

export const QUIZ = [
  { key: 'days', question: 'Сколько дней на поездку?', options: ['1 день', '2 дня', '3 дня и больше'] },
  { key: 'who', question: 'С кем едете?', options: ['Один или вдвоём', 'С детьми', 'С пожилыми', 'Компанией'] },
  { key: 'like', question: 'Что любите?', options: ['Озёра', 'Каньоны', 'Горы', 'Пустыня'] },
  { key: 'pace', question: 'Какой темп?', options: ['Спокойный', 'Активный'] },
];

export function buildQuizRequest(a) {
  return 'Мини-подбор: ' + a.days + '; еду: ' + a.who.toLowerCase() + '; люблю: ' +
    a.like.toLowerCase() + '; темп: ' + a.pace.toLowerCase() + '. Какой тур подойдёт?';
}

export function buildItineraryText(wa) {
  return ('Здравствуйте! Пришлите, пожалуйста, подробный маршрут по дням. ' + wa).trim();
}

export function pickTours(a) {
  const suitable = CATALOG.filter(tour => tour.season.includes(a.season) &&
    (a.days === '3' ? matchTour(tour, '3') : tour.days.includes(Number(a.days))));
  const preferred = suitable.filter(tour => tour.tags.includes(a.interest));
  return (preferred.length ? preferred : suitable).slice(0, 3).map(tour => tour.name);
}

export function parseInterest(text) {
  const lower = text.toLowerCase();
  if (/оз[её]р/.test(lower)) return 'lakes';
  if (lower.includes('каньон')) return 'canyon';
  if (lower.includes('гор')) return 'mountains';
  if (/пустын|бархан/.test(lower)) return 'desert';
  return null;
}

export function buildChatMessage(a, names) {
  const lines = [
    'Здравствуйте! Хочу подобрать тур.',
    `Группа: ${a.people} чел.`,
    `Дней: ${a.days}`,
  ];
  for (const [key, title] of [['season', 'Сезон'], ['interest', 'Интересы']]) {
    const step = STEPS.find(item => item.key === key);
    lines.push(`${title}: ${step.options.find(option => option.value === a[key]).label}`);
  }
  if (names.length) lines.push(`Подходит: ${names.join(', ')}`);
  return lines.join('\n');
}

export function parseFreeText(text) {
  const lower = text.toLowerCase();
  const result = {};
  if (/лет(о|ом|н)/.test(lower)) result.season = 'summer';
  else if (/зим/.test(lower)) result.season = 'winter';
  const day = lower.match(/(\d+)\s*(дн|день)/);
  if (day) result.days = String(Math.min(Math.max(Number(day[1]), 1), 3));
  if (/вдво[её]м|пара|парой/.test(lower)) result.people = '1–2';
  const interest = parseInterest(text);
  if (interest) result.interest = interest;
  return result;
}

function peopleBucket(text) {
  const digits = text.match(/\d+/g);
  if (!digits || digits.length !== 1) return null;
  const count = Number(digits[0]);
  if (count < 1) return null;
  if (count <= 2) return '1–2';
  return count <= 6 ? '3–6' : '7 и больше';
}

function readStepAnswer(step, text, parsed) {
  const lower = text.toLowerCase().replace(/\s*[-–—]\s*/g, '–');
  const choice = step.options.find(option => option.label.toLowerCase() === lower);
  if (choice) return choice.value;
  if (parsed[step.key]) return parsed[step.key];
  if (step.key === 'people') return peopleBucket(text);
  if (step.key === 'days' && /^\d+$/.test(lower)) return String(Math.min(Math.max(Number(lower), 1), 3));
  return null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function initChat() {
  const root = document.querySelector('#chat-root') || document.body.appendChild(el('div'));
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

  const fab = el('button', 'cx-fab', '✦ Тур вместе с ИИ');
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  const panel = el('section', 'cx');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'ИИ-помощник по подбору тура');
  const head = el('header', 'cx__head');
  const close = el('button', 'cx__close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Закрыть чат');
  const titles = el('div', 'cx__titles');
  titles.append(el('b', 'cx__title', 'ИИ-помощник Kazakhstan Travel'),
    el('span', 'cx__sub', 'Вы общаетесь с ИИ-помощником, детали подтвердит гид'));
  head.append(titles, close);
  const log = el('div', 'cx__log');
  log.setAttribute('aria-live', 'polite');
  const chips = el('div', 'cx__chips');
  const form = el('form', 'cx__form');
  const input = el('textarea', 'cx__input');
  input.rows = 1;
  input.maxLength = 300;
  input.placeholder = 'Напишите своими словами';
  input.setAttribute('aria-label', 'Ваше сообщение');
  const mic = el('button', 'cx__tool', '🎙');
  mic.type = 'button';
  const send = el('button', 'cx__send', '↑');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Отправить');
  const row = el('div', 'cx__row');
  row.append(input, mic, send);
  const note = el('p', 'cx__note', 'Цены и даты уточняйте в WhatsApp');
  form.append(row, note);
  panel.append(head, log, chips, form);
  root.append(fab, panel);

  let answers;
  let timer = 0;

  function grow() {
    input.style.height = 'auto';
    const line = parseFloat(getComputedStyle(input).lineHeight) || 22;
    input.style.height = `${Math.min(input.scrollHeight, line * 5)}px`;
  }

  function userMessage(text) {
    log.append(el('p', 'cx__msg cx__msg--user', text));
    log.scrollTop = log.scrollHeight;
  }

  function say(text, done) {
    const box = el('div', 'cx__msg cx__msg--bot');
    const body = el('p', 'cx__text');
    box.append(el('span', 'cx__dot', '✦'), body);
    log.append(box);
    clearInterval(timer);
    const finishTyping = () => {
      body.textContent = text;
      log.scrollTop = log.scrollHeight;
      if (done) done();
    };
    if (reduced) { finishTyping(); return; }
    let n = 0;
    timer = setInterval(() => {
      n += 1;
      body.textContent = text.slice(0, n);
      log.scrollTop = log.scrollHeight;
      if (n >= text.length) { clearInterval(timer); finishTyping(); }
    }, 15);
  }

  function chip(label, action) {
    const b = el('button', 'cx__chip', label);
    b.type = 'button';
    b.addEventListener('click', action);
    chips.append(b);
  }

  function nextStep() {
    return STEPS.find(step => !answers[step.key]);
  }

  function showResult() {
    const names = pickTours(answers);
    const text = names.length ? `Вам подойдут:\n${names.join('\n')}` :
      'Подходящего тура не нашли. Напишите нам в WhatsApp, чтобы обсудить поездку.';
    say(text, () => {
      const link = el('a', 'cx__chip cx__chip--wa', 'Написать в WhatsApp');
      link.href = buildWaUrl(buildChatMessage(answers, names));
      link.target = '_blank';
      link.rel = 'noopener';
      chips.replaceChildren(link);
      chip('Начать заново', start);
    });
  }

  function askNext(prefix) {
    chips.replaceChildren();
    const step = nextStep();
    if (!step) { showResult(); return; }
    say(prefix ? `${prefix} ${step.question}` : step.question, () => {
      chips.replaceChildren();
      for (const { label, value } of step.options) {
        chip(label, () => {
          userMessage(label);
          answers[step.key] = value;
          askNext('');
        });
      }
    });
  }

  function start() {
    answers = {};
    log.replaceChildren();
    chips.replaceChildren();
    input.value = '';
    grow();
    history.length = 0;
    if (aiUrl) {
      say('Здравствуйте! Я ИИ-помощник Kazakhstan Travel. Расскажу о маршрутах, сезонах и что входит в тур, помогу подобрать поездку и оставить заявку. Спросите меня о чём угодно.', () => {
        chip('✦ Подбор за 4 вопроса', runQuiz);
        ['Куда поехать на 1 день?', 'Что посмотреть зимой?', 'Что входит в стоимость?'].forEach(q => {
          const chip = el('button', 'cx__chip', q);
          chip.type = 'button';
          chip.addEventListener('click', () => { userMessage(q); viaAgent(q); });
          chips.append(chip);
        });
      });
      return;
    }
    say('Здравствуйте! Я помощник по подбору тура. Отвечайте кнопками или своими словами.', () => askNext(''));
  }

  function waChip(label, text, extra) {
    const link = el('a', extra ? 'cx__chip cx__chip--wa ' + extra : 'cx__chip cx__chip--wa', label);
    link.href = buildWaUrl(text);
    link.target = '_blank';
    link.rel = 'noopener';
    chips.append(link);
  }

  function runQuiz() {
    const picked = {};
    const ask = i => {
      chips.replaceChildren();
      if (i >= QUIZ.length) {
        const text = buildQuizRequest(picked);
        userMessage(text);
        viaAgent(text);
        return;
      }
      say(QUIZ[i].question, () => {
        for (const option of QUIZ[i].options) {
          chip(option, () => {
            userMessage(option);
            picked[QUIZ[i].key] = option;
            ask(i + 1);
          });
        }
      });
    };
    ask(0);
  }

  const aiUrl = agentUrl();
  const history = [];

  function viaAgent(text) {
    history.push({ role: 'user', content: text });
    chips.replaceChildren();
    askAgent(aiUrl, history).then(reply => {
      history.push({ role: 'assistant', content: reply.text });
      say(reply.text, () => {
        reply.photos.filter(n => /^[a-z0-9-]+$/.test(n)).slice(0, 3).forEach(n => {
          const img = document.createElement('img');
          img.className = 'cx__photo';
          img.src = `assets/img/${n}.webp`;
          img.alt = '';
          img.loading = 'lazy';
          img.onload = () => { log.scrollTop = log.scrollHeight; };
          (log.lastElementChild.querySelector('.cx__text') || log.lastElementChild).append(img);
        });
        chips.replaceChildren();
        if (reply.wa) waChip('Написать в WhatsApp', reply.wa);
        waChip('Запросить маршрут по дням', buildItineraryText(reply.wa || ''), 'cx__chip--plan');
        chip('Подбор за 4 вопроса', runQuiz);
      });
    }).catch(() => {
      history.pop();
      say('Сейчас не могу ответить. Напишите нам в WhatsApp — поможем с выбором.', () => {
        const link = el('a', 'cx__chip cx__chip--wa', 'Написать в WhatsApp');
        link.href = buildWaUrl('Здравствуйте! Хочу подобрать тур.');
        link.target = '_blank';
        link.rel = 'noopener';
        chips.replaceChildren(link);
      });
    });
  }

  function submit() {
    const text = input.value.trim();
    if (aiUrl && text) {
      input.value = '';
      grow();
      userMessage(text);
      viaAgent(text);
      return;
    }
    const step = answers && nextStep();
    if (!text || !step) return;
    input.value = '';
    grow();
    userMessage(text);
    const parsed = parseFreeText(text);
    const found = { ...parsed };
    if (!found[step.key]) {
      const value = readStepAnswer(step, text, parsed);
      if (value) found[step.key] = value;
    }
    if (!Object.keys(found).length) { askNext('Не понял ответ.'); return; }
    Object.assign(answers, found);
    askNext('');
  }

  if (Recognition) {
    mic.setAttribute('aria-label', 'Голосовой ввод');
    mic.addEventListener('click', () => {
      const recognition = new Recognition();
      recognition.lang = 'ru-RU';
      recognition.interimResults = false;
      recognition.addEventListener('result', event => {
        input.value = `${input.value} ${event.results[0][0].transcript}`.trim();
        grow();
      });
      recognition.start();
    });
  } else {
    mic.disabled = true;
    mic.title = 'голос — скоро (бета)';
    mic.setAttribute('aria-label', 'голос — скоро (бета)');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    submit();
  });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });

  function setOpen(open) {
    panel.hidden = !open;
    fab.hidden = open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!answers) start();
      input.focus();
    } else fab.focus();
  }

  fab.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  for (const opener of document.querySelectorAll('[data-open-chat]')) {
    opener.addEventListener('click', () => setOpen(true));
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
}

if (typeof document !== 'undefined') initChat();
