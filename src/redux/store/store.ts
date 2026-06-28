import devtoolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/userSlice";


export const store = configureStore({
   reducer: authReducer,
   devTools: false,
   enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(devtoolsEnhancer({ trace: true })),
});