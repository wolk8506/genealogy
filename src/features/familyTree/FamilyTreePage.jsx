import React from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { addMember } from "./familyTreeSlice";
import { Button, Typography } from "@mui/material";
// import moment from "moment";

export default function FamilyTreePage() {
  // const members = useSelector((state) => state.familyTree.members);
  // const dispatch = useDispatch();

  return (
    <div>
      <Typography variant="h4">Семейное дерево</Typography>
      {/* <Button
        variant="contained"
        onClick={() =>
          dispatch(
            addMember({
              name: "Новый родственник",
              // date: moment().format("LL"),
            })
          )
        }
      >
        Добавить
      </Button>
      <ul>
        {members.map((m, i) => (
          <li key={i}>
            {m.name} — {m.date}
          </li>
        ))}
      </ul> */}
    </div>
  );
}
