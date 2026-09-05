import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IAvatar, ICallRibbon } from "@/src/interfaces/list-interface";
import ECallTypes from "@/src/enums/call-types";

export type TCallMediaType = "audio" | "video";
export type TCallDirection = "outgoing" | "incoming";
export type TCallStatus = "ringing" | "active" | "ended";

export interface IActiveCall {
    id: string;
    contactName: string;
    contactAvatar?: IAvatar;
    type: TCallMediaType;
    direction: TCallDirection;
    status: TCallStatus;
    startedAt: number;
    connectedAt?: number;
}

interface CallState {
    activeCall: IActiveCall | null;
    history: ICallRibbon[];
}

const initialState: CallState = {
    activeCall: null,
    history: [
        {
            id: "seed-1",
            avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
            name: "Aarav Mehta",
            callTime: "Today, 9:30 AM",
            callType: ECallTypes.incoming,
        },
        {
            id: "seed-2",
            avatar: { url: "https://randomuser.me/api/portraits/women/45.jpg" },
            name: "Priya Sharma",
            callTime: "Today, 8:15 AM",
            callType: ECallTypes.outgoing,
        },
        {
            id: "seed-3",
            avatar: { url: "https://randomuser.me/api/portraits/men/27.jpg" },
            name: "Rohan Das",
            callTime: "Yesterday, 10:45 PM",
            callType: ECallTypes.missed,
        },
        {
            id: "seed-4",
            avatar: { url: "https://randomuser.me/api/portraits/women/55.jpg" },
            name: "Neha Kapoor",
            callTime: "Yesterday, 5:20 PM",
            callType: ECallTypes.incoming,
        },
        {
            id: "seed-5",
            avatar: { url: "https://randomuser.me/api/portraits/men/32.jpg" },
            name: "Aditya Rao",
            callTime: "Sunday, 11:00 AM",
            callType: ECallTypes.outgoing,
        },
    ],
};

export const callSlice = createSlice({
    name: "call",
    initialState,
    reducers: {
        startCall: (
            state,
            action: PayloadAction<{
                contactName: string;
                contactAvatar?: IAvatar;
                type: TCallMediaType;
                direction: TCallDirection;
            }>
        ) => {
            state.activeCall = {
                id: `${Date.now()}`,
                status: "ringing",
                startedAt: Date.now(),
                ...action.payload,
            };
        },
        markCallConnected: (state) => {
            if (state.activeCall) {
                state.activeCall.status = "active";
                state.activeCall.connectedAt = Date.now();
            }
        },
        endCall: (state) => {
            if (!state.activeCall) return;

            const { contactName, contactAvatar, direction, connectedAt } = state.activeCall;
            const wasAnswered = !!connectedAt;
            const callType = !wasAnswered && direction === "incoming"
                ? ECallTypes.missed
                : direction === "incoming"
                ? ECallTypes.incoming
                : ECallTypes.outgoing;

            state.history.unshift({
                id: `call-${Date.now()}`,
                name: contactName,
                avatar: contactAvatar || { url: "" },
                callTime: "Just now",
                callType,
            });
            state.activeCall = null;
        },
        clearCallHistory: (state) => {
            state.history = [];
        },
    },
});

export const { startCall, markCallConnected, endCall, clearCallHistory } = callSlice.actions;
export default callSlice.reducer;
