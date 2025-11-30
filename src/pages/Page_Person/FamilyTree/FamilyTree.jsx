// FamilyTree.jsx
import React, { useRef, useState, useEffect } from "react";
import Tree from "react-d3-tree";
import * as d3 from "d3";
import ExportableAvatar from "../../utils/ExportableAvatar";
import { useNavigate } from "react-router-dom";
import { Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * FamilyTree.jsx
 * Поддерживает режимы: descendants, ancestors, full, radial
 *
 * Исправления:
 * - D3 рендер для radial выполняется в svgWrapperRef (React управляет контейнером)
 * - подписи: корректный поворот, обратный поворот, двухстрочные подписи
 * - корневой узел (depth 0) не получает подпись в секторе — центр рисуется отдельно
 * - центр имеет фон (цвет зависит от темы) и текст в 1-2 строки
 * - корректный cleanup D3 элементов
 */

export default function FamilyTree({
  data,
  mode = "descendants",
  people = [],
  personId = null,
}) {
  const containerRef = useRef(null);
  const svgWrapperRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // --- helper avatar (uses ExportableAvatar if available) ---
  const SmallAvatar = ({ personId: pid, initials, size = 40 }) => {
    if (typeof ExportableAvatar === "function") {
      return (
        <ExportableAvatar personId={pid} initials={initials} size={size} />
      );
    }
    const bg = "#ddd";
    const color = "#222";
    const style = {
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: Math.max(12, Math.floor(size / 2.5)),
      flexShrink: 0,
    };
    return <div style={style}>{initials}</div>;
  };

  // --- vertical node renderer for react-d3-tree ---
  const renderVerticalNode = ({ nodeDatum }) => {
    const attrs = nodeDatum.attributes || {};
    const isGroup = attrs.group === "parents" || attrs.group === "children";
    const isPair = nodeDatum.type === "pair";

    if (isPair) {
      const pairIds = attrs.pairOf || [];
      const left = people.find((p) => p.id === pairIds[0]) || null;
      const right = people.find((p) => p.id === pairIds[1]) || null;
      const leftInitials = left
        ? (
            (left.firstName || "").slice(0, 1) +
            (left.lastName || "").slice(0, 1)
          ).toUpperCase()
        : "?";
      const rightInitials = right
        ? (
            (right.firstName || "").slice(0, 1) +
            (right.lastName || "").slice(0, 1)
          ).toUpperCase()
        : "?";

      return (
        <foreignObject width={260} height={80} x={-130} y={-40}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: `2px solid ${isDark ? "#888" : "#777"}`,
              borderRadius: 10,
              padding: 8,
              background: isDark ? "#1a1a1a" : "#fff",
              color: isDark ? "#e0e0e0" : "#111",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <SmallAvatar
                  personId={left?.id}
                  initials={leftInitials}
                  size={40}
                />
                <div style={{ fontSize: 10, marginTop: 4 }}>
                  {left ? left.firstName : ""}
                </div>
              </div>

              <div style={{ width: 6 }} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <SmallAvatar
                  personId={right?.id}
                  initials={rightInitials}
                  size={40}
                />
                <div style={{ fontSize: 10, marginTop: 4 }}>
                  {right ? right.firstName : ""}
                </div>
              </div>
            </div>

            <div style={{ marginLeft: 12, fontWeight: 700 }}>
              {nodeDatum.name}
            </div>
          </div>
        </foreignObject>
      );
    }

    const id = attrs.id;
    const initials = (nodeDatum.name || "")
      .split(" ")
      .map((n) => (n ? n[0] : ""))
      .join("")
      .toUpperCase();

    const borderColor = isGroup
      ? attrs.group === "parents"
        ? "#8e24aa"
        : "#43a047"
      : attrs.gender === "male"
      ? "#2196f3"
      : attrs.gender === "female"
      ? "#e91e63"
      : "#999";

    return (
      <foreignObject width={180} height={80} x={-90} y={-40}>
        <div
          onClick={() => id && navigate(`/person/${id}`)}
          style={{
            display: "flex",
            alignItems: "center",
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 6,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            cursor: id ? "pointer" : "default",
            background: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#e0e0e0" : "#000",
          }}
        >
          <SmallAvatar personId={id} initials={initials} size={44} />
          <div style={{ marginLeft: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {nodeDatum.name}
            </div>
            {attrs.birthday && (
              <div style={{ fontSize: 12, color: isDark ? "#aaa" : "#666" }}>
                📅 {attrs.birthday}
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    );
  };

  /* ----------------- RADIAL: D3 render in useEffect ----------------- */
  useEffect(() => {
    if (!data) return;
    const isRadial = mode === "radial" || (data && data.layout === "radial");
    if (!isRadial) return;

    const wrapper = svgWrapperRef.current;
    if (!wrapper) return;

    // ensure wrapper is empty (React owns wrapper)
    wrapper.innerHTML = "";

    const width = Math.max(600, dimensions.width);
    const height = Math.max(600, dimensions.height);
    const radius = Math.min(width, height) / 2;

    const svg = d3
      .select(wrapper)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const root = d3
      .hierarchy(data, (d) =>
        d.children && d.children.length ? d.children : null
      )
      .sum(() => 1)
      .sort((a, b) => b.value - a.value);

    // optional depth limit to avoid overcrowding
    const maxDepth = 6;
    root.each((d) => {
      if (d.depth > maxDepth) d.children = null;
    });

    d3.partition().size([2 * Math.PI, radius])(root);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(0.005)
      .padRadius(radius / 3);

    const maxDepthFound = d3.max(root.descendants(), (d) => d.depth) || 1;
    const color = (d) =>
      d3.interpolateCool(d.depth / Math.max(1, maxDepthFound));

    // tooltip
    const tooltip = d3
      .select(wrapper)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "#fff")
      .style("padding", "6px 8px")
      .style("border-radius", "6px")
      .style("font-size", "12px");

    const nodes = root.descendants();

    const slice = g
      .selectAll("g.slice")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "slice");

    slice
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => (d.depth === 0 ? "transparent" : color(d)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", (d) => (d.data?.attributes?.id ? "pointer" : "default"))
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.5);
        tooltip
          .style("display", "block")
          .html(
            `<strong>${escapeHtml(d.data.name)}</strong>${
              d.data.attributes?.birthday
                ? ` • ${escapeHtml(d.data.attributes.birthday)}`
                : ""
            }`
          );
      })
      .on("mousemove", function (event) {
        const [pageX, pageY] = d3.pointer(event, document.body);
        tooltip
          .style("left", `${pageX + 12}px`)
          .style("top", `${pageY + 12}px`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
        tooltip.style("display", "none");
      })
      .on("click", function (event, d) {
        if (d.data?.attributes?.id) {
          navigate(`/person/${d.data.attributes.id}`);
        }
      });

    // labels: exclude root (depth 0) to avoid duplication with center
    const labelThreshold = 0.02;
    slice
      .filter((d) => d.depth > 0 && d.x1 - d.x0 > labelThreshold)
      .append("text")
      .each(function (d) {
        const angleDeg = ((d.x0 + d.x1) / 2) * (180 / Math.PI) - 90;
        const rotateOuter = angleDeg;
        const backRotate = angleDeg > 90 ? 180 : 0;
        const r = (d.y0 + d.y1) / 2;

        // split name into up to 2 lines
        const rawName = (d.data.name || "").trim();
        let lines = [];
        const words = rawName.split(/\s+/).filter(Boolean);
        if (words.length <= 2) {
          lines = [rawName];
        } else {
          // try to split near middle character
          const mid = Math.floor(rawName.length / 2);
          let splitIndex = rawName.lastIndexOf(" ", mid);
          if (splitIndex < 1) splitIndex = rawName.indexOf(" ", mid);
          if (splitIndex > 0) {
            lines = [
              rawName.slice(0, splitIndex).trim(),
              rawName.slice(splitIndex + 1).trim(),
            ];
          } else {
            const half = Math.ceil(words.length / 2);
            lines = [
              words.slice(0, half).join(" "),
              words.slice(half).join(" "),
            ];
          }
        }

        const text = d3
          .select(this)
          .attr(
            "transform",
            `rotate(${rotateOuter}) translate(${r},0) rotate(${backRotate})`
          )
          .attr("text-anchor", "middle")
          .style("pointer-events", "none")
          .style("fill", "#fff")
          .style("font-size", Math.max(9, 12 - d.depth))
          .style("font-weight", 600);

        if (lines.length === 1) {
          text.append("tspan").attr("x", 0).attr("dy", "0.35em").text(lines[0]);
        } else {
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "-0.35em")
            .text(lines[0]);
          text.append("tspan").attr("x", 0).attr("dy", "1.0em").text(lines[1]);
        }
      });

    // center background + label (theme-aware)
    const centerGroup = g.append("g").attr("class", "center-group");

    const centerRadius = Math.max(28, radius * 0.06);
    centerGroup
      .append("circle")
      .attr("r", centerRadius)
      .attr("fill", isDark ? "#222" : "#fff")
      .attr("stroke", isDark ? "#444" : "#ddd")
      .attr("stroke-width", 1.5);

    // center text split into up to 2 lines
    const centerName = (data.name || "").trim();
    const centerWords = centerName.split(/\s+/).filter(Boolean);
    let centerLines = [];
    if (centerWords.length <= 2) {
      centerLines = [centerName];
    } else {
      const half = Math.ceil(centerWords.length / 2);
      centerLines = [
        centerWords.slice(0, half).join(" "),
        centerWords.slice(half).join(" "),
      ];
    }

    const centerText = centerGroup
      .append("text")
      .attr("text-anchor", "middle")
      .style("font-weight", 800)
      .style("font-size", 13)
      .style("fill", isDark ? "#fff" : "#111");

    if (centerLines.length === 1) {
      centerText
        .append("tspan")
        .attr("x", 0)
        .attr("dy", "0.35em")
        .text(centerLines[0]);
    } else {
      centerText
        .append("tspan")
        .attr("x", 0)
        .attr("dy", "-0.35em")
        .text(centerLines[0]);
      centerText
        .append("tspan")
        .attr("x", 0)
        .attr("dy", "1.0em")
        .text(centerLines[1]);
    }

    // cleanup
    return () => {
      try {
        d3.select(wrapper).selectAll("svg").remove();
        d3.select(wrapper).selectAll("div").remove();
      } catch (err) {
        // ignore
      }
    };
  }, [data, mode, dimensions.width, dimensions.height, navigate, isDark]);

  // main render
  const resolvedData = data;
  const isRadial =
    mode === "radial" || (resolvedData && resolvedData.layout === "radial");
  const isVertical = !isRadial;

  return (
    <Paper spacing={1} sx={{ borderRadius: "15px" }}>
      <div
        id="tree-wrapper"
        ref={containerRef}
        style={{
          width: "100%",
          height: "80vh",
          position: "relative",
          overflow: "auto",
        }}
      >
        <style>{`.rd3t-link { stroke: ${
          isDark ? "#ccc" : "#444"
        } !important; stroke-width: 1 !important; fill: none; }`}</style>

        {/* D3 will render into this wrapper when radial */}
        {isRadial && (
          <div ref={svgWrapperRef} style={{ width: "100%", height: "100%" }} />
        )}

        {/* Vertical tree */}
        {isVertical && resolvedData && (
          <div style={{ width: "100%", height: "100%" }}>
            <Tree
              data={resolvedData}
              translate={{ x: dimensions.width / 2, y: 50 }}
              orientation="vertical"
              zoomable
              collapsible={false}
              pathFunc="elbow"
              renderCustomNodeElement={renderVerticalNode}
            />
          </div>
        )}
      </div>
    </Paper>
  );
}

// helper
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;",
      }[s] || s
    );
  });
}
