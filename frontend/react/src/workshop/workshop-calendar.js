const moscowMonth = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Moscow', month: 'numeric',
});

export function moscowSeason(now = new Date()) {
  const month = Number(moscowMonth.format(now));
  return ['winter', 'spring', 'summer', 'autumn'][Math.floor(month / 3) % 4];
}

