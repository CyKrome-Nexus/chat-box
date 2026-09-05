import devtoolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/userSlice";
import messagesReducer from "../features/messagesSlice";
import connectionReducer from "../features/connectionSlice";

const rootReducer = combineReducers({
   user: authReducer,
   messages: messagesReducer,
   connection: connectionReducer,
});

export const store = configureStore({
   reducer: rootReducer,
   devTools: false,
   enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(devtoolsEnhancer({ trace: true })),
});

export type RootState = ReturnType<typeof rootReducer>;