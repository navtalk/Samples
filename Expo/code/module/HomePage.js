import { View, Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen({ navigation }){

   function clickGoToButton(){
      console.log("Go To NavTalk");
      navigation.navigate('Chat');
   }

    return(
        <View style={{flex: 1, backgroundColor:"#FFFFFF",alignContent:"center",justifyContent:"center"}}>
            <Text  style={{textAlign:"center",color:"#000000",fontSize:20}} onPress={clickGoToButton}> Go To NavTalk </Text>
        </View>
    );
}