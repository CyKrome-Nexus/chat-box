import { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { IDoodlePath } from "@/src/lib/media/overlayTypes";

export interface DoodleCanvasHandle {
	undo: () => void;
	redo: () => void;
	clear: () => void;
}

/**
 * Freehand drawing layer: only captures touches when `active` (the "draw"
 * tool is selected) so it doesn't block the overlay/pan gestures the rest of
 * the time. Each stroke becomes one SVG path; undo/redo work on the whole
 * finished-stroke stack (not per-point), which matches how most photo
 * editors' doodle undo behaves.
 */
const DoodleCanvas = forwardRef<DoodleCanvasHandle, { active: boolean; color: string; strokeWidth?: number }>(
	({ active, color, strokeWidth = 5 }, ref) => {
		const [paths, setPaths] = useState<IDoodlePath[]>([]);
		const [redoStack, setRedoStack] = useState<IDoodlePath[]>([]);
		const [currentD, setCurrentD] = useState("");

		useImperativeHandle(ref, () => ({
			undo: () => {
				setPaths((prev) => {
					if (prev.length === 0) return prev;
					const next = prev.slice(0, -1);
					setRedoStack((stack) => [...stack, prev[prev.length - 1]]);
					return next;
				});
			},
			redo: () => {
				setRedoStack((prev) => {
					if (prev.length === 0) return prev;
					const next = prev.slice(0, -1);
					setPaths((current) => [...current, prev[prev.length - 1]]);
					return next;
				});
			},
			clear: () => {
				setPaths([]);
				setRedoStack([]);
			},
		}));

		const handleBegin = (x: number, y: number) => setCurrentD(`M${x},${y}`);
		const handleUpdate = (x: number, y: number) => setCurrentD((prev) => `${prev} L${x},${y}`);

		const appendStroke = () => {
			setCurrentD((prev) => {
				if (prev) setPaths((paths) => [...paths, { id: `${Date.now()}-${paths.length}`, d: prev, color }]);
				return "";
			});
			setRedoStack([]);
		};

		const drawGesture = Gesture.Pan()
			.enabled(active)
			.minDistance(0)
			.onBegin((e) => {
				runOnJS(handleBegin)(e.x, e.y);
			})
			.onUpdate((e) => {
				runOnJS(handleUpdate)(e.x, e.y);
			})
			.onEnd(() => {
				runOnJS(appendStroke)();
			});

		return (
			<GestureDetector gesture={drawGesture}>
				<View style={StyleSheet.absoluteFill} pointerEvents={active ? "auto" : "none"}>
					<Svg style={StyleSheet.absoluteFill}>
						{paths.map((path) => (
							<Path
								key={path.id}
								d={path.d}
								stroke={path.color}
								strokeWidth={strokeWidth}
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						))}
						{!!currentD && (
							<Path
								d={currentD}
								stroke={color}
								strokeWidth={strokeWidth}
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						)}
					</Svg>
				</View>
			</GestureDetector>
		);
	}
);

DoodleCanvas.displayName = "DoodleCanvas";

export default DoodleCanvas;
