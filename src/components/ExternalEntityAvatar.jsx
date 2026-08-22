import { useEffect, useState } from "react";
import { Avatar } from "@mui/material";
import { getExternalEntityInitials } from "../utils/externalEntities";

export default function ExternalEntityAvatar({
  entityId,
  entity,
  size = 80,
  refresh,
  sx = {},
}) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setError(false);

    if (entityId) {
      window.externalAPI.avatar.getPath(entityId).then((path) => {
        if (!path) {
          if (isMounted) setError(true);
          return;
        }
        if (isMounted) setSrc(`${path}?t=${Date.now()}`);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [entityId, refresh]);

  const initials = getExternalEntityInitials(entity);

  return (
    <Avatar
      src={!error ? src : undefined}
      onError={() => setError(true)}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        bgcolor: !src || error ? "grey.400" : undefined,
        color: "#f5f5f5",
        ...sx,
      }}
    >
      {initials}
    </Avatar>
  );
}
