// pages/Page_GenealogyTree/GenealogyTreeCanvas.jsx
// SVG-холст дерева: карточки, связи, веер, pan/zoom и плавающие кнопки.
// Раскладка приходит готовыми координатами; здесь только рендер и анимация.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, IconButton, Tooltip, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import { CARD_H, CARD_W, COUPLE_GAP } from "./treeModel";

const MIN_ZOOM = 0.005;
const MAX_ZOOM = 3.2;

// Отвод от линии супругов к началу веера детей и обход карточки,
// если между супругами в ряду стоит ещё одна карточка.
const PAIR_STEM = 26;
const PAIR_ROUTE_DROP = 22;
const COMPACT_RADIUS = 26;
const sameRow = (a, b) => Math.abs(a.y - b.y) < 1;
const areAdjacent = (a, b) =>
  sameRow(a, b) && Math.abs(a.x - b.x) <= CARD_W + COUPLE_GAP + 1;
const pairRouteY = (a, b) => Math.max(a.y, b.y) + CARD_H / 2 + PAIR_ROUTE_DROP;

const avatarCache = new Map();

function useAvatarSrc(personId) {
  const key = String(personId);
  const [src, setSrc] = useState(() => avatarCache.get(key) || null);

  useEffect(() => {
    if (avatarCache.has(key)) {
      setSrc(avatarCache.get(key));
      return undefined;
    }

    let alive = true;
    window.avatarAPI
      ?.getPath(key)
      .then((path) => {
        const value = path ? `${path}?t=${Date.now()}` : null;
        avatarCache.set(key, value);
        if (alive) setSrc(value);
      })
      .catch(() => {
        avatarCache.set(key, null);
        if (alive) setSrc(null);
      });

    return () => {
      alive = false;
    };
  }, [key]);

  return src;
}

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return "";
  }
  return text;
};

const firstNameOf = (person) =>
  normalizeText(person?.firstName) ||
  normalizeText(person?.name)?.split(/\s+/)[0] ||
  "";

const lastNameOf = (person) =>
  normalizeText(person?.lastName) || normalizeText(person?.maidenName) || "";

const initialsOf = (person) => {
  const first = firstNameOf(person);
  const last = lastNameOf(person);
  const text = `${first[0] || ""}${last[0] || ""}`.toUpperCase();
  return text || "?";
};

const truncate = (text, max) => {
  const value = normalizeText(text);
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
};

const genderColor = (theme, person) => {
  const accents = theme.palette.accents || {};
  if (person?.gender === "male" || person?.gender === "M") {
    return accents.blue || theme.palette.primary.main;
  }
  if (person?.gender === "female" || person?.gender === "F") {
    return accents.pink || theme.palette.secondary.main;
  }
  return accents.gray || theme.palette.text.secondary;
};

const copiesLabel = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} раз`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} раза`;
  }
  return `${count} раз`;
};

// Один человек может попасть в дерево несколько раз (например, супруг двух
// братьев). Такой узел помечается значком копии, чтобы не путать дубли
// с разными людьми с одинаковым именем.
function DuplicateBadge({ x, y, radius = 8.5, copies }) {
  const theme = useTheme();
  const accent = theme.palette.warning?.main || "#FF8D28";
  const size = radius * 0.68;
  const shift = radius * 0.36;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>
        Этот человек показан в дереве {copiesLabel(copies)}
      </title>
      <circle
        r={radius}
        fill={accent}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={0.9}
      />
      <rect
        x={-radius * 0.5}
        y={-radius * 0.46}
        width={size}
        height={radius * 0.84}
        rx={1.2}
        fill="none"
        stroke="#fff"
        strokeWidth={1.1}
      />
      <rect
        x={-radius * 0.5 + shift}
        y={-radius * 0.46 + shift}
        width={size}
        height={radius * 0.84}
        rx={1.2}
        fill={accent}
        stroke="#fff"
        strokeWidth={1.1}
      />
    </g>
  );
}

function PersonCard({
  node,
  selected,
  root,
  dimmed,
  copies = 0,
  onSelect,
  onChooseRoot,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const person = node.person || {};
  const avatar = useAvatarSrc(node.id);
  const duplicated = copies > 1;

  const accent = genderColor(theme, person);
  const rootAccent = theme.palette.accents?.indigo || theme.palette.primary.main;
  // Пол виден по рамке карточки: у фото перекраски нет, а рамка работает
  // и с фотографией, и с инициалами. Выбор и корень важнее цвета пола.
  const stroke = selected
    ? rootAccent
    : root
      ? alpha(rootAccent, 0.75)
      : alpha(accent, isDark ? 0.62 : 0.52);

  // Значок дубля занимает правый верхний угол, поэтому длинное имя
  // укорачивается сильнее, чтобы не заезжать под него.
  const first = truncate(firstNameOf(person) || "Без имени", duplicated ? 16 : 20);
  const last = truncate(lastNameOf(person), 22);
  const hasSecondLine = Boolean(last) && last !== first;
  const clipId = `tree-avatar-${node.id}`;

  return (
    <g
      data-tree-node="true"
      className="tree-person"
      transform={`translate(${node.x - CARD_W / 2}, ${node.y - CARD_H / 2})`}
      style={{
        opacity: dimmed ? 0.3 : 1,
        transition: "opacity 180ms ease",
        filter: selected
          ? `drop-shadow(0 0 12px ${alpha(rootAccent, 0.4)})`
          : "none",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(node.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <title>{[firstNameOf(person), lastNameOf(person)].filter(Boolean).join(" ")}</title>

      <rect
        className="tree-card-bg"
        width={CARD_W}
        height={CARD_H}
        rx={14}
        fill={isDark ? "rgba(28,28,30,0.9)" : "rgba(255,255,255,0.92)"}
        stroke={stroke}
        strokeWidth={selected ? 2.2 : root ? 1.7 : 1.4}
      />

      <defs>
        <clipPath id={clipId}>
          <circle cx={32} cy={CARD_H / 2} r={18} />
        </clipPath>
      </defs>

      {avatar ? (
        <image
          href={avatar}
          x={14}
          y={(CARD_H - 36) / 2}
          width={36}
          height={36}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          <circle cx={32} cy={CARD_H / 2} r={18} fill={alpha(accent, 0.9)} />
          <text
            x={32}
            y={CARD_H / 2 + 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill="#fff"
          >
            {initialsOf(person)}
          </text>
        </>
      )}

      <text
        x={58}
        y={hasSecondLine ? 26 : 35}
        fontSize={13.5}
        fontWeight={700}
        fill={isDark ? "#f5f5f7" : "#111111"}
      >
        {first}
      </text>
      {hasSecondLine && (
        <text x={58} y={43} fontSize={11.5} fill={isDark ? "#9a9aa0" : "#5c5c61"}>
          {last}
        </text>
      )}

      {duplicated && <DuplicateBadge x={CARD_W - 20} y={16} copies={copies} />}
    </g>
  );
}

function fanSectorPath(sector) {
  if (!sector) return "";
  const { a0, a1, inner, outer } = sector;
  const point = (radius, angle) => [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  ];
  const [x0, y0] = point(outer, a0);
  const [x1, y1] = point(outer, a1);
  const [x2, y2] = point(inner, a1);
  const [x3, y3] = point(inner, a0);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;

  // У центрального корня веера внутренний радиус нулевой: дуга радиуса 0
  // невалидна, поэтому сектор замыкается прямо в центре.
  const innerArc =
    inner > 0.5 ? `A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3}` : null;

  return [
    `M ${x0} ${y0}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    innerArc,
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

function FanSector({
  node,
  selected,
  highlighted,
  dimmed,
  onSelect,
  onChooseRoot,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const person = node.person || {};
  const accent = genderColor(theme, person);
  const indigo = theme.palette.accents?.indigo || theme.palette.primary.main;
  const { sector } = node;

  const mid = (sector.a0 + sector.a1) / 2;
  const midRadius = (sector.inner + sector.outer) / 2;
  const textX = Math.cos(mid) * midRadius;
  const textY = Math.sin(mid) * midRadius;
  const arcWidth = Math.abs(sector.a1 - sector.a0) * midRadius;
  const fontSize = Math.max(7.5, Math.min(12, arcWidth * 0.22));

  const fill = selected
    ? alpha(indigo, isDark ? 0.55 : 0.4)
    : highlighted
      ? alpha(accent, isDark ? 0.3 : 0.22)
      : alpha(accent, isDark ? 0.14 : 0.1);

  const name = truncate(
    [firstNameOf(person), lastNameOf(person)].filter(Boolean).join(" "),
    18,
  );

  return (
    <g
      data-tree-node="true"
      style={{
        cursor: "pointer",
        opacity: dimmed ? 0.35 : 1,
        transition: "opacity 180ms ease",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(node.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <title>{name}</title>
      <path
        d={fanSectorPath(sector)}
        fill={fill}
        stroke={selected ? indigo : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
        strokeWidth={selected ? 1.8 : 0.8}
        style={{ transition: "fill 180ms ease" }}
      />
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight={selected ? 700 : 600}
        fill={isDark ? "#f5f5f7" : "#1a1a1a"}
        style={{ pointerEvents: "none" }}
      >
        {name}
      </text>
    </g>
  );
}

function CompactPerson({
  node,
  selected,
  root,
  dimmed,
  copies = 0,
  radius = COMPACT_RADIUS,
  onSelect,
  onChooseRoot,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const person = node.person || {};
  const avatar = useAvatarSrc(node.id);
  const duplicated = copies > 1;
  const accent = genderColor(theme, person);
  const indigo = theme.palette.accents?.indigo || theme.palette.primary.main;
  const clipId = `tree-compact-${node.id}`;
  const first = truncate(firstNameOf(person) || "Без имени", 14);

  const stroke = selected
    ? indigo
    : root
      ? alpha(indigo, 0.75)
      : alpha(accent, isDark ? 0.85 : 0.75);

  return (
    <g
      data-tree-node="true"
      className="tree-compact"
      transform={`translate(${node.x}, ${node.y})`}
      style={{
        opacity: dimmed ? 0.3 : 1,
        transition: "opacity 180ms ease",
        cursor: "pointer",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(node.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChooseRoot?.(node.id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <title>
        {[firstNameOf(person), lastNameOf(person)].filter(Boolean).join(" ")}
      </title>

      <defs>
        <clipPath id={clipId}>
          <circle r={radius - 2} />
        </clipPath>
      </defs>

      {avatar ? (
        <image
          href={avatar}
          x={-radius + 2}
          y={-radius + 2}
          width={(radius - 2) * 2}
          height={(radius - 2) * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          <circle r={radius - 2} fill={alpha(accent, 0.88)} />
          <text
            y={4}
            textAnchor="middle"
            fontSize={Math.round(radius * 0.5)}
            fontWeight={700}
            fill="#fff"
          >
            {initialsOf(person)}
          </text>
        </>
      )}

      <circle
        className="tree-compact-ring"
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={selected ? 2.6 : 1.7}
      />

      <text
        y={radius + 17}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={isDark ? "#f5f5f7" : "#111111"}
        style={{ pointerEvents: "none" }}
      >
        {first}
      </text>

      {duplicated && (
        <DuplicateBadge
          x={radius - 8}
          y={-(radius - 8)}
          radius={8}
          copies={copies}
        />
      )}
    </g>
  );
}

function useAnimatedNodes(nodes) {
  const [animated, setAnimated] = useState(nodes);
  const currentRef = useRef(nodes);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!nodes) return undefined;

    const previousNodes = currentRef.current || [];
    const fromKey = new Map(previousNodes.map((node) => [node.key, node]));
    const fromId = new Map();
    previousNodes.forEach((node) => {
      const id = String(node.id);
      if (!fromId.has(id)) fromId.set(id, node);
    });
    const start = performance.now();
    const duration = 260;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const next = nodes.map((node) => {
        const previous =
          fromKey.get(node.key) || fromId.get(String(node.id));
        if (!previous) return node;
        return {
          ...node,
          x: previous.x + (node.x - previous.x) * eased,
          y: previous.y + (node.y - previous.y) * eased,
        };
      });

      currentRef.current = next;
      setAnimated(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [nodes]);

  return animated;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function GenealogyTreeCanvas({
  layout,
  mode,
  selectedPersonId,
  rootPersonId,
  highlightIds,
  onSelectPerson,
  onChooseRoot,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef(null);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);

  const animatedNodes = useAnimatedNodes(layout?.nodes || null);
  const nodes = animatedNodes || [];

  // Люди, представленные в дереве более одного раза: у них несколько узлов
  // с одинаковым id, и каждое место нужно пометить как дубль.
  const duplicateCounts = useMemo(() => {
    const counts = new Map();
    (layout?.nodes || []).forEach((node) => {
      const id = String(node.id);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return new Map(
      [...counts].filter(([, count]) => count > 1),
    );
  }, [layout]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitView = useCallback(() => {
    if (!layout || !size.width || !size.height) return;
    const padding = 84;
    const nextK = clamp(
      Math.min(
        (size.width - padding) / Math.max(layout.width, 1),
        (size.height - padding) / Math.max(layout.height, 1),
        1.2,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const centerX = layout.minX + layout.width / 2;
    const centerY = layout.minY + layout.height / 2;
    setView({
      k: nextK,
      x: size.width / 2 - centerX * nextK,
      y: size.height / 2 - centerY * nextK,
    });
  }, [layout, size.width, size.height]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  const zoomAtPoint = useCallback((px, py, factor) => {
    setView((previous) => {
      const nextK = clamp(previous.k * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = nextK / previous.k;
      return {
        k: nextK,
        x: px - (px - previous.x) * ratio,
        y: py - (py - previous.y) * ratio,
      };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor) => {
      zoomAtPoint(size.width / 2, size.height / 2, factor);
    },
    [size.width, size.height, zoomAtPoint],
  );

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0016);
      zoomAtPoint(event.clientX - rect.left, event.clientY - rect.top, factor);
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [zoomAtPoint]);

  useEffect(() => {
    const handleMove = (event) => {
      const start = dragRef.current;
      if (!start) return;
      setView({
        ...viewRef.current,
        x: start.x + (event.clientX - start.sx),
        y: start.y + (event.clientY - start.sy),
      });
    };

    const handleUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragging(false);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.("[data-tree-node]")) return;
    dragRef.current = {
      sx: event.clientX,
      sy: event.clientY,
      x: view.x,
      y: view.y,
    };
    setDragging(true);
  };

  const centerSelected = useCallback(() => {
    const node = nodes.find(
      (item) => item.id === String(selectedPersonId),
    );
    if (!node) return;
    const nextK = Math.max(view.k, 0.85);
    setView({
      k: nextK,
      x: size.width / 2 - node.x * nextK,
      y: size.height / 2 - node.y * nextK,
    });
  }, [nodes, selectedPersonId, size.width, size.height, view.k]);

  const byKey = useMemo(
    () => new Map(nodes.map((node) => [node.key, node])),
    [nodes],
  );
  const personIdByKey = useMemo(
    () => new Map(nodes.map((node) => [node.key, String(node.id)])),
    [nodes],
  );

  const highlight = highlightIds instanceof Set ? highlightIds : null;
  const hasHighlight = Boolean(highlight && highlight.size);
  const isDimmed = (id) => hasHighlight && !highlight.has(String(id));

  const linkPaths = useMemo(() => {
    if (!layout || layout.isFan) return [];

    return layout.links
      .map((link, index) => {
        const target = byKey.get(link.to);
        if (!target) return null;

        let d;
        let fromNodes;

        if (mode === "radial") {
          // В радиальной раскладке линия идёт от человека, а не от середины
          // пары: супруг — компактный кружок рядом, а не вторая карточка.
          const source = byKey.get(link.from[0]);
          if (!source) return null;
          d = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
          fromNodes = [source];
        } else {
          fromNodes = link.from
            .map((key) => byKey.get(key))
            .filter(Boolean);
          if (!fromNodes.length) return null;

          const xs =
            fromNodes.reduce((sum, node) => sum + node.x, 0) /
            fromNodes.length;
          const baseY = Math.max(...fromNodes.map((node) => node.y));
          const downward = target.y >= baseY;
          // Связь от пары начинается ниже линии супругов, а не в середине
          // карточек: иначе изгиб к детям проходит сквозь карточки.
          let drop = CARD_H / 2;
          if (fromNodes.length > 1) {
            const routed =
              fromNodes.every((node) => sameRow(node, fromNodes[0])) &&
              !areAdjacent(fromNodes[0], fromNodes[1]);
            drop = routed ? CARD_H / 2 + PAIR_ROUTE_DROP : PAIR_STEM;
          }
          const sourceY = baseY + (downward ? 1 : -1) * drop;
          const sx = xs;
          const targetY = target.y + (downward ? -CARD_H / 2 : CARD_H / 2);
          const midY = (sourceY + targetY) / 2;
          d = `M ${sx} ${sourceY} C ${sx} ${midY}, ${target.x} ${midY}, ${target.x} ${targetY}`;
        }

        const highlighted =
          !hasHighlight ||
          (link.from.some((key) =>
            highlight.has(personIdByKey.get(key)),
          ) &&
            highlight.has(personIdByKey.get(link.to)));

        return {
          key: `link-${index}-${link.from.join("-")}>${link.to}`,
          d,
          highlighted,
          dimmed: !highlighted,
        };
      })
      .filter(Boolean);
  }, [layout, byKey, personIdByKey, mode, hasHighlight, highlight]);

  const coupleLines = useMemo(() => {
    if (!layout || layout.isFan) return [];

    return layout.couples
      .map((couple, index) => {
        const a = byKey.get(couple.a);
        const b = byKey.get(couple.b);
        if (!a || !b) return null;

        let d;
        if (mode === "radial") {
          // В радиальной раскладке супруги — соседние кружки: линия идёт
          // коротким отрезком между их краями. Карточные отводы к детям
          // здесь не нужны и давали крючки под кружками.
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);
          const radiusA = a.radius || COMPACT_RADIUS;
          const radiusB = b.radius || COMPACT_RADIUS;
          if (distance <= radiusA + radiusB + 2) return null;
          const ux = dx / distance;
          const uy = dy / distance;
          d = `M ${a.x + ux * radiusA} ${a.y + uy * radiusA} L ${b.x - ux * radiusB} ${b.y - uy * radiusB}`;
        } else if (areAdjacent(a, b)) {
          // Линия пары рисуется только в зазоре между карточками: под
          // полупрозрачными карточками она иначе просвечивает.
          const left = a.x <= b.x ? a : b;
          const right = a.x <= b.x ? b : a;
          d = `M ${left.x + CARD_W / 2} ${left.y} L ${right.x - CARD_W / 2} ${right.y}`;

          // Дети пары начинаются под рядом карточек, поэтому от середины
          // супружеской линии к ним ведёт короткий вертикальный отвод.
          const pairSet = new Set([couple.a, couple.b]);
          const baseY = Math.max(a.y, b.y);
          let downward = null;
          layout.links.forEach((link) => {
            if (downward !== null || link.from.length !== 2) return;
            if (!link.from.every((key) => pairSet.has(key))) return;
            const child = byKey.get(link.to);
            if (!child) return;
            downward = child.y >= baseY;
          });
          if (downward !== null) {
            const midX = (a.x + b.x) / 2;
            const stemY = baseY + (downward ? 1 : -1) * PAIR_STEM;
            d += ` M ${midX} ${baseY} L ${midX} ${stemY}`;
          }
        } else {
          // Если между супругами стоит чужая карточка, линия огибает её
          // плавной дугой. Контрольные точки подобраны так, чтобы середина
          // дуги проходила через pairRouteY — оттуда начинаются связи детей.
          const baseY = Math.max(a.y, b.y);
          const bottomY = baseY + CARD_H / 2;
          const routeY = pairRouteY(a, b);
          const bendY = (4 * routeY - bottomY) / 3;
          d = `M ${a.x} ${bottomY} C ${a.x} ${bendY}, ${b.x} ${bendY}, ${b.x} ${bottomY}`;
        }

        return {
          key: `couple-${index}-${couple.a}-${couple.b}`,
          d,
          highlighted:
            !hasHighlight ||
            (highlight.has(String(a.id)) && highlight.has(String(b.id))),
        };
      })
      .filter(Boolean);
  }, [layout, byKey, hasHighlight, highlight, mode]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          display: "block",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={() => fitView()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <defs>
          <style>{`
            .tree-person { cursor: pointer; }
            .tree-person .tree-card-bg {
              transition: stroke 140ms ease, fill 140ms ease;
            }
            .tree-person:hover .tree-card-bg {
              stroke: ${theme.palette.accents?.indigo || theme.palette.primary.main};
            }
            .tree-compact .tree-compact-ring {
              transition: stroke 140ms ease;
            }
            .tree-compact:hover .tree-compact-ring {
              stroke: ${theme.palette.accents?.indigo || theme.palette.primary.main};
            }
          `}</style>
        </defs>

        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          {layout?.isFan ? (
            nodes
              .filter((node) => node.sector)
              .map((node) => (
                <FanSector
                  key={node.key}
                  node={node}
                  selected={String(node.id) === String(selectedPersonId)}
                  highlighted={!hasHighlight || highlight.has(String(node.id))}
                  dimmed={isDimmed(node.id)}
                  onSelect={onSelectPerson}
                  onChooseRoot={onChooseRoot}
                />
              ))
          ) : (
            <>
              <g>
                {linkPaths.map((link) => (
                  <path
                    key={link.key}
                    d={link.d}
                    fill="none"
                    stroke={
                      link.highlighted
                        ? alpha(
                            theme.palette.accents?.indigo ||
                              theme.palette.primary.main,
                            isDark ? 0.62 : 0.48,
                          )
                        : isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.14)"
                    }
                    strokeWidth={link.highlighted ? 2 : 1.4}
                    strokeLinecap="round"
                    style={{ transition: "stroke 180ms ease" }}
                  />
                ))}
              </g>

              <g>
                {coupleLines.map((line) => (
                  <path
                    key={line.key}
                    d={line.d}
                    fill="none"
                    stroke={
                      line.highlighted
                        ? alpha(
                            theme.palette.accents?.indigo ||
                              theme.palette.primary.main,
                            isDark ? 0.55 : 0.42,
                          )
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)"
                    }
                    strokeWidth={line.highlighted ? 2 : 1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>

              <g>
                {nodes.map((node) =>
                  node.compact ? (
                    <CompactPerson
                      key={node.key}
                      node={node}
                      selected={String(node.id) === String(selectedPersonId)}
                      root={String(node.id) === String(rootPersonId)}
                      dimmed={isDimmed(node.id)}
                      copies={duplicateCounts.get(String(node.id)) || 0}
                      radius={node.radius}
                      onSelect={onSelectPerson}
                      onChooseRoot={onChooseRoot}
                    />
                  ) : (
                    <PersonCard
                      key={node.key}
                      node={node}
                      selected={String(node.id) === String(selectedPersonId)}
                      root={String(node.id) === String(rootPersonId)}
                      dimmed={isDimmed(node.id)}
                      copies={duplicateCounts.get(String(node.id)) || 0}
                      onSelect={onSelectPerson}
                      onChooseRoot={onChooseRoot}
                    />
                  ),
                )}
              </g>
            </>
          )}
        </g>
      </svg>

      <Box
        sx={{
          position: "absolute",
          right: 16,
          bottom: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          zIndex: 2,
        }}
      >
        <Box sx={mapGlassColumnSx}>
          <Tooltip title="Увеличить" placement="left">
            <Box onClick={() => zoomCenter(1.22)} sx={mapGlassButtonSx}>
              <AddIcon sx={{ fontSize: 18 }} />
            </Box>
          </Tooltip>
          <Box sx={{ height: "1px", width: "100%", bgcolor: "glass.border" }} />
          <Tooltip title="Сбросить масштаб" placement="left">
            <ButtonPercent
              value={Math.round(view.k * 100)}
              onClick={() => zoomAtPoint(size.width / 2, size.height / 2, 1 / view.k)}
            />
          </Tooltip>
          <Box sx={{ height: "1px", width: "100%", bgcolor: "glass.border" }} />
          <Tooltip title="Уменьшить" placement="left">
            <Box onClick={() => zoomCenter(1 / 1.22)} sx={mapGlassButtonSx}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </Box>
          </Tooltip>
        </Box>

        <Tooltip title="Вписать в экран" placement="left">
          <IconButton size="small" onClick={fitView} sx={mapGlassRoundButtonSx}>
            <FitScreenIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Центрировать выбранного" placement="left">
          <IconButton
            size="small"
            onClick={centerSelected}
            sx={mapGlassRoundButtonSx}
          >
            <CenterFocusStrongIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

const mapGlassColumnSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderRadius: "16px",
  overflow: "hidden",
  bgcolor: "glass.surface",
  color: "text.primary",
  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const mapGlassButtonSx = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "inherit",
  transition: "background-color 160ms ease",
  "&:hover": { bgcolor: "glass.hover" },
};

const mapGlassRoundButtonSx = {
  ...mapGlassButtonSx,
  borderRadius: "50%",
  bgcolor: "glass.surface",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
  "&:hover": { bgcolor: "glass.hover" },
};

function ButtonPercent({ value, onClick }) {
  return (
    <Box onClick={onClick} sx={{ ...mapGlassButtonSx, width: 40, height: 30 }}>
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, lineHeight: 1 }}>
        {value}%
      </Typography>
    </Box>
  );
}
