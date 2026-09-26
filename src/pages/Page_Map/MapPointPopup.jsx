import React from "react";
import { Box, Stack, Typography, Button } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import EventIcon from "@mui/icons-material/Event";
import { KIND_COLOR } from "./mapHelpers";
import { eventTypeIconElement } from "./mapHelpers";

function PhotoThumb({ owner, filename, title, compact = false }) {
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    window.photoAPI
      ?.getPath(owner, filename, "thumbs")
      .then((p) => {
        if (mounted && p) setSrc(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [owner, filename]);

  const size = compact ? 48 : 180;
  if (compact) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 1,
          overflow: "hidden",
          flexShrink: 0,
          bgcolor: "action.hover",
        }}
      >
        {src && (
          <Box
            component="img"
            src={src}
            alt={title || ""}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </Box>
    );
  }
  return (
    <Box sx={{ width: size }}>
      {src && (
        <Box
          component="img"
          src={src}
          alt={title || ""}
          sx={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 1,
            display: "block",
          }}
        />
      )}
      <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
        {title}
      </Typography>
    </Box>
  );
}

const rowSx = {
  display: "flex",
  gap: 1,
  alignItems: "center",
  cursor: "pointer",
  borderRadius: 1,
  p: 0.5,
  mx: -0.5,
  "&:hover": { bgcolor: "action.hover" },
};

export default function MapPointPopup({
  items,
  onItemClick,
  onEditLocation,
  editable = true,
}) {
  const multi = items.length > 1;
  const single = items[0];

  const renderIcon = (p) => {
    if (p.kind === "photo") {
      return (
        <PhotoThumb
          compact
          owner={p.owner}
          filename={p.filename}
          title={p.label}
        />
      );
    }
    if (p.kind === "external") {
      return (
        <EventIcon fontSize="small" sx={{ color: KIND_COLOR.external }} />
      );
    }
    return (
      <Box sx={{ color: KIND_COLOR.event, display: "flex" }}>
        {eventTypeIconElement(p.eventType)}
      </Box>
    );
  };

  if (multi) {
    return (
      <Box sx={{ minWidth: 200, maxWidth: 280, maxHeight: 300, overflowY: "auto" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Здесь: {items.length}
        </Typography>
        <Stack spacing={1}>
          {items.map((p, j) => (
            <Box
              key={`${p.key || j}`}
              onClick={() => onItemClick?.(p)}
              sx={rowSx}
            >
              {renderIcon(p)}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                  {p.label}
                </Typography>
                {(p.sub || p.place) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {[p.sub, p.place].filter(Boolean).join(" · ")}
                  </Typography>
                )}
              </Box>
              <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 150 }}>
      <Box onClick={() => onItemClick?.(single)} sx={{ ...rowSx, cursor: "pointer" }}>
        {single.kind === "photo" ? (
          <PhotoThumb owner={single.owner} filename={single.filename} title={single.label} />
        ) : (
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {single.label}
            </Typography>
            {single.sub && (
              <Typography variant="caption" color="text.secondary" display="block">
                {single.sub}
              </Typography>
            )}
            {single.place && (
              <Typography variant="caption" display="block">
                📍 {single.place}
              </Typography>
            )}
          </Box>
        )}
        <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </Box>
      {editable && single.kind !== "external" && onEditLocation && (
        <Button
          size="small"
          startIcon={<EditLocationAltIcon />}
          onClick={() => onEditLocation(single)}
          sx={{ mt: 1, textTransform: "none" }}
        >
          Исправить место
        </Button>
      )}
    </Box>
  );
}
