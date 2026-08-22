import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  getContainedImageRect,
  normalizedBoxToPixels,
  pixelsToNormalizedBox,
  clampNormalizedBox,
} from "../utils/photoFaceLayout";
import { getPersonLabel } from "../utils/photoFaces";
import { getExternalEntityLabel } from "../utils/externalEntities";

export default function PhotoFaceOverlay({
  faces = [],
  imageSize,
  imageFrameRef,
  allPeople = [],
  allExternal = [],
  editable = false,
  selectedFaceId = null,
  onSelectFace,
  onFacesChange,
  drawMode = false,
  highlightFaceId = null,
}) {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [moving, setMoving] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [hoveredFaceId, setHoveredFaceId] = useState(null);
  const facesRef = useRef(faces);
  facesRef.current = faces;

  const getBounds = useCallback(() => {
    return (imageFrameRef?.current || containerRef.current)?.getBoundingClientRect();
  }, [imageFrameRef]);

  const updateLayout = useCallback(() => {
    if (imageFrameRef?.current) {
      const rect = imageFrameRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setLayout({
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height,
          scale: 1,
        });
      }
      return;
    }

    const el = containerRef.current;
    if (!el || !imageSize?.width || !imageSize?.height) {
      setLayout(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setLayout(
      getContainedImageRect(
        rect.width,
        rect.height,
        imageSize.width,
        imageSize.height,
      ),
    );
  }, [imageSize, imageFrameRef]);

  useEffect(() => {
    updateLayout();

    const targets = [containerRef.current, imageFrameRef?.current].filter(
      Boolean,
    );
    if (targets.length === 0) return undefined;

    const ro = new ResizeObserver(updateLayout);
    targets.forEach((t) => ro.observe(t));
    return () => ro.disconnect();
  }, [updateLayout, imageFrameRef]);

  const findPerson = (id) => allPeople.find((p) => p.id === id);
  const findExternal = (id) => allExternal.find((e) => e.id === id);

  const updateFaceBox = (faceId, box) => {
    onFacesChange?.(
      facesRef.current.map((face) =>
        face.id === faceId ? { ...face, box } : face,
      ),
    );
  };

  const pointerToNormalized = (clientX, clientY) => {
    const bounds = getBounds();
    if (!bounds || !layout) return null;

    const px = clientX - bounds.left;
    const py = clientY - bounds.top;
    const box = pixelsToNormalizedBox(
      { left: px, top: py, width: 1, height: 1 },
      layout,
    );
    return { x: box.x, y: box.y };
  };

  const handlePointerDown = (e) => {
    if (!editable || !layout || !onFacesChange) return;
    if (e.button !== 0 && e.button !== 2) return;
    if (e.button === 0 && !drawMode) return;

    e.preventDefault();
    e.stopPropagation();

    const bounds = getBounds();
    if (!bounds) return;
    const startX = e.clientX - bounds.left;
    const startY = e.clientY - bounds.top;
    setDrawing({ startX, startY, currentX: startX, currentY: startY });
  };

  const handlePointerMove = (e) => {
    if (drawing) {
      const bounds = getBounds();
      if (!bounds) return;
      setDrawing((d) => ({
        ...d,
        currentX: e.clientX - bounds.left,
        currentY: e.clientY - bounds.top,
      }));
      return;
    }

    if (resizing && layout && onFacesChange) {
      const point = pointerToNormalized(e.clientX, e.clientY);
      if (!point) return;

      const newBox = clampNormalizedBox({
        x: resizing.startBox.x,
        y: resizing.startBox.y,
        w: point.x - resizing.startBox.x,
        h: point.y - resizing.startBox.y,
      });

      updateFaceBox(resizing.faceId, newBox);
      return;
    }

    if (moving && layout && onFacesChange) {
      const bounds = getBounds();
      if (!bounds) return;

      const pointerX = e.clientX - bounds.left;
      const pointerY = e.clientY - bounds.top;
      const deltaX = (pointerX - moving.startPointerX) / layout.width;
      const deltaY = (pointerY - moving.startPointerY) / layout.height;

      const newBox = clampNormalizedBox({
        x: moving.startBox.x + deltaX,
        y: moving.startBox.y + deltaY,
        w: moving.startBox.w,
        h: moving.startBox.h,
      });

      updateFaceBox(moving.faceId, newBox);
    }
  };

  const finishDrawing = () => {
    if (!drawing || !layout || !onFacesChange) {
      setDrawing(null);
      return;
    }

    const left = Math.min(drawing.startX, drawing.currentX);
    const top = Math.min(drawing.startY, drawing.currentY);
    const width = Math.abs(drawing.currentX - drawing.startX);
    const height = Math.abs(drawing.currentY - drawing.startY);

    setDrawing(null);

    if (width < 8 || height < 8) return;

    const box = clampNormalizedBox(
      pixelsToNormalizedBox({ left, top, width, height }, layout),
    );

    const newFace = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      personId: null,
      box,
    };

    onFacesChange([...facesRef.current, newFace]);
    onSelectFace?.(newFace.id);
  };

  useEffect(() => {
    if (!drawing) return undefined;

    const onUp = () => finishDrawing();
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  });

  useEffect(() => {
    if (!moving && !resizing) return undefined;

    const onUp = () => {
      setMoving(null);
      setResizing(null);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  });

  const handleBoxPointerDown = (e, face) => {
    if (!editable || drawMode || !layout || !onFacesChange) return;
    if (e.button === 2) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    onSelectFace?.(face.id);

    const bounds = getBounds();
    if (!bounds) return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setMoving({
      faceId: face.id,
      startBox: { ...face.box },
      startPointerX: e.clientX - bounds.left,
      startPointerY: e.clientY - bounds.top,
    });
  };

  const handleResizePointerDown = (e, face) => {
    if (!editable || drawMode || !layout || !onFacesChange) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    onSelectFace?.(face.id);
    e.currentTarget.setPointerCapture?.(e.pointerId);

    setResizing({
      faceId: face.id,
      startBox: { ...face.box },
    });
  };

  const handleBoxContextMenu = (e) => {
    if (editable && !drawMode) {
      e.preventDefault();
    }
  };

  const renderBox = (face, isDraft = false, index = 0) => {
    if (!layout) return null;

    const px = normalizedBoxToPixels(face.box, layout);
    const isSelected = selectedFaceId === face.id;
    const isHighlighted = highlightFaceId === face.id;
    const isHovered = hoveredFaceId === face.id;
    const isDimmed = hoveredFaceId != null && !isHovered && !isSelected && !isHighlighted;
    const person = findPerson(face.personId);
    const external = findExternal(face.externalEntityId);
    const label = person
      ? getPersonLabel(person)
      : external
        ? getExternalEntityLabel(external)
        : editable
          ? `Лицо ${index + 1}`
          : "";
    const isActive = moving?.faceId === face.id || resizing?.faceId === face.id;

    return (
      <Box
        key={face.id}
        onPointerDown={(e) => handleBoxPointerDown(e, face)}
        onPointerEnter={() => setHoveredFaceId(face.id)}
        onPointerLeave={() => setHoveredFaceId((id) => (id === face.id ? null : id))}
        onContextMenu={handleBoxContextMenu}
        sx={{
          position: "absolute",
          left: px.left,
          top: px.top,
          width: px.width,
          height: px.height,
          opacity: isDimmed ? 0.42 : 1,
          border: "2px solid",
          borderColor: isHighlighted
            ? "#ffb74d"
            : isSelected
              ? "#42a5f5"
              : "rgba(255,255,255,0.9)",
          bgcolor: isHighlighted
            ? "rgba(255,183,77,0.2)"
            : isSelected
              ? "rgba(66,165,245,0.15)"
              : "rgba(255,255,255,0.06)",
          borderRadius: "4px",
          boxShadow: isSelected || isHighlighted || isHovered
            ? "0 0 0 1px rgba(66,165,245,0.5), 0 8px 18px rgba(0,0,0,0.28)"
            : "0 2px 8px rgba(0,0,0,0.35)",
          pointerEvents: "auto",
          cursor:
            editable && !drawMode
              ? moving?.faceId === face.id
                ? "grabbing"
                : "pointer"
              : "default",
          transition: isActive ? "none" : "border-color 0.15s, opacity 0.15s ease, box-shadow 0.15s ease",
          zIndex: isHovered ? 20 : isSelected || isHighlighted ? 12 : 4,
        }}
      >
        {label && (
          <Typography
            component="span"
            sx={{
              position: "absolute",
              left: 0,
              bottom: "100%",
              mb: 0.4,
              px: 0.8,
              py: 0.25,
              bgcolor: "rgba(0,0,0,0.62)",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 700,
              borderRadius: "6px",
              whiteSpace: "nowrap",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "none",
              textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.45)",
              letterSpacing: "0.01em",
              backdropFilter: "blur(2px)",
            }}
          >
            {label}
          </Typography>
        )}

        {isSelected && editable && !drawMode && !isDraft && (
          <Box
            onPointerDown={(e) => handleResizePointerDown(e, face)}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
              position: "absolute",
              right: -7,
              bottom: -7,
              width: 14,
              height: 14,
              bgcolor: "#42a5f5",
              border: "2px solid #fff",
              borderRadius: "50%",
              cursor: "nwse-resize",
              zIndex: 5,
              boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
            }}
          />
        )}

        {isDraft && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              border: "2px dashed rgba(66,165,245,0.9)",
              borderRadius: "4px",
            }}
          />
        )}
      </Box>
    );
  };

  let draftFace = null;
  if (drawing && layout) {
    const left = Math.min(drawing.startX, drawing.currentX);
    const top = Math.min(drawing.startY, drawing.currentY);
    const width = Math.abs(drawing.currentX - drawing.startX);
    const height = Math.abs(drawing.currentY - drawing.startY);
    draftFace = {
      id: "__draft__",
      box: pixelsToNormalizedBox({ left, top, width, height }, layout),
    };
  }

  return (
    <Box
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onContextMenu={(e) => {
        if (editable) e.preventDefault();
      }}
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        cursor: editable && drawMode ? "crosshair" : "default",
        zIndex: 2,
      }}
    >
      {faces.map((face, index) => renderBox(face, false, index))}
      {draftFace && renderBox(draftFace, true)}
    </Box>
  );
}