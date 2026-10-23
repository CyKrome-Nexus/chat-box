import { useEffect } from "react";
import { BackHandler } from "react-native";
import { router } from "expo-router";

import ActiveCallView from "@/src/components/calling/ActiveCallView";
import GroupCallView from "@/src/components/calling/GroupCallView";
import IncomingCallView from "@/src/components/calling/IncomingCallView";
import { useCallAudioRouting } from "@/src/hooks/useCallAudioRouting";
import { useCallEngine } from "@/src/hooks/useCallEngine";

const CallScreen = () => {
	const { activeCall, localStream, remoteStreams, accept, decline } = useCallEngine();
	useCallAudioRouting(Boolean(activeCall && activeCall.status !== "ended" && activeCall.status !== "ringing"), activeCall?.type === "video");

	useEffect(() => {
		if (!activeCall && router.canGoBack()) router.back();
	}, [activeCall]);

	useEffect(() => {
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
			router.back();
			return true;
		});
		return () => subscription.remove();
	}, []);

	if (!activeCall) return null;

	if (activeCall.direction === "incoming" && activeCall.status === "ringing") {
		return <IncomingCallView call={activeCall} onAccept={() => void accept()} onDecline={decline} />;
	}

	if (activeCall.isGroup) return <GroupCallView call={activeCall} localStream={localStream} remoteStreams={remoteStreams} />;

	const remote = remoteStreams.values().next().value ?? null;
	return <ActiveCallView call={activeCall} localStream={localStream} remoteStream={remote} />;
};

export default CallScreen;
