import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/AuthSlice";
import userReducer from "./slices/UserSlice";
import projectReducer from "./slices/ProjectSlice";
import previewProjectReducer from "./slices/PreviewProjectSlice";
import socialNetworksReducer from "./slices/SocialNetworksSlice";
import adminReducer from "./slices/AdminSlice";
import multimediaReducer from "./slices/MultimediaSlice";
import nasReducer from "./slices/NasSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    project: projectReducer,
    previewProject: previewProjectReducer,
    socialNetworks: socialNetworksReducer,
    admin: adminReducer,
    multimedia: multimediaReducer,
    nas: nasReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
