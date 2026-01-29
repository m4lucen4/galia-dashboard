import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/AuthSlice";
import userReducer from "./slices/UserSlice";
import projectReducer from "./slices/ProjectSlice";
import previewProjectReducer from "./slices/PreviewProjectSlice";
import socialNetworksReducer from "./slices/SocialNetworksSlice";
import adminReducer from "./slices/AdminSlice";
import multimediaReducer from "./slices/MultimediaSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    project: projectReducer,
    previewProject: previewProjectReducer,
    socialNetworks: socialNetworksReducer,
    admin: adminReducer,
    multimedia: multimediaReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
