import { createSlice } from "@reduxjs/toolkit";

type user = {
	_id: string;
	name: string;
	username: string;
} | null;

const initialState = null as user;

export const authSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		updateUser: (_state, action): user => action.payload,
	},
});

export const { updateUser } = authSlice.actions;
export default authSlice.reducer;
