import devtoolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/userSlice";
import messagesReducer from "../features/messagesSlice";
import connectionReducer from "../features/connectionSlice";
import chatsReducer from "../features/chatsSlice";
import sessionReducer from "../features/sessionSlice";
import contactsReducer from "../features/contactsSlice";
import callReducer from "../features/callSlice";
import settingsReducer from "../features/settingsSlice";
import { persistenceMiddleware } from "../middleware/persistenceMiddleware";

const rootReducer = combineReducers({
   user: authReducer,
   messages: messagesReducer,
   connection: connectionReducer,
   chats: chatsReducer,
   session: sessionReducer,
   contacts: contactsReducer,
   call: callReducer,
   settings: settingsReducer,
});

export const store = configureStore({
   reducer: rootReducer,
   devTools: false,
   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
   enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(devtoolsEnhancer({ trace: true })),
});

export type RootState = ReturnType<typeof rootReducer>;