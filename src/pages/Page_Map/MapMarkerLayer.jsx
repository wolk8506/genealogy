import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Marker, Popup, useMap } from "react-leaflet";
import MapPointPopup from "./MapPointPopup";
import { GROUP_PRECISION, markerIconHtml } from "./mapHelpers";

function groupKeyOf(g) {
  return `${Number(g.lat).toFixed(GROUP_PRECISION)},${Number(g.lng).toFixed(GROUP_PRECISION)}`;
}

function FlyToPoint({ lat, lng, trigger, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger || lat == null || lng == null) return;
    try {
      map.flyTo([lat, lng], Math.max(map.getZoom(), zoom), { duration: 0.6 });
    } catch {
      // ignore
    }
  }, [lat, lng, trigger, zoom, map]);
  return null;
}

function GroupMarker({
  group,
  openGroupKey,
  onItemClick,
  onEditLocation,
}) {
  const markerRef = useRef(null);
  const gKey = groupKeyOf(group);
  const multi = group.items.length > 1;
  const single = group.items[0];
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    if (openGroupKey === gKey) {
      markerRef.current?.openPopup();
    }
  }, [openGroupKey, gKey]);

  useEffect(() => {
    if (multi || single.kind !== "photo") return;
    let mounted = true;
    window.photoAPI
      ?.getPath(single.owner, single.filename, "thumbs")
      .then((path) => {
        if (mounted && path) setThumbUrl(path);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [multi, single]);

  const icon = useMemo(() => {
    const html = multi
      ? markerIconHtml("mixed", { count: group.items.length })
      : markerIconHtml(single.kind, {
          thumbUrl,
          eventType: single.eventType,
        });
    const size = multi || single.kind === "photo" ? 36 : 28;
    return L.divIcon({
      className: "map-custom-marker",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [multi, single, group.items.length, thumbUrl]);

  return (
    <Marker
      ref={markerRef}
      position={[group.lat, group.lng]}
      icon={icon}
      eventHandlers={{
        mouseover: (e) => {
          e.target.setZIndexOffset(1000);
        },
        mouseout: (e) => {
          e.target.setZIndexOffset(0);
        },
      }}
    >
      <Popup>
        <MapPointPopup
          items={group.items}
          onItemClick={onItemClick}
          onEditLocation={onEditLocation}
        />
      </Popup>
    </Marker>
  );
}

export default function MapMarkerLayer({
  groups,
  focusTarget,
  onItemClick,
  onEditLocation,
}) {
  const [openGroupKey, setOpenGroupKey] = useState(null);
  const flyTrigger = focusTarget?.trigger ?? 0;

  useEffect(() => {
    if (!focusTarget?.lat || !focusTarget?.lng) return;
    const key = `${Number(focusTarget.lat).toFixed(GROUP_PRECISION)},${Number(focusTarget.lng).toFixed(GROUP_PRECISION)}`;
    setOpenGroupKey(key);
  }, [focusTarget]);

  return (
    <>
      <FlyToPoint
        lat={focusTarget?.lat}
        lng={focusTarget?.lng}
        trigger={flyTrigger}
      />
      {groups.map((g) => (
        <GroupMarker
          key={groupKeyOf(g)}
          group={g}
          openGroupKey={openGroupKey}
          onItemClick={onItemClick}
          onEditLocation={onEditLocation}
        />
      ))}
    </>
  );
}

export { groupKeyOf };
