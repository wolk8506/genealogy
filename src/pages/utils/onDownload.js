async function onDownload(photo) {
  //   console.log(ttt);
  try {
    const url =
      photo &&
      window.photoAPI &&
      (await window.photoAPI.getPath(photo.owner, photo.filename));
    if (!url) throw new Error("no url");
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = url.split(".").pop().split("?")[0];
    const name = photo.filename || `${photo.id}.${ext}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch {
    alert("Не удалось скачать");
  }
}

export default onDownload;
