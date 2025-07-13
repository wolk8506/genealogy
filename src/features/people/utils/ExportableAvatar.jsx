import React, { useEffect, useState } from "react";

export default function ExportableAvatar({ personId, initials, size = 40 }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setError(false);

    if (personId) {
      // window.avatarAPI.getPath(personId).then((path) => {
      //   if (!path) {
      //     if (isMounted) setError(true);
      //     return;
      //   }

      //   const url = `${path}?t=${Date.now()}`;
      //   console.log("🖼️ avatar path:", url);

      //   const img = new Image();
      //   img.onload = () => {
      //     if (isMounted) setSrc(url);
      //   };
      //   img.onerror = () => {
      //     if (isMounted) setError(true);
      //   };
      //   img.src = url;
      // });
      window.avatarAPI.getPath(personId).then((path) => {
        if (!path) {
          if (isMounted) setError(true);
          return;
        }

        const url = `${path}?t=${Date.now()}`;
        console.log("🖼️ avatar path:", url);
        if (isMounted) setSrc(url);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [personId]);

  const showInitials = !src || error;

  return showInitials ? (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: size * 0.4,
        color: "#000",
        flexShrink: 0,
      }}
    >
      {initials?.slice(0, 2).toUpperCase()}
    </div>
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        flexShrink: 0,
      }}
    />
  );
}
