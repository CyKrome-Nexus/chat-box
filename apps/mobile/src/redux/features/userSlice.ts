import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { IUser } from "@/src/interfaces/user-interface";

export const authSlice = createSlice({
	name: "user",
	initialState: null as IUser | null,
	reducers: {
		updateUser: (_state, action: PayloadAction<IUser | null>) => action.payload,
	},
});

export const { updateUser } = authSlice.actions;
export default authSlice.reducer;
