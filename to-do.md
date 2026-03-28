npm install electron@latest --save-dev

npm outdated // проверка версий пакетов (просмотр)

// Переустановка зависимостей
rm -rf node_modules package-lock.json
npm install

---

```
import { useNotificationStore } from "../../store/useNotificationStore";

const addNotification = useNotificationStore(
(state) => state.addNotification,
);

addNotification({
    timestamp: new Date().toISOString(),
    title: "Человек перемещен в корзину",
    message: `Из основной ветки удален: ${name} `,
    type: "warning",
    // Если у вас есть роутинг, можно передать линк на карточку:
    link: `/archive`,
});
// 🔔 Notification
 addNotification({
        timestamp: new Date().toISOString(),
        title: "Человек добавлен",
        message: `В дерево успешно добавлен: ${firstName.trim()} ${lastName.trim()}`,
        type: "success",
        // Если у вас есть роутинг, можно передать линк на карточку:
        link: `/person/${newId}`,
      });


___________
const p = people.filter((el) => el.id === id)[0];
  const name =
      [
        `${person.id} ::`,
        person.firstName,
        person.patronymic,
        person.lastName || person.maidenName,
      ]
        .filter(Boolean)
        .join(" ") || `ID ${person.id}`;
    const connections = [
      person.children, //[],
      person.father, // 80001,
      person.mother, // null,
      person.siblings, // [],
      person.spouse, //[],
    ]
      .flat()
      .filter(Boolean)
      .join(", ");
```
