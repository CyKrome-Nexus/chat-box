import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native'
import { TextProps } from 'react-native-svg';


type CustomTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
};

const CarmeText = (props: CustomTextProps) => {
   return (
      <Text{...props} style={[styles.defaultFont, props.style]}> { props.children } </Text>
   )
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: 'Carme Regular',
  },
});

export default CarmeText;
