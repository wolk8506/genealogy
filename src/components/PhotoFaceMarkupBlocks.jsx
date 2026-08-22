import React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FaceIcon from "@mui/icons-material/Face";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import CheckIcon from "@mui/icons-material/Check";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoFaceOverlay from "./PhotoFaceOverlay";
import { distanceToConfidence } from "../services/faceRecognition";
import {
  confirmFaceAssignment,
  confirmExternalFaceAssignment,
  getPersonLabel,
} from "../utils/photoFaces";
import {
  buildFaceTagOptions,
  faceTagOptionFromFace,
  applyFaceTagOption,
  getExternalEntityLabel,
} from "../utils/externalEntities";

export function PhotoFacePreviewBlock({
  preview,
  previewFrameRef,
  faces,
  imageSize,
  allPeople,
  allExternal = [],
  selectedFaceId,
  onSelectFace,
  onFacesChange,
  drawMode,
  setDrawMode,
  detecting,
  onDetect,
  onPreviewLoad,
}) {
  if (!preview) return null;

  return (
    <Box sx={{ position: "relative", width: "100%", zIndex: 1, textAlign: "center" }}>
      <Box
        ref={previewFrameRef}
        sx={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          lineHeight: 0,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
      >
        <Box
          component="img"
          src={preview}
          alt="Превью"
          onLoad={onPreviewLoad}
          sx={{
            maxWidth: "100%",
            maxHeight: 480,
            objectFit: "contain",
            display: "block",
          }}
        />
        {imageSize?.width > 0 && (
          <PhotoFaceOverlay
            faces={faces}
            imageSize={imageSize}
            imageFrameRef={previewFrameRef}
            allPeople={allPeople}
            allExternal={allExternal}
            editable
            selectedFaceId={selectedFaceId}
            onSelectFace={onSelectFace}
            onFacesChange={onFacesChange}
            drawMode={drawMode}
          />
        )}
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 1,
          color: "text.secondary",
          textAlign: "center",
          px: 1,
        }}
      >
        ПКМ + перетаскивание — новая рамка · Backspace — удалить выделенную
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 3,
        }}
      >
        <Button
          size="small"
          variant={drawMode ? "contained" : "outlined"}
          startIcon={<AddIcon />}
          onClick={() => {
            setDrawMode((v) => !v);
            if (!drawMode) onSelectFace(null);
          }}
          sx={{
            bgcolor: drawMode ? "primary.main" : "rgba(0,0,0,0.55)",
            color: "#fff",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          {drawMode ? "Рамка…" : "Рамка"}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={
            detecting ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <FaceRetouchingNaturalIcon />
            )
          }
          disabled={detecting}
          onClick={onDetect}
          sx={{
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          Найти
        </Button>
      </Stack>
    </Box>
  );
}

export function PhotoFaceFormSection({
  theme,
  faces,
  allPeople,
  allExternal = [],
  selectedFaceId,
  onSelectFace,
  onFacesChange,
  onAddFace,
  onDeleteSelectedFace,
}) {
  const selectedFace = faces.find((f) => f.id === selectedFaceId);
  const faceTagOptions = buildFaceTagOptions(allPeople, allExternal);

  const handleAcceptSuggestion = (face) => {
    if (!face?.suggestedPersonId && !face?.suggestedExternalEntityId) return;

    const next = faces.map((f) =>
      f.id !== face.id
        ? f
        : face.suggestedExternalEntityId
          ? confirmExternalFaceAssignment(f, face.suggestedExternalEntityId)
          : confirmFaceAssignment(f, face.suggestedPersonId),
    );
    onFacesChange(next);
    onSelectFace(face.id);
  };

  return (
    <Box
      // sx={{
        // p: 2,
        // borderRadius: 2,
        // border: "1px solid",
        // borderColor: "divider",
        // bgcolor: alpha(theme.palette.action.hover, 0.04),
      // }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FaceIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>
              Лица на фото
            </Typography>
          </Stack>
          <Button size="small" onClick={onAddFace}>
            + Лицо
          </Button>
        </Stack>

        {faces.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Нет размеченных лиц. Нажмите «Найти» или нарисуйте рамку на
            превью.
          </Typography>
        ) : (
          faces.map((face, index) => {
            const isSelected = selectedFaceId === face.id;
            const suggestedPerson =
              face.suggestedPersonId != null
                ? allPeople.find((p) => p.id === face.suggestedPersonId)
                : null;
            const suggestedExternal =
              face.suggestedExternalEntityId != null
                ? allExternal.find(
                    (e) => e.id === face.suggestedExternalEntityId,
                  )
                : null;
            const hasSuggestion = Boolean(suggestedPerson || suggestedExternal);

            return (
              <Stack key={face.id} spacing={0.8}>
                <Stack
                  flexDirection="column"
                  spacing={1.25}
                  alignItems="center"
                  onClick={() => onSelectFace(face.id)}
                  sx={{
                    p: 0.5,
                    borderRadius: "14px",
                    transition: "all 0.2s ease",
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    width={1}
                    alignItems="center"
                  >
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={faceTagOptions}
                      groupBy={(opt) =>
                        opt.kind === "person" ? "Родственники" : "Справочник"
                      }
                      getOptionLabel={(opt) => opt.label}
                      isOptionEqualToValue={(a, b) =>
                        a?.kind === b?.kind && a?.id === b?.id
                      }
                      value={faceTagOptionFromFace(face, allPeople, allExternal)}
                      onChange={(_, option) => {
                        const next = faces.map((f) =>
                          f.id === face.id ? applyFaceTagOption(f, option) : f,
                        );
                        onFacesChange(next);
                        onSelectFace(face.id);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`Лицо ${index + 1}`}
                          onFocus={() => onSelectFace(face.id)}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "12px",
                              transition: "all 0.2s ease",
                              borderColor: isSelected
                                ? theme.palette.primary.main
                                : undefined,
                              "& fieldset": {
                                borderColor: isSelected
                                  ? `${theme.palette.primary.main} !important`
                                  : undefined,
                                borderWidth: isSelected
                                  ? "2px !important"
                                  : "1px",
                              },
                            },
                          }}
                        />
                      )}
                    />

                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFace(face.id);
                        onDeleteSelectedFace?.();
                      }}
                      sx={{
                        borderRadius: "8px",
                        bgcolor: alpha(theme.palette.error.main, 0.12),
                        p: 1,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {hasSuggestion && !face.personId && !face.externalEntityId && (
                    <Stack
                      direction="row"
                      spacing={1}
                      width={1}
                      alignItems="center"
                    >
                      <TextField
                        size="small"
                        fullWidth
                        disabled
                        label={`Предложено${
                          face.suggestDistance != null
                            ? ` (${distanceToConfidence(face.suggestDistance)}%)`
                            : ""
                        }`}
                        value={
                          suggestedPerson
                            ? getPersonLabel(suggestedPerson)
                            : getExternalEntityLabel(suggestedExternal)
                        }
                        sx={{
                          pointerEvents: "none",
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            "& fieldset": {
                              borderStyle: "dashed",
                              borderColor: alpha(theme.palette.primary.main, 0.4),
                            },
                          },
                          "& .MuiInputBase-input.Mui-disabled": {
                            WebkitTextFillColor: theme.palette.primary.main,
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          },
                          "& .MuiInputLabel-root.Mui-disabled": {
                            color: theme.palette.primary.main,
                            fontWeight: 500,
                          },
                        }}
                      />

                      <Tooltip title="Подтвердить предложение">
                        <IconButton
                          color="success"
                          size="small"
                          onClick={() => handleAcceptSuggestion(face)}
                          sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.12),
                            color: theme.palette.success.main,
                            borderRadius: "8px",
                            p: 0.8,
                            "&:hover": {
                              bgcolor: alpha(theme.palette.success.main, 0.25),
                            },
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            );
          })
        )}

        {selectedFace && (
          <Typography variant="caption" color="text.secondary">
            Выбрано лицо {faces.indexOf(selectedFace) + 1}. Рамку можно
            нарисовать кнопкой «Рамка» на превью.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
