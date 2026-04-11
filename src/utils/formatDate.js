export const formatNotificationDate = (dateInput) => {
  const now = new Date();
  const date = new Date(dateInput);

  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);

  // 1. Если прошло менее часа
  if (diffInMinutes < 60 && diffInMinutes >= 0) {
    if (diffInMinutes < 1) return "Только что";
    return `${diffInMinutes} мин. назад`;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  // Проверка дней (сбрасываем время для корректного сравнения дат)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));

  // 2. Если сегодня (но более часа назад)
  if (diffInDays === 0) {
    return timeStr;
  }

  // 3. Если вчера
  if (diffInDays === 1) {
    return `Вчера, ${timeStr}`;
  }

  // 4. Более двух суток (но в этом году)
  if (diffInDays >= 2 && date.getFullYear() === now.getFullYear()) {
    return (
      date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      }) + `, ${timeStr}`
    );
  }

  // 5. Если сменился год
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
