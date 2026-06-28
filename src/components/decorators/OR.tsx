import { View, Text } from 'react-native'

import { styles as GlobalStyles } from '@/src/constants/styles';


const OR = ({ barColor = 'black' }: {barColor?: string}) => {
   return (
      <>
         <View style={{ flexDirection: 'row', margin: 20 }}>
            <View style={ [GlobalStyles.separator, {backgroundColor: barColor}] } />
            <Text style={{ color: '#B4BCB9', paddingHorizontal: 10 }}> OR </Text>
            <View style={ [GlobalStyles.separator, {backgroundColor: barColor}] } />
         </View>
      </>
   );
};

export default OR;