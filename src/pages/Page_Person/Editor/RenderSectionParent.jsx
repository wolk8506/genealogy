import { Divider, Box } from "@mui/material";
import { RenderPersonItem } from "../info/RenderPersonItem";
import { EmptyPersonSlot } from "./EmptyPersonSlot";

export const RenderSectionParent = ({
  title,
  people,
  father,
  mother,
  onUnlink,
  onLink,
  activeDragType,
  stopDrag,
  onDragEnd,
}) => {
  // if (!people || people.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "720px",
        ml: "auto !important",
        mr: "auto !important",
        mb: "-20px",
      }}
    >
      {/* СЛОТ ОТЦА */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "320px",
        }}
      >
        <Divider
          orientation="vertical"
          sx={{
            height: "30px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
            color: "text.disabled",
            textTransform: "uppercase",
          }}
        >
          Отец
        </Divider>

        {father ? (
          <RenderPersonItem
            unlinkPosition="bottom"
            p={father}
            onUnlink={() => onUnlink("father")}
          />
        ) : (
          // Слот ОТЦА
          <EmptyPersonSlot
            label="Отца"
            acceptType="father" // Ожидает только тип 'father'
            activeDragType={activeDragType}
            onDrop={(id) => onLink(id, "father")}
            onDragEnd={onDragEnd}
          />
        )}

        <Divider orientation="vertical" sx={{ height: "30px" }} />
      </Box>

      {/* СОЕДИНИТЕЛЬНАЯ ЛИНИЯ */}
      <Box width={1}>
        <Box height={30}></Box>
        <Divider />
        <Box height={30}></Box>
      </Box>

      {/* СЛОТ МАТЕРИ */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "320px",
        }}
      >
        <Divider
          orientation="vertical"
          sx={{
            height: "30px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
            color: "text.disabled",
            textTransform: "uppercase",
          }}
        >
          Мать
        </Divider>

        {mother ? (
          <RenderPersonItem
            unlinkPosition="bottom"
            p={mother}
            onUnlink={() => onUnlink("mother")}
          />
        ) : (
          // Слот МАТЕРИ
          <EmptyPersonSlot
            label="Мать"
            acceptType="mother" // Ожидает только тип 'mother'
            activeDragType={activeDragType}
            onDrop={(id) => onLink(id, "mother")}
            onDragEnd={onDragEnd}
          />
        )}

        <Divider orientation="vertical" sx={{ height: "30px" }} />
      </Box>
    </Box>
  );
};
