import { createSlice } from "@reduxjs/toolkit";

type user = {
	_id: string;
	name: string;
	username: string;
};

const initialState: { user?: user } = {};

export const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		updateUser: (state, action): void => {
			state.user = action.payload;
		},
	},
});

export const { updateUser } = authSlice.actions;
export default authSlice.reducer;
