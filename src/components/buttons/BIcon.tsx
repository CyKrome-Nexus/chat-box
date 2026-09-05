import { PropsWithChildren } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import IconSVG from "../images/IconSVG";
import IIconSVG from "@/src/interfaces/icon-interface";
import { facebook } from "@/src/constants/svgs/logos";

type TBIcon = {
  children?: React.ReactNode;
  svg?: IIconSVG | string;
  onPress?: () => any;
  width?: number;
  height?: number;
  iconWidth?: number;
  iconHeight?: number;
  borderColor?: string;
  style?: object;
};

const BIcon = ({
  children,
  svg = facebook,
  onPress,
  width = 50,
  height = 50,
  iconWidth = 30,
  iconHeight = 30,
  borderColor = "white",
  style = {},
}: TBIcon) => {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={[
          {
            borderRadius: width / 2,
            borderWidth: 1,
            borderColor,
            justifyContent: "center",
            alignItems: "center",
            width,
            height,
          },
          style,
        ]}
      >
        {children ? (
          children
        ) : (
          <IconSVG
            svg={svg}
            includeBorder={false}
            height={iconHeight}
            width={iconWidth}
          />
        )}
      </TouchableOpacity>
    </>
  );
};

export default BIcon;

const styles = StyleSheet.create({});
