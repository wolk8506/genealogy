import React from "react";
import {
  Typography,
  Box,
  Divider,
  Tooltip,
  IconButton,
  Popover,
  alpha,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import ButtonConteiner from "../../components/ButtonConteiner";

export const StatisticPopover = ({ people }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  // РАСЧЕТ СТАТИСТИКИ
  const stats = React.useMemo(() => {
    const active = people.filter((p) => !p.archived);
    const archived = people.filter((p) => p.archived);
    return {
      total: active.length,
      males: active.filter((p) => p.gender === "male").length,
      females: active.filter((p) => p.gender === "female").length,
      trash: archived.length,
    };
  }, [people]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;
  return (
    <>
      <ButtonConteiner>
        <Tooltip title="Статистика">
          <IconButton
            aria-describedby={id}
            variant="contained"
            onClick={handleClick}
            size="small"
            sx={{ color: "white", p: 1 }}
          >
            <QueryStatsIcon color={"inherit"} fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            pb: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (theme) => theme.shadows[10],
            // Используем фиксированный полупрозрачный цвет, чтобы треугольник совпал
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha("#1E1E1E", 0.9)
                : alpha("#FFFFFF", 0.9),
            backdropFilter: "blur(12px)",
            overflow: "visible", // Важно!
            mt: 1.5, // Отступ для хвостика
            backgroundImage: "none",

            // ТРЕУГОЛЬНИК (Хвостик)
            "&::before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: -7, // Смещаем чуть ниже, чтобы перекрыть основную рамку
              left: "calc(50% - 7px)",
              width: 14,
              height: 14,
              bgcolor: "inherit", // Берет тот же цвет и прозрачность
              borderLeft: "1px solid",
              borderTop: "1px solid",
              borderColor: "divider",
              transform: "rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1, // Поднимаем контент выше треугольника
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            width: "200px",
            // Небольшой хак: закрашиваем "вход" треугольника основным цветом
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: "10px",
              bgcolor: "inherit",
              zIndex: -1,
            },
          }}
        >
          <Typography fontWeight="600" my={2}>
            Статистика
          </Typography>

          <Box sx={{ width: "160px", display: "flex" }}>
            <PeopleIcon fontSize="small" color="primary" />
            <Typography variant="body2" fontWeight="400" ml={"4px"}>
              всего человек:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="600"
              align="left"
              ml={"auto"}
            >
              {stats.total}
            </Typography>
          </Box>

          <Divider orientation="vertical" variant="middle" flexItem />

          <Box sx={{ width: "160px", display: "flex" }}>
            <MaleIcon fontSize="small" color="info" />
            <Typography variant="body2" fontWeight="400" ml={"4px"}>
              мужчины:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="600"
              align="left"
              ml={"auto"}
            >
              {stats.males}
            </Typography>
          </Box>

          <Divider orientation="vertical" variant="middle" flexItem />

          <Box sx={{ width: "160px", display: "flex" }}>
            <FemaleIcon fontSize="small" color="secondary" />
            <Typography variant="body2" fontWeight="400" ml={"4px"}>
              женщины:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="600"
              align="left"
              ml={"auto"}
            >
              {stats.females}
            </Typography>
          </Box>

          <Divider orientation="vertical" variant="middle" flexItem />

          <Box sx={{ width: "160px", display: "flex" }}>
            <RestoreFromTrashIcon fontSize="small" color="warning" />
            <Typography variant="body2" fontWeight="400" ml={"4px"}>
              в корзине:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="600"
              align="left"
              ml={"auto"}
            >
              {stats.trash}
            </Typography>
          </Box>
        </Box>
      </Popover>
    </>
  );
};
