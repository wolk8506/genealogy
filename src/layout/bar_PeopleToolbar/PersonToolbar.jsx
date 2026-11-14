import React from "react";
import { Box, Stack } from "@mui/material";

import BioToolbar from "./bio/BioToolbar";
import PhotoToolbar from "./photo/PhotoToolbar";
import InfoToolbar from "./info/InfoToolbar";
import FileToolbar from "./file/FileToolbar";
import PersonTabCluster from "./PersonTabCluster";

export default function PersonToolbar({
  activeElement,
  setActiveElement,
  infoProps,
  photoProps,
  bioProps,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", width: "100%", flex: 1, minWidth: 0 }}
    >
      <PersonTabCluster
        active={activeElement}
        onChange={setActiveElement}
      />

      {activeElement === "files" && <FileToolbar />}

      {activeElement === "info" && (
        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
          <InfoToolbar
            infoProps={infoProps}
            personRef={infoProps.personPageRef}
          />
        </Box>
      )}

      {activeElement === "photo" && (
        <PhotoToolbar
          search={photoProps.search}
          setSearch={photoProps.setSearch}
          groupBy={photoProps.groupBy}
          setGroupBy={photoProps.setGroupBy}
          sortDir={photoProps.sortDir}
          setSortDir={photoProps.setSortDir}
          onAddPhoto={photoProps.onAddPhoto}
        />
      )}

      {activeElement === "bio" && (
        <BioToolbar
          isEditing={bioProps.isEditing}
          isDirty={bioProps.isDirty}
          requestToggleEdit={bioProps.requestToggleEdit}
          onSave={bioProps.onSave}
          onPrint={bioProps.onPrint}
          onExportPdf={bioProps.onExportPdf}
          execRef={bioProps.execRef}
          isNavVisible={bioProps.isNavVisible}
          onToggleNav={bioProps.onToggleNav}
          searchQuery={bioProps.searchQuery}
          onSearchQueryChange={bioProps.onSearchQueryChange}
          searchMatchIndex={bioProps.searchMatchIndex}
          onSearchMatchIndexChange={bioProps.onSearchMatchIndexChange}
          searchMatchCount={bioProps.searchMatchCount}
        />
      )}
    </Stack>
  );
}
