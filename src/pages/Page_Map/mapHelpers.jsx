import { renderToStaticMarkup } from "react-dom/server";
import { EVENT_TYPES } from "../Page_Person/Event/EventTypesList";
import ContactsIcon from "@mui/icons-material/Contacts";
import EventIcon from "@mui/icons-material/Event";

export const norm = (s) => String(s || "").trim().toLowerCase();
export const GROUP_PRECISION = 4;
export const KIND_COLOR = {
  photo: "#1976d2",
  event: "#9c27b0",
  external: "#2e7d32",
  mixed: "#ed6c02",
};
export const MISS_TTL_MS = 7 * 24 * 3600 * 1000;
export const GEO_INTERVAL_MS = 1100;

export function locationKeyFromPoint(p) {
  return `${Number(p.lat).toFixed(GROUP_PRECISION)},${Number(p.lng).toFixed(GROUP_PRECISION)}`;
}

export function pointKey(p) {
  if (p.kind === "photo") return `photo-${p.id}`;
  if (p.kind === "external") return `external-${p.externalId}`;
  if (p.eventId != null && p.eventId !== "") {
    return `event-${p.personId}-${p.eventId}`;
  }
  const fallback = [
    p.personId,
    p.eventIndex ?? "",
    norm(p.eventType),
    norm(p.sub),
    norm(p.place),
  ].join("|");
  return `event-${fallback}`;
}

export function formatGeocodeEta(done, total) {
  const remaining = Math.max(0, total - done);
  if (remaining === 0) return null;
  const sec = Math.ceil(remaining * (GEO_INTERVAL_MS / 1000));
  if (sec >= 60) return `~${Math.ceil(sec / 60)} мин`;
  return `~${sec} сек`;
}

export function eventTypeIconElement(typeName) {
  const found = (EVENT_TYPES || []).find((t) => t.name === typeName);
  return found?.icon || <EventIcon fontSize="small" />;
}

export function markerIconHtml(kind, options = {}) {
  const { thumbUrl, eventType, count } = options;
  if (count != null && count > 1) {
    return `<div style="width:28px;height:28px;border-radius:50%;background:${KIND_COLOR.mixed};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);">${count}</div>`;
  }
  if (kind === "photo" && thumbUrl) {
    return `<img src="${thumbUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${KIND_COLOR.photo};box-shadow:0 1px 4px rgba(0,0,0,0.35);" />`;
  }
  if (kind === "event") {
    const iconMarkup = renderToStaticMarkup(
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: KIND_COLOR.event,
          color: "#fff",
        }}
      >
        {eventTypeIconElement(eventType)}
      </span>,
    );
    return iconMarkup;
  }
  if (kind === "external") {
    return renderToStaticMarkup(
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: KIND_COLOR.external,
          color: "#fff",
        }}
      >
        <ContactsIcon sx={{ fontSize: 16 }} />
      </span>,
    );
  }
  return `<div style="width:14px;height:14px;border-radius:50%;background:${KIND_COLOR.photo};border:2px solid #fff;"></div>`;
}
