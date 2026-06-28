import { Dispatch } from "redux"
import { router } from "expo-router"

import { updateUser } from "../redux/features/userSlice"


export const logoutUser = (dispatch: Dispatch) => {
    dispatch(updateUser(null));
    router.replace('/');
}