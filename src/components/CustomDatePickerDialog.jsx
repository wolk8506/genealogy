import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Button,
  Stack,
  FormControlLabel,
  Checkbox,
  Box,
  Fade,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryIcon from "@mui/icons-material/History";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru");

export default function CustomDatePickerDialog({
  open,
  onClose,
  initialDate,
  onSave,
  format = "DD.MM.YYYY",
  showTime = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // --- ТВОИ СОСТОЯНИЯ ---
  const [tab, setTab] = useState(0);
  const [fullDate, setFullDate] = useState(null);
  const [time, setTime] = useState(null);
  const [monthYear, setMonthYear] = useState(null);
  const [year, setYear] = useState(null);
  const [unknown, setUnknown] = useState(false);

  // --- ТВОЯ ЛОГИКА РАЗБОРА (useEffect) ---
  useEffect(() => {
    if (!initialDate) return;

    if (initialDate === "неизвестно") {
      setTab(3);
      setUnknown(true);
      return;
    }

    const [datePart, timePart] = initialDate.split(" ");

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(datePart) ||
      /^\d{2}\.\d{2}\.\d{4}$/.test(datePart)
    ) {
      setTab(0);
      const parsed = dayjs(datePart, format);
      setFullDate(parsed);
      setMonthYear(parsed.startOf("month"));
      setYear(parsed.startOf("year"));
      if (showTime && timePart) {
        setTime(dayjs(timePart, "HH:mm"));
      }
    } else if (
      /^\d{4}-\d{2}$/.test(datePart) ||
      /^\d{2}\.\d{4}$/.test(datePart)
    ) {
      setTab(1);
      const parsed = dayjs(
        datePart,
        format === "YYYY-MM-DD" ? "YYYY-MM" : "MM.YYYY",
      );
      setMonthYear(parsed);
      setYear(parsed.startOf("year"));
    } else if (/^\d{4}$/.test(datePart)) {
      setTab(2);
      const parsed = dayjs(datePart, "YYYY");
      setYear(parsed);
      setMonthYear(parsed.startOf("year"));
      setFullDate(parsed.startOf("year"));
    }
  }, [initialDate, format, showTime]);

  // --- ТВОЯ ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ТАБОВ ---
  const handleTabChange = (event, newTab) => {
    setTab(newTab);
    if (newTab !== 3) setUnknown(false);

    if (newTab === 0 && !fullDate) {
      if (monthYear) setFullDate(monthYear.startOf("month"));
      else if (year) setFullDate(year.startOf("year"));
    }
    if (newTab === 1 && !monthYear) {
      if (fullDate) setMonthYear(fullDate.startOf("month"));
      else if (year) setMonthYear(year.startOf("year"));
    }
    if (newTab === 2 && !year) {
      if (fullDate) setYear(fullDate.startOf("year"));
      else if (monthYear) setYear(monthYear.startOf("year"));
    }
  };

  // --- ТВОЯ ЛОГИКА СБОРКИ РЕЗУЛЬТАТА ---
  const handleSave = () => {
    let result = "";
    if (tab === 3 && unknown) {
      result = "неизвестно";
    } else if (tab === 0 && fullDate) {
      result = fullDate.format(format);
      if (showTime && time) {
        result += ` ${time.format("HH:mm")}`;
      }
    } else if (tab === 1 && monthYear) {
      result =
        format === "YYYY-MM-DD"
          ? monthYear.format("YYYY-MM")
          : monthYear.format("MM.YYYY");
    } else if (tab === 2 && year) {
      result = year.format("YYYY");
    }
    onSave?.(result);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.9) : "#fff",
          backdropFilter: "blur(15px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 600,
          pb: 1,
        }}
      >
        <CalendarMonthIcon color="primary" />
        Указать дату
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 3,
            minHeight: "40px",
            "& .MuiTab-root": {
              fontSize: "0.75rem",
              minHeight: "40px",
              textTransform: "none",
              fontWeight: 500,
              borderRadius: "8px",
              "&.Mui-selected": { color: theme.palette.primary.main },
            },
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          <Tab
            icon={<EventAvailableIcon sx={{ fontSize: 18 }} />}
            label="Полная"
          />
          <Tab
            icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
            label="Месяц"
          />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} label="Год" />
          <Tab
            icon={<HelpOutlineIcon sx={{ fontSize: 18 }} />}
            label="Прочее"
          />
        </Tabs>

        <Box
          sx={{
            p: 2,
            borderRadius: "16px",
            bgcolor: alpha(theme.palette.action.hover, 0.03),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={2}>
            {tab === 0 && (
              <Fade in={tab === 0}>
                <Stack spacing={2}>
                  <DatePicker
                    label="Число, месяц, год"
                    value={fullDate}
                    onChange={(newVal) => setFullDate(newVal)}
                    format={format}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            bgcolor: "background.paper",
                          },
                        },
                      },
                    }}
                  />
                  {showTime && (
                    <TimePicker
                      label="Точное время"
                      value={time}
                      onChange={(newVal) => setTime(newVal)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              bgcolor: "background.paper",
                            },
                          },
                        },
                      }}
                    />
                  )}
                </Stack>
              </Fade>
            )}

            {tab === 1 && (
              <Fade in={tab === 1}>
                <Box>
                  <DatePicker
                    views={["year", "month"]}
                    label="Месяц и год"
                    value={monthYear}
                    onChange={(newVal) => setMonthYear(newVal)}
                    format={format === "YYYY-MM-DD" ? "YYYY-MM" : "MM.YYYY"}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            bgcolor: "background.paper",
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Fade>
            )}

            {tab === 2 && (
              <Fade in={tab === 2}>
                <Box>
                  <DatePicker
                    views={["year"]}
                    label="Укажите год"
                    value={year}
                    onChange={(newVal) => setYear(newVal)}
                    format="YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            bgcolor: "background.paper",
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Fade>
            )}

            {tab === 3 && (
              <Fade in={tab === 3}>
                <FormControlLabel
                  sx={{
                    ml: 0,
                    p: 1.5,
                    width: "100%",
                    borderRadius: "10px",
                    bgcolor: unknown
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                    border: `1px solid ${unknown ? theme.palette.primary.main : "transparent"}`,
                    transition: "0.3s",
                  }}
                  control={
                    <Checkbox
                      checked={unknown}
                      onChange={(e) => setUnknown(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      Дата полностью неизвестна
                    </Typography>
                  }
                />
              </Fade>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: "10px" }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disableElevation
          sx={{
            borderRadius: "10px",
            px: 4,
            fontWeight: 600,
            boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
          }}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/*
ПРИМЕР ИСПОЛЬЗОВАНИЯ

import CustomDatePickerDialog from "./CustomDatePickerDialog";

const [date, setDate] = useState("");
const [datePickerOpen, setDatePickerOpen] = useState(false);

<TextField
  label="Дата"
  value={date}
  onClick={() => setDatePickerOpen(true)}
  size="small"
  fullWidth
  placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ"
  InputProps={{ readOnly: true }}
/>

<CustomDatePickerDialog
  open={datePickerOpen}
  onClose={() => setDatePickerOpen(false)}
  initialDate={date}
  format="DD.MM.YYYY"   // или "YYYY-MM-DD"
  showTime={true}       // включить выбор времени
  onSave={(newDate) => {
    setDate(newDate);
    setDatePickerOpen(false);
  }}
/>

*/
