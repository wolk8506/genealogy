export default function FullscreenViewer({ photo, path, onClose }) {
  return (
    <Dialog open={!!photo} onClose={onClose} fullScreen>
      <DialogContent sx={{ p: 0, bgcolor: "#000" }}>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 8, left: 8, zIndex: 1000 }}
        >
          <CloseIcon sx={{ color: "#fff" }} />
        </IconButton>
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src={path}
            alt={photo?.title}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
