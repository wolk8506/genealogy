import { useEffect, useState } from "react";
import { Avatar } from "@mui/material";

export default function PersonAvatar({
  personId,
  initials,
  size = 80,
  refresh,
}) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setError(false);

    if (personId) {
      window.avatarAPI.getPath(personId).then((path) => {
        if (!path) {
          // console.warn("⚠️ Аватар не найден для:", personId);
          if (isMounted) setError(true);
          return;
        }

        const url = `${path}?t=${Date.now()}`;
        // console.log("🖼️ avatar path:", url);
        if (isMounted) setSrc(url);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [personId, refresh]);

  return (
    <Avatar
      src={!error ? src : undefined}
      onError={() => setError(true)}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        bgcolor: !src || error ? "grey.400" : undefined, // ← серый фон
        color: "#f5f5f5", // ← чёрный текст для контраста
      }}
    >
      {initials?.slice(0, 2).toUpperCase()}
    </Avatar>
  );
}
