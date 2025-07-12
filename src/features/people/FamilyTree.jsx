import React, { useRef, useState, useEffect } from "react";
import Tree from "react-d3-tree";
import ExportableAvatar from "./utils/ExportableAvatar";

import { useNavigate } from "react-router-dom";
import { Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function FamilyTree({ data, mode = "descendants" }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const navigate = useNavigate();

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  const renderNode = ({ nodeDatum }) => {
    const { id, birthday, gender } = nodeDatum.attributes || {};
    const initials = nodeDatum.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    const borderColor =
      gender === "male" ? "#2196f3" : gender === "female" ? "#e91e63" : "#999";

    return (
      <foreignObject width={160} height={80} x={-80} y={-40}>
        <div
          onClick={() => navigate(`/person/${id}`)}
          style={{
            display: "flex",
            alignItems: "center",
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 4,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            cursor: "pointer",
            transition: "box-shadow 0.2s",
            background: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#e0e0e0" : "#000",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <ExportableAvatar personId={id} initials={initials} size={40} />

          <div style={{ marginLeft: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 14 }}>
              {nodeDatum.name}
            </div>
            {birthday && (
              <div
                style={{
                  fontSize: 12,
                  color: isDark ? "#aaa" : "#666",
                }}
              >
                📅 {birthday}
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    );
  };

  return (
    <Stack spacing={1}>
      <div
        id="tree-wrapper"
        ref={containerRef}
        style={{
          width: "100%",
          height: "80vh",
          backgroundColor: isDark ? "#121212" : "#fff",
        }}
      >
        <div ref={treeRef} style={{ width: "100%", height: "100%" }}>
          <style>
            {`
      .rd3t-link {
        stroke: ${isDark ? "#ccc" : "#444"} !important;
        stroke-width: 1 !important;
        fill: none;
      }
    `}
          </style>
          <Tree
            data={data}
            translate={{ x: dimensions.width / 2, y: 50 }}
            orientation="vertical"
            zoomable
            collapsible={false}
            pathFunc="elbow"
            renderCustomNodeElement={renderNode}
          />
        </div>
      </div>
    </Stack>
  );
}
