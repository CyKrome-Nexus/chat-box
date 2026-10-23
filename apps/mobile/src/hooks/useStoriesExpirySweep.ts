import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { purgeExpiredStories } from "@/src/redux/features/storiesSlice";

const SWEEP_INTERVAL_MS = 30 * 1000;

/** Auto-expires status updates 24h after posting — see docs/architecture/stories.md. */
export const useStoriesExpirySweep = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(purgeExpiredStories());
        const interval = setInterval(() => dispatch(purgeExpiredStories()), SWEEP_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [dispatch]);
};
