// src/store/searchSlice.js
import { createSlice } from "@reduxjs/toolkit";

const searchSlice = createSlice({
  name: "search",
  initialState: {
    queries: {}, // Инициализируем объект
  },
  reducers: {
    setSearchQuery: (state, action) => {
      // action.payload ДОЛЖЕН БЫТЬ объектом { scope, value }
      const { scope, value } = action.payload;
      if (scope) {
        state.queries[scope] = value;
      }
    },
  },
});

export const { setSearchQuery, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
