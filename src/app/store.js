import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "../theme/themeSlice";
import searchReducer from "../store/searchSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    search: searchReducer,
  },
});
