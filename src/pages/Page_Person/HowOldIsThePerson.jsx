export function parseDate(str) {
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
  if (lastDigit < 1) return ``;
  if (lastDigit >= 2 && lastDigit <= 4) return `${months} месяца`;
  return `${months} месяцев`;
}

export function formatAge(birthdayStr, diedStr) {
  if (!birthdayStr) return "";

  // если смерть указана как "неизвестно" — не считаем возраст
  if (diedStr && diedStr.trim().toLowerCase() === "неизвестно") {
    return "";
  }

  const birthday = parseDate(birthdayStr);
  if (!birthday) return "";

  const endDate = diedStr ? parseDate(diedStr) : new Date();
  if (!endDate) return "";

  let years = endDate.getFullYear() - birthday.getFullYear();
  let months = endDate.getMonth() - birthday.getMonth();
  let days = endDate.getDate() - birthday.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 1) {
    return pluralMonths(months);
  } else if (years < 2) {
    return `${pluralYears(years)} ${pluralMonths(months)}`;
  } else {
    return pluralYears(years);
  }
}
