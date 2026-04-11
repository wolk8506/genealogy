import React, { useMemo, useState, useEffect } from "react";
import {
  Stack,
  Typography,
  Divider,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexGrow: 1,
      }}
    >
      {/* Скроллируемая область контента */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
            bgcolor: alpha(theme.palette.info.main, 0.1),
            p: 1.5,
            borderRadius: 2,
          }}
        >
          <InfoOutlinedIcon color="info" fontSize="small" />
          <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
            В архиве найдены совпадения с текущей базой. Выберите, как поступить
            с данными.
          </Typography>
        </Box>

        <Stack spacing={2}>
          {/* Сводка: Новые и Обновления */}
          <Stack direction="row" spacing={2}>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                textTransform="uppercase"
              >
                Новые записи
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">
                {toAdd.length}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                textTransform="uppercase"
              >
                Конфликты
              </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main">
                {toUpdate.length}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Переключатель ручного режима */}
          <Box>
            <Button
              size="small"
              onClick={() =>
                setMode((m) => (m === "manual" ? "default" : "manual"))
              }
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              {mode === "manual"
                ? "Скрыть ручной выбор"
                : "Выбрать записи вручную"}
            </Button>

            {mode === "manual" && (
              <Box
                sx={{
                  mt: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: "action.hover",
                    borderBottom: "1px solid",
                    borderColor: "divider",
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
                      <Typography variant="caption" fontWeight={600}>
                        Выбрать все ({allIds.length})
                      </Typography>
                    }
                  />
                </Box>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflowY: "auto",
                    mt: 1.5,
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                  }}
                >
                  {allIds.length === 0 ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", textAlign: "center", py: 2 }}
                    >
                      Нет доступных персон
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-evenly",
                        gap: 1, // Расстояние между элементами
                      }}
                    >
                      {allIds.map((id) => {
                        const isSelected = selectedIds.includes(id);
                        return (
                          <Box
                            key={id}
                            onClick={() => toggleId(id)}
                            sx={{
                              minWidth: 85,
                              cursor: "pointer",
                              px: 1.5,
                              py: 0.6,
                              borderRadius: "8px",
                              border: "1px solid",
                              // Динамическая смена цвета границы и фона
                              borderColor: isSelected
                                ? "primary.main"
                                : "divider",
                              bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.08)
                                : "transparent",
                              transition: "all 0.2s ease-in-out",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-around",
                              userSelect: "none",
                              "&:hover": {
                                bgcolor: isSelected
                                  ? alpha(theme.palette.primary.main, 0.12)
                                  : alpha(theme.palette.action.hover, 0.8),
                                borderColor: isSelected
                                  ? "primary.main"
                                  : alpha(theme.palette.text.primary, 0.2),
                                transform: "translateY(-1px)",
                              },
                              "&:active": {
                                transform: "translateY(0)",
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
                              }}
                            >
                              {id}
                            </Typography>

                            {/* Маленький индикатор-точка для выбранных (опционально) */}
                            {isSelected && (
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: "primary.main",
                                  ml: 1,
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
          </Box>
        </Stack>
      </Box>

      {/* Закрепленные кнопки действий внизу (macOS Style) */}
      <Stack
        flexDirection={"row"}
        justifyContent={"space-around"}
        gap={1}
        sx={{ mt: "auto", pt: 1 }}
      >
        {mode === "manual" ? (
          <Button
            variant="contained"
            // fullWidth
            disableElevation
            onClick={handleManual}
            disabled={selectedIds.length === 0}
            sx={{
              height: 24,
              borderRadius: "6px",
              py: 1,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Импортировать выбранные ({selectedIds.length})
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              // fullWidth
              disableElevation
              onClick={handleAll}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1,
                fontWeight: 600,
                textTransform: "none",
                bgcolor: "#007AFF",
                "&:hover": { bgcolor: "#0062CC" },
              }}
            >
              Заменить всё
            </Button>
            <Button
              variant="contained"
              // fullWidth
              disableElevation
              color="success"
              onClick={handleNew}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Только новые
            </Button>
          </>
        )}
        <Button
          variant="text"
          // fullWidth
          onClick={handleClose}
          sx={{
            height: 24,
            borderRadius: "6px",
            py: 1,
            fontWeight: 500,
            textTransform: "none",
            color: "text.primary",
            bgcolor: (theme) => alpha(theme.palette.action.active, 0.05),
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.action.active, 0.1),
            },
          }}
        >
          Отменить
        </Button>
      </Stack>
    </Box>
  );
}
