import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/AuthSlice";
import userReducer from "./slices/UserSlice";
import projectReducer from "./slices/ProjectSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    project: projectReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
