import React from "react";
import AvatarEditorDialog from "../../pages/Page_Person/AvatarEditorDialog";

export default function ExternalAvatarEditorDialog({
  entityId,
  ...props
}) {
  return (
    <AvatarEditorDialog
      {...props}
      personId={entityId}
      api={window.externalAPI?.avatar}
    />
  );
}
