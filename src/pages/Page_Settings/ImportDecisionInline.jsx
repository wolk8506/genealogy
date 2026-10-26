import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import AppButton from "../../components/AppButton";
import CustomSwitch from "../../components/CustomSwitch";
import {
  groupSx,
  RowIcon,
  sectionLabelSx,
  SettingsRow,
} from "./settingsUi";

export function ImportDecisionInline({
  summary = "",
  toAdd = [],
  toUpdate = [],
  onSelect = () => {},
}) {
  const theme = useTheme();
  const allIds = useMemo(
    () =>
      Array.from(
        new Map(
          [...toAdd, ...toUpdate].map((p) => [String(p.id), String(p.id)]),
        ).values(),
      ),
    [toAdd, toUpdate],
  );

  const [mode, setMode] = useState("default");
  const [selectedIds, setSelectedIds] = useState(() => allIds.slice());
  const [masterChecked, setMasterChecked] = useState(false);
  const [masterIndeterminate, setMasterIndeterminate] = useState(false);

  useEffect(() => {
    setSelectedIds(allIds.slice());
    setMode("default");
  }, [allIds]);

  useEffect(() => {
    if (allIds.length === 0) {
      setMasterChecked(false);
      setMasterIndeterminate(false);
      return;
    }
    if (selectedIds.length === 0) {
      setMasterChecked(false);
      setMasterIndeterminate(false);
    } else if (selectedIds.length === allIds.length) {
      setMasterChecked(true);
      setMasterIndeterminate(false);
    } else {
      setMasterChecked(false);
      setMasterIndeterminate(true);
    }
  }, [selectedIds, allIds]);

  const toggleId = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds.slice());

  const handleClose = () => onSelect({ action: "cancel", selected: [] });
  const handleAll = () => onSelect({ action: "all", selected: allIds.slice() });
  const handleNew = () =>
    onSelect({
      action: "new",
      selected: (toAdd || []).map((p) => String(p.id)),
    });
  const handleManual = () =>
    onSelect({ action: "selected", selected: selectedIds.slice() });

  const manualMode = mode === "manual";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
            py: 1.25,
            borderRadius: "12px",
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            bgcolor: alpha(theme.palette.info.main, 0.08),
          }}
        >
          <InfoOutlinedIcon
            color="info"
            sx={{ fontSize: 18, flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary" lineHeight={1.35}>
            {summary ||
              "В бэкапе найдены совпадения с текущей базой. Выберите, как поступить с данными."}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          {[
            {
              label: "Новые записи",
              value: toAdd.length,
              color: theme.palette.success.main,
            },
            {
              label: "Конфликты",
              value: toUpdate.length,
              color: theme.palette.warning.main,
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                ...groupSx,
                flex: 1,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: item.color,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box>
          <Typography sx={sectionLabelSx}>Способ импорта</Typography>
          <Box sx={groupSx}>
            <SettingsRow
              icon={
                <RowIcon bg="blue">
                  <ListAltOutlinedIcon sx={{ fontSize: 18 }} />
                </RowIcon>
              }
              title="Выбрать записи вручную"
              subtitle={
                manualMode
                  ? `Выбрано ${selectedIds.length} из ${allIds.length}`
                  : "Отметьте только нужные записи"
              }
              trailing={
                <CustomSwitch
                  checked={manualMode}
                  onChange={() =>
                    setMode((m) => (m === "manual" ? "default" : "manual"))
                  }
                />
              }
            />
          </Box>
        </Box>

        {manualMode && (
          <Box>
            <Typography sx={sectionLabelSx}>Записи</Typography>
            <Box sx={groupSx}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={masterChecked}
                      indeterminate={masterIndeterminate}
                      onChange={toggleAll}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>
                      Выбрать все ({allIds.length})
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Box>

              {allIds.length === 0 ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", textAlign: "center", py: 3 }}
                >
                  Нет доступных персон
                </Typography>
              ) : (
                <Box
                  sx={{
                    p: 1.5,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(76px, 1fr))",
                    gap: 1,
                  }}
                >
                  {allIds.map((id) => {
                    const isSelected = selectedIds.includes(id);
                    return (
                      <Box
                        key={id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleId(id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleId(id);
                          }
                        }}
                        sx={{
                          minWidth: 0,
                          cursor: "pointer",
                          px: 1,
                          py: 0.6,
                          borderRadius: "8px",
                          border: `1px solid ${
                            isSelected
                              ? theme.palette.primary.main
                              : theme.palette.divider
                          }`,
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.08)
                            : "transparent",
                          transition:
                            "background-color 120ms, border-color 120ms",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.75,
                          userSelect: "none",
                          "&:hover": {
                            bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.12)
                              : "action.hover",
                            borderColor: isSelected
                              ? theme.palette.primary.main
                              : alpha(theme.palette.text.primary, 0.24),
                          },
                          "&:focus-visible": {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: 1,
                          },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected
                              ? "primary.main"
                              : "text.primary",
                            fontSize: "0.75rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {id}
                        </Typography>
                        {isSelected && (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          mt: 2,
          mx: -2,
          px: 2,
          pt: 1.5,
          pb: 0.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default,
        }}
      >
        <AppButton preset="ghost" onClick={handleClose} sx={{ px: 2 }}>
          Отменить
        </AppButton>
        {manualMode ? (
          <AppButton
            preset="primary"
            onClick={handleManual}
            disabled={selectedIds.length === 0}
            sx={{ px: 2.5 }}
          >
            Импортировать выбранные ({selectedIds.length})
          </AppButton>
        ) : (
          <>
            <AppButton preset="secondary" onClick={handleNew} sx={{ px: 2 }}>
              Только новые
            </AppButton>
            <AppButton preset="primary" onClick={handleAll} sx={{ px: 2.5 }}>
              Заменить всё
            </AppButton>
          </>
        )}
      </Stack>
    </Box>
  );
}
