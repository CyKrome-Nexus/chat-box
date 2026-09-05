import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getSession, saveSession, clearSession } from "@/src/lib/auth/session";
import { updateUser } from "@/src/redux/features/userSlice";
import { setSessionStatus } from "@/src/redux/features/sessionSlice";

/**
 * Hydrates Redux from persisted storage on startup, then keeps storage in
 * sync with every subsequent login/logout. Mount once near the app root —
 * `state.session.status` gates routing/splash until hydration finishes so
 * an already-logged-in user never flashes the login screen.
 */
export const useSessionPersistence = () => {
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.user);
    const status = useSelector((state: any) => state.session.status);

    useEffect(() => {
        (async () => {
            const session = await getSession();
            if (session) dispatch(updateUser(session));
            dispatch(setSessionStatus("ready"));
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status !== "ready") return;
        if (user) {
            saveSession(user);
        } else {
            clearSession();
        }
    }, [user, status]);
};
