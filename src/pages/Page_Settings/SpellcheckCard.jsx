import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import CustomSwitch from "../../components/CustomSwitch";
import { RowIcon, SettingsRow, groupSx, sectionLabelSx } from "./settingsUi";

const formatMb = (value) => `${String(value).replace(".", ",")} МБ`;

const ipcErrorMessage = (error) =>
  String(error?.message || error || "")
    .replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, "")
    .trim();

// «Орфография»: свой словарь для редактора биографии. Русский словарь
// входит в приложение, остальные скачиваются по требованию.
export function SpellcheckCard({ cardStyle }) {
  const [state, setState] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [busyCode, setBusyCode] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await window.spellcheckAPI?.getState?.();
      if (next) setState(next);
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = window.spellcheckAPI?.onChange?.(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const languages = state?.languages || [];
  const activeLanguage =
    languages.find((language) => language.code === state?.active) || null;
  const systemLanguage =
    languages.find((language) => language.code === state?.detected) || null;

  const autoMissing =
    state?.choice === "auto" && systemLanguage && !systemLanguage.installed;
  const selectedMissing =
    state && state.choice !== "auto" && state.active && !state.installed;
  const missingLanguage = autoMissing
    ? systemLanguage
    : selectedMissing
      ? activeLanguage
      : null;

  const subtitle = (() => {
    if (!state) return "Загрузка…";
    if (state.choice === "auto") {
      if (!state.systemTitle) {
        return "Автоматически · русский (системный язык не определён)";
      }
      if (autoMissing) {
        return `Автоматически · ${state.systemTitle} не скачан, используется русский`;
      }
      return `Автоматически · ${state.activeTitle} (язык системы)`;
    }
    if (!activeLanguage) return "Не выбран";
    return state.installed
      ? `${activeLanguage.title} · словарь установлен`
      : `${activeLanguage.title} · словарь не скачан`;
  })();

  const applyState = (next) => {
    if (next) setState(next);
  };

  const setLanguage = async (code) => {
    setAnchorEl(null);
    setError("");
    try {
      applyState(await window.spellcheckAPI?.setLanguage?.(code));
    } catch (cause) {
      setError(ipcErrorMessage(cause));
    }
  };

  const download = async (code) => {
    setBusyCode(code);
    setError("");
    try {
      applyState(await window.spellcheckAPI?.download?.(code));
    } catch (cause) {
      setError(ipcErrorMessage(cause) || "Не удалось скачать словарь");
    } finally {
      setBusyCode(null);
    }
  };

  const chooseLanguage = async (language) => {
    setAnchorEl(null);
    setError("");
    try {
      applyState(await window.spellcheckAPI?.setLanguage?.(language.code));
      if (!language.installed) await download(language.code);
    } catch (cause) {
      setError(ipcErrorMessage(cause));
    }
  };

  const toggle = async (enabled) => {
    setError("");
    try {
      applyState(await window.spellcheckAPI?.setEnabled?.(enabled));
    } catch (cause) {
      setError(ipcErrorMessage(cause));
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        borderRadius: "16px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <Box sx={{ mt: "9px", flexShrink: 0 }}>
          <RowIcon bg="teal">
            <SpellcheckIcon sx={{ fontSize: 18 }} />
          </RowIcon>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Орфография
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 0.25, lineHeight: 1.45, whiteSpace: "normal" }}
          >
            Проверка в редакторе биографии. Работает на собственном словаре
            приложения и не зависит от системного правописания macOS или
            Windows.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Typography sx={sectionLabelSx}>Проверка</Typography>
        <Box sx={groupSx}>
          <SettingsRow
            title="Проверять орфографию"
            subtitle="Подчёркивать незнакомые слова в редакторе биографии"
            trailing={
              <CustomSwitch
                checked={Boolean(state?.enabled)}
                disabled={!state || Boolean(busyCode)}
                onChange={(event) => toggle(event.target.checked)}
              />
            }
          />
          <Divider />
          <SettingsRow
            title="Язык словаря"
            subtitle={subtitle}
            multiline
            disabled={!state || Boolean(busyCode)}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            trailing={
              <UnfoldMoreIcon
                sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }}
              />
            }
          />
          {missingLanguage && (
            <>
              <Divider />
              <SettingsRow
                title={
                  busyCode === missingLanguage.code
                    ? `Скачивание «${missingLanguage.title}»…`
                    : `Скачать словарь «${missingLanguage.title}»`
                }
                subtitle={`${formatMb(missingLanguage.sizeMb)} · понадобится интернет`}
                multiline
                disabled={Boolean(busyCode)}
                onClick={() => download(missingLanguage.code)}
                trailing={
                  busyCode === missingLanguage.code ? (
                    <CircularProgress size={16} />
                  ) : undefined
                }
              />
            </>
          )}
        </Box>
        {error ? (
          <Typography
            variant="caption"
            color="error"
            display="block"
            sx={{ mt: 1, ml: 0.5, lineHeight: 1.45, whiteSpace: "normal" }}
          >
            {error}
          </Typography>
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 1, ml: 0.5, lineHeight: 1.45, whiteSpace: "normal" }}
          >
            Русский словарь входит в приложение. Остальные скачиваются один раз
            и хранятся в папке данных.
          </Typography>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{ dense: true }}
      >
        <MenuItem
          selected={state?.choice === "auto"}
          onClick={() => setLanguage("auto")}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Автоматически
            </Typography>
            <Typography
              sx={{ fontSize: "0.7rem", color: "text.secondary" }}
            >
              {systemLanguage
                ? `Как в системе · ${systemLanguage.title}`
                : "Системный язык не определён · русский"}
            </Typography>
          </Box>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            selected={
              state?.choice === language.code ||
              (state?.choice === "auto" && state.active === language.code)
            }
            onClick={() => chooseLanguage(language)}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {language.title}
              </Typography>
              <Typography
                sx={{ fontSize: "0.7rem", color: "text.secondary" }}
              >
                {language.installed
                  ? language.bundled
                    ? "входит в приложение"
                    : "словарь установлен"
                  : `скачать · ${formatMb(language.sizeMb)}`}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}
