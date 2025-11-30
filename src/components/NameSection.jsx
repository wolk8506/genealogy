import { Divider, Typography } from "@mui/material";

export default function NameSection({ title, icon: Icon }) {
  return (
    <Divider
      textAlign="left"
      sx={{
        mb: 2,
        "&::before": {
          width: "1%", // левая линия занимает 1% ширины
        },
        "& .MuiDivider-wrapper": {
          display: "flex",
          alignItems: "center",
          gap: 1,
        },
      }}
    >
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Icon color="inherit" />
        {title}
      </Typography>
    </Divider>
  );
}
