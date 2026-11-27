import { readTour, matchTour, buildMessage, buildWaUrl, validate } from './order.js';

const cards = document.querySelectorAll('article.tour');
const filters = document.querySelectorAll('.pick__btn[data-filter]');
const count = document.querySelector('.pick__count');

function applyFilter(active) {
  for (const filter of filters) {
    filter.setAttribute('aria-pressed', String(filter === active));
  }

  let found = 0;
  for (const card of cards) {
    const matches = matchTour(readTour(card), active.dataset.filter);
    card.hidden = !matches;
    if (matches) found += 1;
  }
  count.textContent = found ? `Найдено: ${found}` : 'Ничего не нашли — напишите нам, подберём';
}

for (const filter of filters) {
  filter.addEventListener('click', () => applyFilter(filter));
}
applyFilter(document.querySelector('.pick__btn[aria-pressed="true"]'));

const form = document.querySelector('#order-form');
const { tour, date, people, name, note } = form.elements;
const preview = form.querySelector('.order__text');
const errorFields = form.querySelectorAll('[data-error]');

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function readOrder() {
  return {
    tour: tour.value,
    date: date.value,
    people: people.value === '' ? '' : people.valueAsNumber,
    name: name.value,
    note: note.value,
  };
}

function updatePreview() {
  preview.textContent = buildMessage(readOrder());
}

date.min = localToday();
form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);
updatePreview();

for (const link of document.querySelectorAll('.tour__link[href="#order"]')) {
  link.addEventListener('click', () => {
    tour.value = link.closest('article.tour').dataset.tour;
    updatePreview();
    requestAnimationFrame(() => date.focus({ preventScroll: true }));
  });
}

for (const button of form.querySelectorAll('.stepper__btn[data-step]')) {
  button.addEventListener('click', () => {
    const next = Number(people.value) + Number(button.dataset.step);
    people.value = Math.min(50, Math.max(1, next));
    updatePreview();
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = readOrder();
  const today = localToday();
  date.min = today;
  const errors = validate(data, today);
  let firstInvalid;

  for (const errorField of errorFields) {
    const fieldName = errorField.dataset.error;
    const field = form.elements.namedItem(fieldName);
    const error = errors[fieldName];
    errorField.textContent = error ?? '';
    if (error) {
      field.setAttribute('aria-invalid', 'true');
      firstInvalid ??= field;
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const message = buildMessage(data);
  preview.textContent = message;
  window.open(buildWaUrl(message), '_blank', 'noopener');
});
