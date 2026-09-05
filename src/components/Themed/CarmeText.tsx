import { Text, StyleSheet, StyleProp, TextStyle, TextProps } from 'react-native'


type CustomTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
};

const CarmeText = (props: CustomTextProps) => {
   return (
      <Text {...props} style={[styles.defaultFont, props.style]}>{props.children}</Text>
   )
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: 'Carme Regular',
  },
});

export default CarmeText;
