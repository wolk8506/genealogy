import React from "react";
import { Box, Typography } from "@mui/material";

export function ReleaseNotesList({ groups, sx }) {
  const hasTitles = groups.some((group) => group.title);

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: "14px",
        bgcolor: "action.hover",
        textAlign: "left",
        ...sx,
      }}
    >
      {groups.map((group, groupIndex) => (
        <Box
          key={`${groupIndex}-${group.title}`}
          sx={{ "&:not(:first-child)": { mt: 1.5 } }}
        >
          {hasTitles && group.title && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "text.secondary",
                display: "block",
                mb: 0.5,
                letterSpacing: "0.01em"
              }}>
              {group.title}
            </Typography>
          )}
          {group.items.map((item, itemIndex) => (
            <Box
              key={`${itemIndex}-${item}`}
              sx={{ display: "flex", gap: "10px", py: "3px" }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  mt: "8px",
                  width: 4,
                  height: 4,
                  borderRadius: "999px",
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(0,0,0,0.4)",
                }}
              />
              <Typography
                variant="body2"
                sx={{ lineHeight: 1.45, overflowWrap: "anywhere" }}
              >
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
