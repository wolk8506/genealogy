import { Stack, Divider, Paper, Box } from "@mui/material";
import { RenderPersonItem } from "./RenderPersonItem";

export const RenderSectionChildren = ({ title, people, row = 1 }) => {
  // console.log("row: ", row);
  if (!people || people.length === 0) return null;

  return (
    <Stack
      sx={{
        // maxWidth: "736px",
        // width: "360px",
        mt: "0px !important",
      }}
    >
      <Divider
        orientation="vertical"
        sx={{
          height: "60px",
          "& .MuiDivider-wrapper": {
            padding: "0 8px",
          },
          textTransform: "uppercase",
          color: "text.disabled",
        }}
      >
        {title}
      </Divider>
      <Paper
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          // maxWidth: "736px",
          width: row === 1 ? "360px" : people.length !== 1 ? "736px" : "360",
          gap: 2,
          borderRadius: 5,
          p: 1,
        }}
      >
        {people.map((p) => (
          <Box key={p.id} width={"352px"}>
            <RenderPersonItem p={p} />
          </Box>
        ))}
      </Paper>
    </Stack>
  );
};
