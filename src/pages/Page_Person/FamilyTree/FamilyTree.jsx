import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import Tree from "react-d3-tree";
import * as d3 from "d3";
import * as htmlToImage from "html-to-image";
import ExportableAvatar from "../../utils/ExportableAvatar";
import { useNavigate } from "react-router-dom";
import { Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const FamilyTree = forwardRef(({ data, mode, people, personId }, ref) => {
  const containerRef = useRef(null);
  const svgWrapperRef = useRef(null);
  const treeInstanceRef = useRef(null); // Для доступа к методам react-d3-tree
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // Рефы для D3 зума (радиальный режим)
  const d3ZoomRef = useRef(null);
  const d3SvgRef = useRef(null);

  const isRadial = mode === "radial" || (data && data.layout === "radial");
  const isVertical = !isRadial;
  const isFullMode = mode === "full";

  const markBranch = (node, branch) => {
    if (!node) return null;
    const attrs = node.attributes || {};
    return {
      ...node,
      attributes: {
        ...attrs,
        branch,
      },
      children: Array.isArray(node.children)
        ? node.children.map((child) => markBranch(child, branch))
        : undefined,
    };
  };

  const verticalData = React.useMemo(() => {
    if (!isFullMode || !data || !Array.isArray(data.children)) return data;

    return {
      ...data,
      children: data.children.map((child) => {
        const group = child?.attributes?.group;
        if (group === "parents") return markBranch(child, "parents");
        if (group === "children") return markBranch(child, "children");
        return child;
      }),
    };
  }, [data, isFullMode]);

  // --- Внешнее управление ---
  useImperativeHandle(ref, () => ({
    handleExport: async () => {
      const treeElement = document.getElementById("tree-wrapper");
      if (!treeElement) return;
      try {
        const blob = await htmlToImage.toBlob(treeElement);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `family-tree-${personId || "export"}.png`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export failed", err);
      }
    },
    zoomIn: () => {
      if (isVertical && containerRef.current) {
        // В full-режиме может быть несколько SVG, поэтому применяем зум ко всем.
        const svgs = d3.select(containerRef.current).selectAll("svg");
        svgs.each(function applyZoomToSvg() {
          const svg = d3.select(this);
          const g = svg.select(".rd3t-g");
          if (!svg.node() || !g.node()) return;
          const transform = d3.zoomTransform(svg.node());
          const newScale = Math.min(transform.k * 1.2, 3);

          svg
            .transition()
            .duration(300)
            .call(
              d3
                .zoom()
                .on("zoom", (event) => g.attr("transform", event.transform))
                .transform,
              d3.zoomIdentity.translate(transform.x, transform.y).scale(newScale),
            );
        });
      } else if (isRadial && d3SvgRef.current && d3ZoomRef.current) {
        d3.select(d3SvgRef.current)
          .transition()
          .duration(300)
          .call(d3ZoomRef.current.scaleBy, 1.3);
      }
    },
    zoomOut: () => {
      if (isVertical && containerRef.current) {
        const svgs = d3.select(containerRef.current).selectAll("svg");
        svgs.each(function applyZoomToSvg() {
          const svg = d3.select(this);
          const g = svg.select(".rd3t-g");
          if (!svg.node() || !g.node()) return;
          const transform = d3.zoomTransform(svg.node());
          const newScale = Math.max(transform.k * 0.8, 0.1);

          svg
            .transition()
            .duration(300)
            .call(
              d3
                .zoom()
                .on("zoom", (event) => g.attr("transform", event.transform))
                .transform,
              d3.zoomIdentity.translate(transform.x, transform.y).scale(newScale),
            );
        });
      } else if (isRadial && d3SvgRef.current && d3ZoomRef.current) {
        d3.select(d3SvgRef.current)
          .transition()
          .duration(300)
          .call(d3ZoomRef.current.scaleBy, 0.7);
      }
    },
    fitView: () => {
      if (isVertical && containerRef.current) {
        const svgs = d3.select(containerRef.current).selectAll("svg");
        const gNodes = d3
          .select(containerRef.current)
          .selectAll(".rd3t-g")
          .nodes();

        if (!gNodes.length) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        gNodes.forEach((node) => {
          const bbox = node.getBBox();
          minX = Math.min(minX, bbox.x);
          minY = Math.min(minY, bbox.y);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        });

        const fullWidth = Math.max(maxX - minX, 1);
        const fullHeight = Math.max(maxY - minY, 1);

        const { width: containerWidth, height: containerHeight } = dimensions;
        const padding = 0.9;
        const scaleX = (containerWidth / fullWidth) * padding;
        const scaleY = (containerHeight / fullHeight) * padding;
        const newScale = Math.min(scaleX, scaleY, 1);

        const centerX = containerWidth / 2 - (minX + fullWidth / 2) * newScale;
        const centerY =
          containerHeight / 2 - (minY + fullHeight / 2) * newScale;

        svgs.each(function fitSvg() {
          const svg = d3.select(this);
          const g = svg.select(".rd3t-g");
          if (!svg.node() || !g.node()) return;

          svg
            .transition()
            .duration(500)
            .call(
              d3
                .zoom()
                .on("zoom", (event) => g.attr("transform", event.transform))
                .transform,
              d3.zoomIdentity.translate(centerX, centerY).scale(newScale),
            );
        });
      } else if (isRadial && d3SvgRef.current && d3ZoomRef.current) {
        // Для радиального (кругового) дерева логика центра чуть проще
        d3.select(d3SvgRef.current)
          .transition()
          .duration(500)
          .call(
            d3ZoomRef.current.transform,
            d3.zoomIdentity
              .translate(dimensions.width / 2, dimensions.height / 2)
              .scale(0.6), // Для радиального 0.6 обычно хватает, чтобы влезли внешние круги
          );
      }
    },
  }));

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

  // --- Vertical Node Renderer ---
  const renderVerticalNode = ({ nodeDatum }) => {
    const attrs = nodeDatum.attributes || {};
    const id = attrs.id;
    const initials = (nodeDatum.name || "")
      .split(" ")
      .map((n) => (n ? n[0] : ""))
      .join("")
      .toUpperCase();

    const isCurrentNode = String(personId ?? "") === String(id ?? "");
    const isParent = attrs.group === "parents";
    const isChild = attrs.group === "children";
    const shouldShowAvatar = !isParent && !isChild;
    const isGroupLabelNode = !id && (isParent || isChild);

    const borderColor = isParent
      ? "#9c6ade"
      : isChild
        ? "#47b26b"
        : attrs.gender === "male"
          ? "#4f9cf8"
          : attrs.gender === "female"
            ? "#ef5ca8"
            : "#9aa4b2";

    const glowColor = isCurrentNode
      ? "rgba(76, 175, 80, 0.35)"
      : "rgba(79, 156, 248, 0.18)";

    return (
      <foreignObject width={190} height={88} x={-95} y={-44}>
        <div
          onClick={() => id && navigate(`/person/${id}#familyTree`)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: shouldShowAvatar ? 10 : 0,
            width: "100%",
            height: "100%",
            padding: "8px 10px 8px 8px",
            borderRadius: 16,
            border: `2px solid ${borderColor}`,
            background: isDark
              ? "linear-gradient(135deg, rgb(31,35,40), rgb(20,24,28))"
              : "linear-gradient(135deg, rgb(255,255,255), rgb(245,247,251))",
            boxShadow: isCurrentNode
              ? `0 0 0 2px ${glowColor}, 0 12px 28px rgba(76,175,80,0.18)`
              : `0 8px 24px ${isDark ? "rgba(0,0,0,0.28)" : "rgba(15,23,42,0.08)"}`,
            cursor: id ? "pointer" : "default",
            boxSizing: "border-box",
            transition: "box-shadow 0.18s ease, border-color 0.18s ease",
            overflow: "hidden",
            clipPath: "inset(0 round 16px)",
            justifyContent: isGroupLabelNode ? "center" : "flex-start",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = isCurrentNode
              ? `0 0 0 2px ${glowColor}, 0 16px 32px rgba(76,175,80,0.2)`
              : `0 0 0 2px ${glowColor}, 0 14px 28px ${isDark ? "rgba(0,0,0,0.36)" : "rgba(15,23,42,0.12)"}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isCurrentNode
              ? `0 0 0 2px ${glowColor}, 0 12px 28px rgba(76,175,80,0.18)`
              : `0 8px 24px ${isDark ? "rgba(0,0,0,0.28)" : "rgba(15,23,42,0.08)"}`;
          }}
        >
          {shouldShowAvatar &&
            (typeof ExportableAvatar === "function" ? (
              <div style={{ position: "relative", zIndex: 1 }}>
                <ExportableAvatar personId={id} initials={initials} size={46} />
              </div>
            ) : (
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #dfe8ff, #f5d7ea)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#243041",
                  fontWeight: 800,
                  fontSize: 14,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.7)",
                }}
              >
                {initials}
              </div>
            ))}

          <div
            style={{
              position: "relative",
              zIndex: 1,
              minWidth: 0,
              flex: 1,
              overflow: "hidden",
              textAlign: isGroupLabelNode ? "center" : "left",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 12.5,
                lineHeight: 1.2,
                whiteSpace: isGroupLabelNode ? "normal" : "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                color: isDark ? "#f4f7fa" : "#1b2430",
              }}
            >
              {nodeDatum.name}
            </div>
            {attrs.birthday ? (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10.5,
                  color: isDark ? "#b8c4d3" : "#5d6b7d",
                  letterSpacing: "0.02em",
                }}
              >
                {attrs.birthday}
              </div>
            ) : isCurrentNode ? (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10.5,
                  color: isDark ? "#8b97a8" : "#7b8796",
                }}
              >
                Текущий
              </div>
            ) : null}
          </div>
        </div>
      </foreignObject>
    );
  };

  /* ----------------- RADIAL: D3 ----------------- */
  useEffect(() => {
    if (!data || !isRadial) return;
    const wrapper = svgWrapperRef.current;
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const width = dimensions.width || 1000;
    const height = dimensions.height || 700;
    const radius = Math.min(width, height) / 2;

    const svg = d3
      .select(wrapper)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    d3SvgRef.current = svg.node();
    const g = svg.append("g");

    const zoomBehavior = d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    d3ZoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Начальная позиция радиального древа
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8),
    );

    const root = d3.hierarchy(data).sum(() => 1);
    d3.partition().size([2 * Math.PI, radius])(root);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(0.005)
      .padRadius(radius / 3);

    const color = (d) => d3.interpolateCool(d.depth / 6);

    const slice = g
      .selectAll("g.slice")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "slice");

    slice
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => (d.depth === 0 ? "transparent" : color(d)))
      .attr("stroke", "#fff")
      .style("cursor", "pointer")
      .on(
        "click",
        (e, d) =>
          d.data.attributes?.id && navigate(`/person/${d.data.attributes.id}`),
      );

    slice
      .filter((d) => d.depth > 0 && d.x1 - d.x0 > 0.05)
      .append("text")
      .attr("transform", (d) => {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI - 90;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x}) translate(${y},0) rotate(${x > 90 ? 180 : 0})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("fill", "#fff")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text((d) => d.data.name?.split(" ")[0]);

    // Центр
    const center = g.append("g");
    center
      .append("circle")
      .attr("r", 35)
      .attr("fill", isDark ? "#333" : "#fff")
      .attr("stroke", "#999");
    center
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("fill", isDark ? "#fff" : "#000")
      .style("font-weight", 700)
      .text(data.name?.split(" ")[0]);

    return () => {
      svg.remove();
    };
  }, [data, isRadial, dimensions, isDark, navigate]);

  // Автоматический "прилет" дерева при первой загрузке данных
  useEffect(() => {
    if (data && (isVertical || isRadial)) {
      const timer = setTimeout(() => {
        // Вызываем наш же метод из imperativeHandle
        if (ref.current && typeof ref.current.fitView === "function") {
          ref.current.fitView();
        }
      }, 300); // Небольшая задержка, чтобы дерево успело отрендериться в DOM
      return () => clearTimeout(timer);
    }
  }, [data, isVertical, isRadial]);

  return (
    <Paper
      sx={{
        borderRadius: "18px",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        bgcolor: isDark ? "#12181f" : "#f7f9fc",
        border: `1px solid ${isDark ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.25)"}`,
        boxShadow: isDark
          ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 38px rgba(2,6,23,0.38)"
          : "inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 38px rgba(15,23,42,0.08)",
        backgroundImage: isDark
          ? "radial-gradient(circle at 20% 10%, rgba(96,165,250,0.12), transparent 30%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.08), transparent 28%)"
          : "radial-gradient(circle at 15% 5%, rgba(59,130,246,0.08), transparent 30%), radial-gradient(circle at 90% 0%, rgba(168,85,247,0.06), transparent 26%)",
      }}
    >
      <div
        id="tree-wrapper"
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <style>{`
          .rd3t-link {
            stroke: ${isDark ? "#7aa2ff" : "#9bb4d6"} !important;
            stroke-width: 2px !important;
            stroke-opacity: 0.9 !important;
            fill: none !important;
          }
          .rd3t-link.link-parents {
            stroke: ${isDark ? "#b18cff" : "#9c6ade"} !important;
          }
          .rd3t-link.link-children {
            stroke: ${isDark ? "#5ed690" : "#47b26b"} !important;
          }
          .rd3t-link.link-root-split {
            stroke: ${isDark ? "#ffd166" : "#d69e2e"} !important;
            stroke-width: 2.4px !important;
          }
          .rd3t-node circle, .rd3t-node ellipse, .rd3t-node rect {
            filter: drop-shadow(0 6px 14px rgba(15, 23, 42, 0.10));
          }
        `}</style>

        {isRadial && (
          <div ref={svgWrapperRef} style={{ width: "100%", height: "100%" }} />
        )}

        {isVertical && verticalData && (
          <Tree
            data={verticalData}
            ref={treeInstanceRef} // Ключевой момент для синхронизации зума
            translate={{ x: dimensions.width / 2, y: 50 }}
            orientation="vertical"
            pathFunc="elbow"
            collapsible={false}
            renderCustomNodeElement={renderVerticalNode}
            pathClassFunc={(linkDatum) => {
              const sourceAttrs = linkDatum?.source?.data?.attributes || {};
              const attrs = linkDatum?.target?.data?.attributes || {};
              const isRootSplitLink =
                isFullMode &&
                String(sourceAttrs.id ?? "") === String(personId ?? "") &&
                (attrs.group === "parents" || attrs.group === "children");

              if (isRootSplitLink) {
                return "rd3t-link link-root-split";
              }

              if (attrs.branch === "parents" || attrs.group === "parents") {
                return "rd3t-link link-parents";
              }
              if (attrs.branch === "children" || attrs.group === "children") {
                return "rd3t-link link-children";
              }
              return "rd3t-link";
            }}
            transitionDuration={300}
            enableLegacyTransition={true}
          />
        )}
      </div>
    </Paper>
  );
});

export default FamilyTree;
