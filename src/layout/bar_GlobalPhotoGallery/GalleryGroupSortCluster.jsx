import React from "react";
import ExpandingGroupSelect from "../../components/ExpandingGroupSelect";
import SortDirToggle from "../../components/SortDirToggle";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { TOOLBAR_CAPSULE } from "../toolbarTokens";

/**
 * Группировка + сортировка в одной стеклянной капсуле (глобальная галерея).
 */
export default function GalleryGroupSortCluster({
  groupBy,
  setGroupBy,
  groupOptions,
  sortDir,
  setSortDir,
}) {
  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      <ExpandingGroupSelect
        nested
        value={groupBy}
        onChange={setGroupBy}
        options={groupOptions}
      />
      <SortDirToggle nested sortDir={sortDir} onChange={setSortDir} />
    </ToolbarButtonGroup>
  );
}
