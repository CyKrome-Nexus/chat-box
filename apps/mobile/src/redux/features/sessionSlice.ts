import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type TSessionStatus = "loading" | "ready";

const initialState: { status: TSessionStatus } = { status: "loading" };

export const sessionSlice = createSlice({
    name: "session",
    initialState,
    reducers: {
        setSessionStatus: (state, action: PayloadAction<TSessionStatus>) => {
            state.status = action.payload;
        },
    },
});

export const { setSessionStatus } = sessionSlice.actions;
export default sessionSlice.reducer;
