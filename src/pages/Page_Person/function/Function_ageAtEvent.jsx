function parseDate(str) {
  if (!str) return null;
  const parts = str.split(".");
  if (parts.length === 3) {
    const [day, month, year] = parts.map((p) => parseInt(p, 10));
    return new Date(year, month - 1, day);
  } else if (parts.length === 2) {
    const [month, year] = parts.map((p) => parseInt(p, 10));
    return new Date(year, month - 1, 1);
  } else if (parts.length === 1) {
    const year = parseInt(parts[0], 10);
    return new Date(year, 0, 1);
  }
  return null;
}

function pluralYears(years) {
  const lastDigit = years % 10;
  const lastTwoDigits = years % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${years} лет`;
  if (lastDigit === 1) return `${years} год`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${years} года`;
  return `${years} лет`;
}

function pluralMonths(months) {
  const lastDigit = months % 10;
  const lastTwoDigits = months % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${months} месяцев`;
  if (lastDigit === 1) return `${months} месяц`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${months} месяца`;
  return `${months} месяцев`;
}

function pluralDays(days) {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${days} дней`;
  if (lastDigit === 1) return `${days} день`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${days} дня`;
  return `${days} дней`;
}

export function ageAtEvent(birthdayStr, eventDateStr) {
  if (!birthdayStr || !eventDateStr) return "";

  const birthday = parseDate(birthdayStr);
  const eventDate = parseDate(eventDateStr);
  if (!birthday || !eventDate) return "";

  let years = eventDate.getFullYear() - birthday.getFullYear();
  let months = eventDate.getMonth() - birthday.getMonth();
  let days = eventDate.getDate() - birthday.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      0
    ).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // правила
  if (years === 0 && months === 0) {
    return pluralDays(days);
  }
  if (years === 0 && months > 0 && months <= 4) {
    return `${pluralMonths(months)} ${pluralDays(days)}`;
  }
  if (years < 1) {
    return pluralMonths(months);
  }
  if (years < 2) {
    return `${pluralYears(years)} ${pluralMonths(months)}`;
  }
  return pluralYears(years);
}
