import React, { useRef } from "react";
import Draggable from "react-draggable";
import { Paper } from "@mui/material";

function DraggableDialog(props) {
  // 1. Создаем ссылку на узел
  const nodeRef = useRef(null);

  return (
    // 2. Передаем nodeRef в Draggable
    <Draggable
      nodeRef={nodeRef}
      handle="#draggable-header"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      {/* 3. Обязательно передаем ту же ссылку в Paper через проп nodeRef или ref */}
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  );
}

export default DraggableDialog;
