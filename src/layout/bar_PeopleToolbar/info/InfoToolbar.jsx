import React from "react";
import {
  Stack,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Box,
  Collapse,
} from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import ButtonConteiner from "../../../components/ButtonConteiner";
import StarIcon from "@mui/icons-material/Star";
import InfoIcon from "@mui/icons-material/Info";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import EditOffIcon from "@mui/icons-material/EditOff";

const InfoToolbar = ({ personRef, infoProps }) => {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          position: "relative", // Важно для абсолютных детей
          // minHeight: "48px", // Фиксируем высоту
          fontSize: 20,
        }}
      >
        {/* Группа СЛЕВА: Отмена и Сохранение */}
        {/* zIndex: -1, чтобы они выезжали как бы ИЗ-ПОД центральной кнопки */}
        <Collapse
          in={infoProps.isEditing}
          orientation="horizontal"
          sx={{
            position: "absolute",
            right: "calc(50% + 24px)", // Отступаем от центра влево (размер кнопки + отступ)
            // zIndex: -1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <ButtonConteiner>
              <Tooltip title="Отменить изменения">
                <IconButton
                  onClick={infoProps.onCancel}
                  size="small"
                  sx={{ color: "white", p: "8px" }}
                >
                  <CancelIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Сохранить изменения">
                <IconButton
                  onClick={infoProps.onSave}
                  size="small"
                  sx={{ color: "white", p: "8px" }}
                >
                  <SaveIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </ButtonConteiner>
          </Stack>
        </Collapse>

        {/* ЦЕНТР: Всегда на месте */}
        <ButtonConteiner
          sx={{
            position: "relative",
            zIndex: 1, // Центр всегда поверх выезжающих кнопок
            bgcolor: "primary.main", // Если у тебя ToolbarGroup, можно добавить фон, чтобы скрыть выезд
            borderRadius: "50%", // Чтобы фон был круглым под кнопку
          }}
        >
          <Tooltip title="Редактировать профиль">
            <IconButton
              onClick={() => infoProps.requestToggleEdit()}
              size="small"
              sx={{
                color: "white",
                p: 1,
                // Добавим поворот при редактировании для красоты
                // transform: infoProps.isEditing ? "rotate(90deg)" : "none",
                // transition: "transform 0.3s",
              }}
            >
              {infoProps.isEditing ? (
                <EditOffIcon fontSize="inherit" />
              ) : (
                <CreateIcon fontSize="inherit" />
              )}
            </IconButton>
          </Tooltip>
        </ButtonConteiner>

        {/* Группа СПРАВА: Событие и Факт */}
        <Collapse
          in={!infoProps.isEditing}
          orientation="horizontal"
          sx={{
            position: "absolute",
            left: "calc(50% + 24px)", // Отступаем от центра вправо
            // zIndex: -1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <ButtonConteiner>
              <Tooltip title="Добавить событие">
                <IconButton
                  onClick={() => personRef.current?.handleAddEvent()}
                  size="small"
                  sx={{ color: "white", p: 1 }}
                >
                  <StarIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Добавить факт">
                <IconButton
                  onClick={() => personRef.current?.handleAddFact()}
                  size="small"
                  sx={{ color: "white", p: 1 }}
                >
                  <InfoIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </ButtonConteiner>
          </Stack>
        </Collapse>
      </Box>
    </>
  );
};

export default InfoToolbar;
