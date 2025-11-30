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
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru");

export default function CustomDatePickerDialog({
  open,
  onClose,
  initialDate,
  onSave,
  format = "DD.MM.YYYY", // или "YYYY-MM-DD"
  showTime = false,
}) {
  const [tab, setTab] = useState(0);
  const [fullDate, setFullDate] = useState(null);
  const [time, setTime] = useState(null);
  const [monthYear, setMonthYear] = useState(null);
  const [year, setYear] = useState(null);
  const [unknown, setUnknown] = useState(false);

  // при открытии диалога разбираем initialDate
  useEffect(() => {
    if (!initialDate) return;

    if (initialDate === "неизвестно") {
      setTab(3);
      setUnknown(true);
      return;
    }

    // если есть время, отделяем его
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
        // парсим время отдельно
        const parsedTime = dayjs(timePart, "HH:mm");
        setTime(parsedTime);
      }
    } else if (
      /^\d{4}-\d{2}$/.test(datePart) ||
      /^\d{2}\.\d{4}$/.test(datePart)
    ) {
      setTab(1);
      const parsed = dayjs(
        datePart,
        format === "YYYY-MM-DD" ? "YYYY-MM" : "MM.YYYY"
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "15px",
        },
      }}
    >
      <DialogTitle>Выбор даты</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Полная дата" />
          <Tab label="Месяц и год" />
          <Tab label="Только год" />
          <Tab label="Особые параметры" />
        </Tabs>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {tab === 0 && (
            <>
              <DatePicker
                label="Дата"
                value={fullDate}
                onChange={(newVal) => setFullDate(newVal)}
                format={format}
                slotProps={{
                  textField: { placeholder: "ДД.ММ.ГГГГ", fullWidth: true },
                }}
              />
              {showTime && (
                <TimePicker
                  label="Время"
                  value={time}
                  onChange={(newVal) => setTime(newVal)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              )}
            </>
          )}
          {tab === 1 && (
            <DatePicker
              views={["year", "month"]}
              label="Месяц и год"
              value={monthYear}
              onChange={(newVal) => setMonthYear(newVal)}
              format={format === "YYYY-MM-DD" ? "YYYY-MM" : "MM.YYYY"}
              slotProps={{
                textField: { placeholder: "ММ.ГГГГ", fullWidth: true },
              }}
            />
          )}
          {tab === 2 && (
            <DatePicker
              views={["year"]}
              label="Год"
              value={year}
              onChange={(newVal) => setYear(newVal)}
              format="YYYY"
              slotProps={{
                textField: { placeholder: "ГГГГ", fullWidth: true },
              }}
            />
          )}
          {tab === 3 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={unknown}
                  onChange={(e) => setUnknown(e.target.checked)}
                />
              }
              label="Дата неизвестна"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ pr: "24px", pl: "24px" }}>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить
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
