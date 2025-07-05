// import React from "react";
// import "./ImportDecisionModal.css";

// export const ImportDecisionModal = ({ open, summary, onSelect }) => {
//   if (!open) return null;

//   return (
//     <div className="modal-backdrop">
//       <div className="modal">
//         <h2>Импорт архива</h2>
//         <pre className="summary">{summary}</pre>
//         <div className="buttons">
//           <button onClick={() => onSelect("all")}>✅ Обновить всех</button>
//           <button onClick={() => onSelect("new")}>➕ Только новых</button>
//           <button onClick={() => onSelect("cancel")}>❌ Отменить</button>
//         </div>
//       </div>
//     </div>
//   );
// };
import React from "react";
import "./ImportDecisionModal.css";

export const ImportDecisionModal = ({
  open,
  summary,
  toAdd,
  toUpdate,
  onSelect,
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Импорт архива</h2>

        <div className="modal-section">
          <strong>➕ Новые ({toAdd.length}):</strong>
          <div className="id-list">{toAdd.map((p) => p.id).join(", ")}</div>
        </div>

        <div className="modal-section">
          <strong>🔄 Обновить ({toUpdate.length}):</strong>
          <div className="id-list">{toUpdate.map((p) => p.id).join(", ")}</div>
        </div>

        <div className="modal-summary">
          <pre>{summary}</pre>
        </div>

        <div className="buttons">
          <button onClick={() => onSelect("all")}>✅ Обновить всех</button>
          <button onClick={() => onSelect("new")}>➕ Только новых</button>
          <button onClick={() => onSelect("cancel")}>❌ Отменить</button>
        </div>
      </div>
    </div>
  );
};
