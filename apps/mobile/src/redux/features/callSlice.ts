import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { CallLog } from "@chatbox/shared";

import type { IAvatar } from "@/src/interfaces/list-interface";

export type TCallMediaType = "audio" | "video";
export type TCallDirection = "outgoing" | "incoming";
export type TCallStatus = "ringing" | "connecting" | "active" | "ended";

export interface ICallParticipant {
    id: string;
    name: string;
    avatar?: IAvatar;
    audioMuted?: boolean;
    videoEnabled?: boolean;
    joined?: boolean;
}

export interface IActiveCall {
    id: string;
    conversationId: string;
    contactName: string;
    contactAvatar?: IAvatar;
    isGroup: boolean;
    type: TCallMediaType;
    direction: TCallDirection;
    status: TCallStatus;
    participants: ICallParticipant[];
    startedAt: number;
    connectedAt?: number;
    endReason?: "ended" | "declined" | "busy" | "missed" | "failed";
}

interface CallState {
    activeCall: IActiveCall | null;
    history: CallLog[];
}

const initialState: CallState = {
    activeCall: null,
    history: [],
};

export const callSlice = createSlice({
    name: "call",
    initialState,
    reducers: {
        startCall: (state, action: PayloadAction<Omit<IActiveCall, "status" | "startedAt">>) => {
            state.activeCall = { ...action.payload, status: "ringing", startedAt: Date.now() };
        },
        setCallId: (state, action: PayloadAction<string>) => {
            if (state.activeCall) state.activeCall.id = action.payload;
        },
        setCallStatus: (state, action: PayloadAction<TCallStatus>) => {
            if (!state.activeCall) return;
            state.activeCall.status = action.payload;
            if (action.payload === "active" && !state.activeCall.connectedAt) state.activeCall.connectedAt = Date.now();
        },
        markCallConnected: (state) => {
            if (!state.activeCall) return;
            state.activeCall.status = "active";
            state.activeCall.connectedAt ??= Date.now();
        },
        updateParticipant: (state, action: PayloadAction<Partial<ICallParticipant> & { id: string }>) => {
            const participant = state.activeCall?.participants.find((item) => item.id === action.payload.id);
            if (participant) Object.assign(participant, action.payload);
        },
        endCall: (state, action: PayloadAction<IActiveCall["endReason"] | undefined>) => {
            if (!state.activeCall) return;
            state.activeCall.status = "ended";
            state.activeCall.endReason = action.payload ?? "ended";
        },
        clearActiveCall: (state) => {
            state.activeCall = null;
        },
        hydrateCallHistory: (state, action: PayloadAction<CallLog[]>) => {
            state.history = action.payload;
        },
        clearCallHistory: (state) => {
            state.history = [];
        },
    },
});

export const {
    startCall,
    setCallId,
    setCallStatus,
    markCallConnected,
    updateParticipant,
    endCall,
    clearActiveCall,
    hydrateCallHistory,
    clearCallHistory,
} = callSlice.actions;
export default callSlice.reducer;
