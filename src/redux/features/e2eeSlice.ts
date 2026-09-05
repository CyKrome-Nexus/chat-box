import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IConversationE2eeState {
    sessionEstablished: boolean;
    selfTestPassed: boolean | null;
    verified: boolean;
    safetyNumber?: string;
}

interface E2eeState {
    byConversation: Record<string, IConversationE2eeState>;
}

const initialState: E2eeState = {
    byConversation: {},
};

const findOrInit = (state: E2eeState, conversationId: string): IConversationE2eeState => {
    if (!state.byConversation[conversationId]) {
        state.byConversation[conversationId] = { sessionEstablished: false, selfTestPassed: null, verified: false };
    }
    return state.byConversation[conversationId];
};

export const e2eeSlice = createSlice({
    name: "e2ee",
    initialState,
    reducers: {
        setSessionEstablished: (
            state,
            action: PayloadAction<{ conversationId: string; selfTestPassed: boolean }>
        ) => {
            const entry = findOrInit(state, action.payload.conversationId);
            entry.sessionEstablished = true;
            entry.selfTestPassed = action.payload.selfTestPassed;
        },
        setSafetyNumber: (state, action: PayloadAction<{ conversationId: string; safetyNumber: string }>) => {
            findOrInit(state, action.payload.conversationId).safetyNumber = action.payload.safetyNumber;
        },
        setVerified: (state, action: PayloadAction<{ conversationId: string; verified: boolean }>) => {
            findOrInit(state, action.payload.conversationId).verified = action.payload.verified;
        },
    },
});

export const { setSessionEstablished, setSafetyNumber, setVerified } = e2eeSlice.actions;
export default e2eeSlice.reducer;
