import { useEffect } from "react";
import { BackHandler } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";

import OutgoingCallView from "@/src/components/calling/OutgoingCallView";
import IncomingCallView from "@/src/components/calling/IncomingCallView";
import ActiveCallView from "@/src/components/calling/ActiveCallView";
import { useCallEngine } from "@/src/hooks/useCallEngine";

const CallScreen = () => {
	const currentUserId = useSelector((state: any) => state.user?._id || state.user?.username || "me");
	const { activeCall, acceptIncomingCall, hangUp, remoteStream } = useCallEngine(currentUserId);

	// No active call (e.g. screen reopened after the call already ended) —
	// nothing to show, so back out immediately.
	useEffect(() => {
		if (!activeCall) {
			router.back();
		}
	}, [activeCall]);

	useEffect(() => {
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			// Swallow the hardware back button while a call is on screen —
			// only the End Call / Decline buttons should be able to leave it.
			return true;
		});
		return () => sub.remove();
	}, []);

	if (!activeCall) return null;

	if (activeCall.status === "active") {
		return <ActiveCallView call={activeCall} onHangUp={hangUp} remoteStream={remoteStream} />;
	}

	if (activeCall.direction === "incoming") {
		return <IncomingCallView call={activeCall} onAccept={acceptIncomingCall} onDecline={hangUp} />;
	}

	return <OutgoingCallView call={activeCall} onHangUp={hangUp} />;
};

export default CallScreen;
