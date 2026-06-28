import { View, StyleSheet } from "react-native";
import BIcon from "./BIcon";
import IIconSVG from "@/src/interfaces/icon-interface";

const BContainer = ({
   svgs,
   borderColor = 'white'
}: {
   svgs: IIconSVG[] | string[],
   borderColor?: string
}) => {
   return (
      <>
         <View style={ styles.iconButtonsContainer }>
            {
               svgs && svgs?.map((svg: IIconSVG | string, key: number) => (
                  <BIcon svg={ svg } key={key} borderColor={borderColor} />
               ))
            }
         </View>
      </>
   );
}

const styles = StyleSheet.create({
   iconButtonsContainer: {
		flexDirection: 'row',
		gap: 25
	},
});

export default BContainer;
