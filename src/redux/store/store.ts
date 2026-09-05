import devtoolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/userSlice";
import messagesReducer from "../features/messagesSlice";
import connectionReducer from "../features/connectionSlice";
import chatsReducer from "../features/chatsSlice";
import sessionReducer from "../features/sessionSlice";
import contactsReducer from "../features/contactsSlice";

const rootReducer = combineReducers({
   user: authReducer,
   messages: messagesReducer,
   connection: connectionReducer,
   chats: chatsReducer,
   session: sessionReducer,
   contacts: contactsReducer,
});

export const store = configureStore({
   reducer: rootReducer,
   devTools: false,
   enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(devtoolsEnhancer({ trace: true })),
});

export type RootState = ReturnType<typeof rootReducer>;