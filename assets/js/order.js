export const WA_PHONE = '77775259885';

export function readTour(card) {
  return {
    days: (card.dataset.days.match(/\S+/g) ?? []).map(Number),
    season: card.dataset.season.match(/\S+/g) ?? [],
  };
}

export function matchTour(tour, filter) {
  switch (filter) {
    case 'all': return true;
    case '1':
    case '2': return tour.days.includes(Number(filter));
    case '3': return Math.max(...tour.days) >= 3;
    case 'winter': return tour.season.includes('winter');
    default: return false;
  }
}

export function buildMessage(d) {
  const lines = [
    'Здравствуйте! Хочу заказать тур.',
    `Маршрут: ${d.tour}`,
    `Дата: ${d.date.split('-').reverse().join('.')}`,
    `Человек: ${d.people}`,
    `Имя: ${d.name.trim()}`,
  ];
  const note = d.note.trim();
  if (note) lines.push(`Пожелания: ${note}`);
  return lines.join('\n');
}

export function buildWaUrl(message) {
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`;
}

export function validate(d, today) {
  const errors = {};
  if (!d.tour) errors.tour = 'Выберите маршрут';
  if (!d.date) errors.date = 'Укажите дату';
  else if (d.date < today) errors.date = 'Дата уже прошла';
  if (!Number.isInteger(d.people) || d.people < 1 || d.people > 50) {
    errors.people = 'От 1 до 50 человек';
  }
  if (d.name.trim().length < 2) errors.name = 'Напишите имя';
  return errors;
}
