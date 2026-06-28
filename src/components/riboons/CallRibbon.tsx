import {
	StyleSheet,
	View,
	Text,
	Dimensions,
} from "react-native";
import Animated from "react-native-reanimated";
import { TouchableOpacity } from "react-native-gesture-handler";

import BIcon from "../buttons/BIcon";
import {
	camera,
	incomingCall,
	missedCall,
	outgoingCall,
	phone,
} from "@/src/constants/svgs/icons";
import Avatar from "../images/Avatar";
import { ICallRibbon } from "@/src/interfaces/list-interface";
import IconSVG from "../images/IconSVG";
import ECallTypes from "@/src/enums/call-types";
import IIconSVG from "@/src/interfaces/icon-interface";

const BUTTON_WIDTH = Dimensions.get("window").width * 0.3;

const CallRibbon = ({ content }: { content: ICallRibbon }) => {
	var svg: IIconSVG;
	switch (content?.callType) {
		case ECallTypes.incoming:
			console.log(ECallTypes.incoming);
			console.log(`${content?.callType}\n`);
			svg = incomingCall;
			break;
		case ECallTypes.outgoing:
			console.log(ECallTypes.outgoing);
			console.log(`${content?.callType}\n`);
			svg = outgoingCall;
			break;
		case ECallTypes.missed:
			console.log(ECallTypes.missed);
			console.log(`${content?.callType}\n`);
			svg = missedCall;
			break;
		default:
			console.log("default");
			svg = incomingCall;
			break;
	}
	return (
		<View style={styles.row}>
			{/* Swipeable ribbon content */}
			<Animated.View style={[styles.ribbon]}>
				<TouchableOpacity style={styles.container}>
					<View style={styles.content}>
						<Avatar data={content?.avatar} isWhite={true} />
						<View style={styles.mainContent}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{content?.name}
							</Text>
							<View style={styles.callStatusContainer}>
								<IconSVG svg={svg} height={14} width={14} customStyles={{ padding: 0, marginRight: 5 }} />
								<Text style={{ fontSize: 12, color: "#797C7B" }}>
									{content?.callTime}
								</Text>
							</View>
						</View>
					</View>
					<View style={styles.buttonsContainer}>
						<BIcon
							svg={phone}
							width={26}
							height={26}
							iconHeight={26}
							iconWidth={26}
						/>
						<BIcon
							svg={camera}
							width={26}
							height={26}
							iconHeight={26}
							iconWidth={26}
						/>
					</View>
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		width: "100%",
		position: "relative",
		height: 80,
		marginBottom: 4,
		overflow: "hidden",
	},
	hiddenButtons: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		flexDirection: "row",
		height: "100%",
		width: BUTTON_WIDTH,
		justifyContent: "space-evenly",
		alignItems: "center",
		zIndex: 1,
	},
	ribbon: {
		width: "100%",
		height: "100%",
		zIndex: 2,
		backgroundColor: "white",
	},
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		height: 80,
		paddingVertical: 10,
		// paddingHorizontal: 20,  // This is handled in ListDrawer Component Itself
		gap: 5,
	},
	content: {
		gap: 10,
		flex: 0.8,
		flexDirection: "row",
		overflow: "hidden",
	},
	mainContent: {
		justifyContent: "center",
		flex: 1,
		gap: 1,
	},
	callStatusContainer: {
		marginTop: 1,
		height: "auto",
		flexDirection: "row",
		alignItems: "center",
	},
	buttonsContainer: {
		flex: 0.3,
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		alignItems: "center",
		height: "100%",
		gap: 10,
		paddingBottom: 2,
	},
});

export default CallRibbon;
