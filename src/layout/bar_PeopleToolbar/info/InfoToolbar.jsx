import React from "react";
import { Stack, IconButton, Tooltip, Box, Collapse } from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";

import ButtonConteiner from "../../../components/ButtonConteiner";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../../toolbarTokens";

const CENTER_BTN_HALF = TOOLBAR_CAPSULE.height / 2;
const SIDE_CLUSTER_OFFSET = CENTER_BTN_HALF + 12;
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
          position: "relative",
        }}
      >
        {/* Группа СЛЕВА: Отмена и Сохранение */}
        {/* zIndex: -1, чтобы они выезжали как бы ИЗ-ПОД центральной кнопки */}
        <Collapse
          in={infoProps.isEditing}
          orientation="horizontal"
          sx={{
            position: "absolute",
            right: `calc(50% + ${SIDE_CLUSTER_OFFSET}px)`,
            // zIndex: -1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <ButtonConteiner>
              <Tooltip title="Отменить изменения">
                <IconButton
                  onClick={infoProps.onCancel}
                  size="small"
                  sx={{ color: "inherit", p: 0 }}
                >
                  <CancelIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Сохранить изменения">
                <IconButton
                  onClick={infoProps.onSave}
                  size="small"
                  sx={{ color: "inherit", p: 0 }}
                >
                  <SaveIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
                </IconButton>
              </Tooltip>
            </ButtonConteiner>
          </Stack>
        </Collapse>

        <ButtonConteiner sx={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
          <Tooltip
            title={
              infoProps.isEditing
                ? "Закрыть редактирование"
                : "Редактировать профиль"
            }
          >
            <IconButton
              onClick={() => infoProps.requestToggleEdit()}
              size="small"
              aria-pressed={infoProps.isEditing}
              sx={{ color: "inherit", p: 0 }}
            >
              {infoProps.isEditing ? (
                <EditOffIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
              ) : (
                <CreateIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
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
            left: `calc(50% + ${SIDE_CLUSTER_OFFSET}px)`,
            // zIndex: -1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <ButtonConteiner>
              <Tooltip title="Добавить событие">
                <IconButton
                  onClick={() => personRef.current?.handleAddEvent()}
                  size="small"
                  sx={{ color: "inherit", p: 0 }}
                >
                  <StarIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Добавить факт">
                <IconButton
                  onClick={() => personRef.current?.handleAddFact()}
                  size="small"
                  sx={{ color: "inherit", p: 0 }}
                >
                  <InfoIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
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
