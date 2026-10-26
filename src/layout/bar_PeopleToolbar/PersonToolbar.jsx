import React from "react";
import { Stack, Tooltip, Box, Button } from "@mui/material";

// import PersonTabs from "./PersonTabs"; // Используем созданный ранее компонент
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import BioToolbar from "./bio/BioToolbar";
import PersonFillIcon from "../../components/svg/PersonFillIcon";
import TextDocumentFillIcon from "../../components/svg/TextDocumentFillIcon";
import PhotoOnRectangleAngledIcon from "../../components/svg/PhotoOnRectangleAngledIcon";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PhotoToolbar from "./photo/PhotoToolbar";
import TreeToolbar from "./tree/TreeToolbar";
import InfoToolbar from "./info/InfoToolbar";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import FileToolbar from "./file/FileToolbar";
import { toolbarPillSx } from "../toolbarStyles";
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
      sx={{ alignItems: "center", width: "100%", flex: 1, minWidth: 0 }}
    >
      {/* Вкладки: Анкета, Фото, Био, Древо, Файлы */}
      <Box
        sx={{
          ...toolbarPillSx,
          display: "inline-flex",
          flexShrink: 0,
          alignItems: "center",
          p: "3px",
        }}
      >
        <ToggleButtonGroup
          value={activeElement}
          exclusive
          onChange={(e, val) => val && setActiveElement(val)}
          size="small"
          sx={{
            gap: 0.5,
            bgcolor: "transparent",
            "& .MuiToggleButton-root": {
              color: "text.primary",
              border: "none",
              borderRadius: "14px",
              minWidth: 36,
              height: 30,
              p: 0,
              fontSize: 20,
              "&.Mui-selected": {
                bgcolor: "rgba(153, 153, 153, 0.24)",
                color: "primary.main",
              },
            },
          }}
        >
          <Tooltip title="Инфо">
            <ToggleButton value="info">
              <PersonFillIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
          </Tooltip>

          <Tooltip title="Фотоальбом">
            <ToggleButton value="photo">
              <PhotoOnRectangleAngledIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
          </Tooltip>

          <Tooltip title="Биография">
            <ToggleButton value="bio">
              <TextDocumentFillIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
          </Tooltip>

          <Tooltip title="Древо">
            <ToggleButton value="tree">
              <AccountTreeIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Файлы">
            <ToggleButton value="files">
              <FileCopyIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>
      {activeElement === "files" && <FileToolbar />}

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
          isDirty={bioProps.isDirty}
          requestToggleEdit={bioProps.requestToggleEdit}
          onSave={bioProps.onSave}
          onPrint={bioProps.onPrint}
          onExportPdf={bioProps.onExportPdf}
          execRef={bioProps.execRef}
          isNavVisible={bioProps.isNavVisible}
          onToggleNav={bioProps.onToggleNav}
          searchQuery={bioProps.searchQuery}
          onSearchQueryChange={bioProps.onSearchQueryChange}
          searchMatchIndex={bioProps.searchMatchIndex}
          onSearchMatchIndexChange={bioProps.onSearchMatchIndexChange}
          searchMatchCount={bioProps.searchMatchCount}
        />
      )}

      {activeElement === "tree" && <TreeToolbar treeProps={treeProps} />}
    </Stack>
  );
}
