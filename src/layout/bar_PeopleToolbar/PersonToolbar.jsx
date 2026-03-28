import React from "react";
import { Stack, Tooltip, Box, Button } from "@mui/material";

// import PersonTabs from "./PersonTabs"; // Используем созданный ранее компонент
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import BioToolbar from "./bio/BioToolbar";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import FeedIcon from "@mui/icons-material/Feed";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PhotoToolbar from "./photo/PhotoToolbar";
import TreeToolbar from "./tree/TreeToolbar";
import InfoToolbar from "./info/InfoToolbar";
// import TreeToolbar

export default function ToolbarGroup({
  activeElement,
  setActiveElement,
  infoProps,
  photoProps,
  bioProps,
  treeProps,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Stack
      ml={2}
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", width: "100%" }}
    >
      {/* Вкладки: Анкета, Фото, Био, Древо */}
      <ToggleButtonGroup
        value={activeElement}
        exclusive
        onChange={(e, val) => val && setActiveElement(val)}
        size="small"
        sx={{
          border: "1px solid",
          borderRadius: 7,
          borderColor: "divider",
          height: "40px",
          // color: "white",
          gap: 1,
          "& .MuiToggleButton-root": {
            color: "white",
            border: "none",
            borderRadius: 6,
            // mx: 0.5,
            // gap: 1,
            "&.Mui-selected": {
              // bgcolor: "text.secondary",
              bgcolor: "divider",
              color: "#90caf9",
              // "&:hover": { bgcolor: "#555" },
            },
          },
        }}
      >
        <Tooltip title="Инфо">
          <ToggleButton value="info" color="white">
            <PermIdentityIcon />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Фотоальбом">
          <ToggleButton value="photo">
            <PhotoLibraryIcon />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Биография">
          <ToggleButton value="bio">
            <FeedIcon />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Древо">
          <ToggleButton value="tree">
            <AccountTreeIcon />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      {activeElement === "info" && (
        <InfoToolbar
          infoProps={infoProps} // ПЕРЕДАЕМ ВЕСЬ ОБЪЕКТ (тут лежат и методы, и реф)
          personRef={infoProps.personPageRef} // Передаем реф страницы для фактов/событий
        />
      )}
      {/* Если выбрана вкладка Фото, показываем дополнительные кнопки */}
      {activeElement === "photo" && (
        <PhotoToolbar
          search={photoProps.search}
          setSearch={photoProps.setSearch}
          groupBy={photoProps.groupBy}
          setGroupBy={photoProps.setGroupBy}
          sortDir={photoProps.sortDir}
          setSortDir={photoProps.setSortDir}
          onAddPhoto={photoProps.onAddPhoto}
        />
      )}
      {activeElement === "bio" && (
        <BioToolbar
          isEditing={bioProps.isEditing}
          requestToggleEdit={bioProps.requestToggleEdit}
          execRef={bioProps.execRef}
        />
      )}

      {activeElement === "tree" && <TreeToolbar treeProps={treeProps} />}
    </Stack>
  );
}
