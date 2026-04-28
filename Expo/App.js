import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./code/module/HomePage";
import ChatScreen from "./code/module/ChatPage";
import { RootSiblingParent } from 'react-native-root-siblings';

const Stack = createStackNavigator();

export default function App() {
  return (
    <RootSiblingParent>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Home" component={HomeScreen} options={{title:"Home Page"}} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{title:"Chat Page"}} />
      </Stack.Navigator>
    </NavigationContainer>
    </RootSiblingParent>
  );
}


