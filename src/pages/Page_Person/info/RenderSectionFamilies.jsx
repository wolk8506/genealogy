// import { Stack, Divider, Box } from "@mui/material";

// import { RenderSectionChildren } from "./RenderSectionChildren";
// import { RenderPersonItem } from "./RenderPersonItem";

// const renderFamiliesItem = (el) => {
//   const p = el.partner;
//   if (!p) return;
//   const children = el.children;
//   const title = p.gender === "male" ? "Супруг" : "Супругa";

//   return (
//     <Stack key={p.id}>
//       <Divider
//         orientation="vertical"
//         sx={{
//           height: "60px",
//           "& .MuiDivider-wrapper": {
//             padding: "0 8px",
//           },
//         }}
//       >
//         {title}
//       </Divider>
//       <RenderPersonItem p={p} />
//       {<RenderSectionChildren title={"Дети"} people={children} />}
//     </Stack>
//   );
// };

// export const RenderSectionFamilies = ({ title, people }) => {
//   if (!people || people.length === 0) return null;

//   return (
//     <>
//       <Box
//         sx={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fill, 290px)",
//           gap: 2,
//           borderRadius: 3,
//           marginTop: "0 !important",
//         }}
//       >
//         {people.map(renderFamiliesItem)}
//       </Box>
//     </>
//   );
// };
// ----------------
import React, { useState } from "react";
import {
  Stack,
  Divider,
  Box,
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { RenderSectionChildren } from "./RenderSectionChildren";
import { RenderPersonItem } from "./RenderPersonItem";

export const RenderSectionFamilies = ({ title, people }) => {
  // console.log(people);
  const [index, setIndex] = useState(0);

  if (!people || people.length === 0) return null;

  const handleNext = () => {
    if (index < people.length - 2) setIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (index > 0) setIndex((prev) => prev - 1);
  };

  // Выбираем только 2 элемента для показа
  const visiblePeople = people.slice(index, index + 2);
  const hasMoreThanTwo = people.length > 2;

  const renderFamiliesItem = (el) => {
    const p = el.partner;
    if (!p) return null;
    const children = el.children;
    const spouseTitle = p.gender === "male" ? "Супруг" : "Супруга";

    return (
      <Stack
        key={p.id}
        sx={{
          width: people.length === 1 ? "760px" : "360px", // Ширина подстраивается
          transition: "all 0.3s ease",
          alignItems: "center",
        }}
      >
        <Divider
          orientation="vertical"
          sx={{
            height: "60px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
              textTransform: "uppercase",
              color: "text.disabled",
            },
          }}
        >
          {spouseTitle}
        </Divider>
        <Box width={"360px"}>
          <RenderPersonItem p={p} />
        </Box>

        {children && children.length > 0 && (
          <RenderSectionChildren
            title={
              children.length > 1 ? `Дети (${children.length})` : "Ребенок"
            }
            people={children}
            row={people.length > 1 ? 1 : 2}
          />
        )}
      </Stack>
    );
  };

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ (только если > 2 супругов) */}
      {hasMoreThanTwo && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          width={1}
          sx={{
            mb: 1,
            pr: 1,
            position: "absolute",
            right: 0,
            top: "12px",
            px: 2,
          }}
        >
          <Box
            sx={{
              // position: "absolute",
              display: "flex",
              alignItems: "center",
              // top: 20,
              // left: 20,
              // zIndex: 15,
              bgcolor: "rgba(0,0,0,0.3)",
              color: "#fff",
              px: 2,
              // py: 0.5,
              height: 30,
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              {index + 1} — {Math.min(index + 2, people.length)} из{" "}
              {people.length}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              // border: "1px solid",
              borderColor: "divider",
              borderRadius: 7,
              height: 30,
              color: "text.secondary",
              bgcolor: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {" "}
            <IconButton
              size="small"
              onClick={handlePrev}
              disabled={index === 0}
              // sx={{ color: "white", p: "8px" }}
            >
              <ArrowBackIosNewIcon fontSize="inherit" />
            </IconButton>
            <Divider orientation="vertical" variant="middle" flexItem />
            <IconButton
              size="small"
              onClick={handleNext}
              disabled={index >= people.length - 2}
              // sx={{ color: "white", p: "8px" }}
            >
              <ArrowForwardIosIcon fontSize="inherit" />
            </IconButton>
          </Box>
        </Stack>
      )}

      {/* КОНТЕЙНЕР ЭЛЕМЕНТОВ */}
      <Box
        sx={{
          display: "flex",
          // Центрируем, если 1 элемент, иначе распределяем
          justifyContent: people.length === 1 ? "center" : "space-around",
          gap: 2,
          minHeight: "200px",
        }}
      >
        {visiblePeople.map(renderFamiliesItem)}
      </Box>
    </Box>
  );
};
