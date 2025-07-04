import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  members: [],
};

const familyTreeSlice = createSlice({
  name: "familyTree",
  initialState,
  reducers: {
    addMember: (state, action) => {
      state.members.push(action.payload);
    },
  },
});

export const { addMember } = familyTreeSlice.actions;
export default familyTreeSlice.reducer;
