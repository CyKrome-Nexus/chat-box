import { PropsWithChildren } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

const BBar = ({ children, onPress }: { children: React.ReactNode, onPress: () => any }): React.JSX.Element => {
   return (
      <>
         <TouchableOpacity
            onPress={onPress}
            style={ styles.button }
         >
            { children }
         </TouchableOpacity>
      </>
   );
};

export default BBar;

const styles = StyleSheet.create({
   button: {
      backgroundColor: 'white',
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      width: '95%',
      borderRadius: 18
   }
});