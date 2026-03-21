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
      if (isVertical && treeInstanceRef.current) {
        // Достаем SVG через DOM, так как setState часто блокируется внутренним D3-зумом
        const svg = d3.select(containerRef.current).select("svg");
        const g = svg.select(".rd3t-g"); // Это основной контейнер дерева в библиотеке

        // Получаем текущую трансформацию
        const transform = d3.zoomTransform(svg.node());
        const newScale = Math.min(transform.k * 1.2, 3);

        // Применяем зум программно через D3
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
      } else if (isRadial && d3SvgRef.current && d3ZoomRef.current) {
        d3.select(d3SvgRef.current)
          .transition()
          .duration(300)
          .call(d3ZoomRef.current.scaleBy, 1.3);
      }
    },
    zoomOut: () => {
      if (isVertical && treeInstanceRef.current) {
        const svg = d3.select(containerRef.current).select("svg");
        const g = svg.select(".rd3t-g");
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
      } else if (isRadial && d3SvgRef.current && d3ZoomRef.current) {
        d3.select(d3SvgRef.current)
          .transition()
          .duration(300)
          .call(d3ZoomRef.current.scaleBy, 0.7);
      }
    },
    fitView: () => {
      if (isVertical && treeInstanceRef.current) {
        const svg = d3.select(containerRef.current).select("svg");
        const g = svg.select(".rd3t-g");
        const node = g.node();

        if (!node) return;

        // 1. Получаем реальные размеры всего содержимого дерева
        const bbox = node.getBBox();
        const fullWidth = bbox.width;
        const fullHeight = bbox.height;

        // 2. Получаем размеры контейнера
        const { width: containerWidth, height: containerHeight } = dimensions;

        // 3. Рассчитываем идеальный масштаб (с запасом 10% на отступы)
        const padding = 0.9;
        const scaleX = (containerWidth / fullWidth) * padding;
        const scaleY = (containerHeight / fullHeight) * padding;
        const newScale = Math.min(scaleX, scaleY, 1); // Не делаем масштаб больше 1 (оригинала)

        // 4. Рассчитываем центр
        // Нам нужно сместить дерево так, чтобы центр bbox совпал с центром контейнера
        const centerX =
          containerWidth / 2 - (bbox.x + fullWidth / 2) * newScale;
        const centerY =
          containerHeight / 2 - (bbox.y + fullHeight / 2) * newScale;

        // 5. Плавная анимация перехода
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
    const isPair = nodeDatum.type === "pair";
    const id = attrs.id;
    const initials = (nodeDatum.name || "")
      .split(" ")
      .map((n) => (n ? n[0] : ""))
      .join("")
      .toUpperCase();

    const borderColor =
      attrs.group === "parents"
        ? "#8e24aa"
        : attrs.group === "children"
          ? "#43a047"
          : attrs.gender === "male"
            ? "#2196f3"
            : attrs.gender === "female"
              ? "#e91e63"
              : "#999";

    return (
      <foreignObject width={180} height={80} x={-90} y={-40}>
        <div
          onClick={() => id && navigate(`/person/${id}#familyTree`)}
          style={{
            display: "flex",
            alignItems: "center",
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 6,
            width: "100%",
            height: "100%",
            cursor: id ? "pointer" : "default",
            background: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#e0e0e0" : "#000",
            boxSizing: "border-box",
          }}
        >
          {typeof ExportableAvatar === "function" ? (
            <ExportableAvatar personId={id} initials={initials} size={44} />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#222",
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ marginLeft: 10, overflow: "hidden" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {nodeDatum.name}
            </div>
            {attrs.birthday && (
              <div style={{ fontSize: 11, color: isDark ? "#aaa" : "#666" }}>
                📅 {attrs.birthday}
              </div>
            )}
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
        borderRadius: "15px",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        bgcolor: isDark ? "#121212" : "#f5f5f5",
      }}
    >
      <div
        id="tree-wrapper"
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <style>{`.rd3t-link { stroke: ${isDark ? "#555" : "#ccc"} !important; stroke-width: 1.5px !important; }`}</style>

        {isRadial && (
          <div ref={svgWrapperRef} style={{ width: "100%", height: "100%" }} />
        )}

        {isVertical && data && (
          <Tree
            data={data}
            ref={treeInstanceRef} // Ключевой момент для синхронизации зума
            translate={{ x: dimensions.width / 2, y: 50 }}
            orientation="vertical"
            pathFunc="elbow"
            collapsible={false}
            renderCustomNodeElement={renderVerticalNode}
            transitionDuration={300}
            enableLegacyTransition={true}
          />
        )}
      </div>
    </Paper>
  );
});

export default FamilyTree;
