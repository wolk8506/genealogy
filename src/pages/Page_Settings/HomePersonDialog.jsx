import React, { useState } from "react";
import { Box } from "@mui/material";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import NoticeDialog from "../../components/Dialog/NoticeDialog";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useUpdateStore } from "../../store/useUpdateStore";

// Пока домашний человек («Это я») не выбран, напоминаем о нём при каждом
// запуске — окном из того же стекла, что и сообщение об обновлении.
export function HomePersonDialog({ onOpenSettings, hasPeople = true }) {
  const settingsLoaded = useSettingsStore((state) => state.settingsLoaded);
  const homePersonId = useSettingsStore(
    (state) => state.appSettings.homePersonId,
  );
  // Сообщение о новой версии важнее: два модальных окна подряд — лишние
  // шаги, поэтому напоминание уступает, пока открыто окно обновления.
  const updateNotice = useUpdateStore((state) => state.notice);
  const [dismissed, setDismissed] = useState(false);

  const open =
    settingsLoaded &&
    hasPeople &&
    !homePersonId &&
    !dismissed &&
    !updateNotice;

  const later = () => setDismissed(true);

  const choose = () => {
    setDismissed(true);
    onOpenSettings();
  };

  return (
    <NoticeDialog
      open={open}
      onClose={later}
      icon={
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "999px",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            bgcolor: (t) => t.palette.accents.indigo,
          }}
        >
          <PersonPinCircleIcon sx={{ fontSize: 32 }} />
        </Box>
      }
      title="Не указано, кто вы в этой библиотеке"
      message="Выберите свою карточку, чтобы дерево открывалось от вас."
      primaryLabel="Выбрать"
      onPrimary={choose}
      secondaryLabel="Позже"
      onSecondary={later}
    />
  );
}
