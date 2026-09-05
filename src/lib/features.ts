import { Dispatch } from "redux"
import { router } from "expo-router"

import { updateUser } from "../redux/features/userSlice"
import { clearSession } from "./auth/session"


export const logoutUser = (dispatch: Dispatch) => {
    dispatch(updateUser(null));
    clearSession();
    router.replace('/');
}