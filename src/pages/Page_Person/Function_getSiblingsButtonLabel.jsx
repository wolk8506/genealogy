export function getSiblingsButtonLabel(siblings) {
  const brothers = siblings.filter((el) => el.gender === "male").length;
  const sisters = siblings.filter((el) => el.gender === "female").length;

  if (brothers > 0 && sisters > 0) {
    if (brothers === 1 && sisters === 1) return "Показать брата и сестру";
    if (brothers === 1 && sisters > 1) return "Показать брата и сестёр";
    if (brothers > 1 && sisters === 1) return "Показать братьев и сестру";
    return "Показать братьев и сестёр";
  }

  if (brothers > 0) {
    return brothers === 1 ? "Показать брата" : "Показать братьев";
  }

  if (sisters > 0) {
    return sisters === 1 ? "Показать сестру" : "Показать сестёр";
  }

  return "Нет братьев и сестёр";
}

export function getSiblingsModalLabel(siblings) {
  const brothers = siblings.filter((el) => el.gender === "male").length;
  const sisters = siblings.filter((el) => el.gender === "female").length;

  if (brothers > 0 && sisters > 0) {
    if (brothers === 1 && sisters === 1) return "Брат и сестра";
    if (brothers === 1 && sisters > 1) return "Брат и сёстры";
    if (brothers > 1 && sisters === 1) return "Братья и сестра";
    return "Братья и сёстры";
  }

  if (brothers > 0) {
    return brothers === 1 ? "Брат" : "Братья";
  }

  if (sisters > 0) {
    return sisters === 1 ? "Сестра" : "Сёстры";
  }

  return "Нет братьев и сестёр";
}
