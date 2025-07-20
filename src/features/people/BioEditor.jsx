import React from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";

export default function BioEditor({ personId, value, onChange }) {
  const insertImageCommand = {
    name: "insert-image",
    keyCommand: "insert-image",
    buttonProps: { "aria-label": "Вставить изображение" },
    icon: (
      <svg width="12" height="12" viewBox="0 0 20 20">
        <path
          fill="currentColor"
          d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4zm0 2h12v6l-3-3-4 4-2-2-3 3V5z"
        />
      </svg>
    ),
    execute: async (state, api) => {
      const filename = await window.bioAPI.addImage(personId);
      if (filename) {
        const markdown = `![описание](${filename})`; // ✅ относительный путь
        api.replaceSelection(markdown);
      }
    },
  };

  return (
    <MDEditor
      value={value}
      onChange={onChange}
      height={400}
      preview="edit" // только редактор, без предпросмотра
      commands={[
        commands.title,
        commands.bold,
        commands.italic,
        commands.strikethrough,
        commands.hr,
        commands.link,
        commands.quote,
        commands.code,
        commands.codeBlock,
        commands.unorderedListCommand,
        commands.orderedListCommand,
        insertImageCommand,
        commands.checkedListCommand,
        commands.divider,
      ]}
    />
  );
}
