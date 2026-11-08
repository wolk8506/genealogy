import { useCallback, useState } from "react";

// Обвязка колонки годов: группа под текущей прокруткой и режим скраббера.
// Одинакова для обеих галерей — различаются только выбранные в них
// группировки, поэтому режим выводится из groupBy, а не из флага страницы.
export function useGalleryScrubber({ groupBy, groupCounts }) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  const handleRangeChanged = useCallback(
    (range) => {
      let curIdx = 0,
        acc = 0;
      for (let i = 0; i < groupCounts.length; i++) {
        acc += groupCounts[i];
        if (range.startIndex < acc) {
          curIdx = i;
          break;
        }
      }
      setActiveGroupIndex(curIdx);
    },
    [groupCounts],
  );

  const scrubberMode =
    groupBy === "date" || groupBy === "datePhoto" ? "date" : "index";

  return { activeGroupIndex, handleRangeChanged, scrubberMode };
}
