// App.tsx
import 'react-native-gesture-handler';  // (ensure this is at top if using gesture-based navigators)
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider } from './src/context/GameContext';

// Import screen components
import TutorialScreen from './src/screens/TutorialScreen';
import MenuScreen from './src/screens/MenuScreen';
import GameScreen from './src/screens/GameScreen';
import ScoresScreen from './src/screens/ScoresScreen';
import ShopScreen from './src/screens/ShopScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Create a Stack Navigator
const Stack = createNativeStackNavigator();

export default function App() {
  // Determine initial route: if tutorial not seen, start with Tutorial, else Menu
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    // Check async storage for tutorial flag
    AsyncStorage.getItem('TUTORIAL_SHOWN').then(shown => {
      setInitialRoute(shown ? 'Menu' : 'Tutorial');
    });
  }, []);

  // While initialRoute is not determined, don't render the navigator (avoid flicker)
  if (!initialRoute) {
    return null; 
  }

  return (
    <GameProvider>
      <NavigationContainer>
        <Stack.Navigator
  initialRouteName={initialRoute}
  screenOptions={{
    headerShown: false,
    gestureEnabled: false, // disables swipe back everywhere
    animation: 'fade',     // or try: 'slide_from_bottom', 'fade_from_bottom', 'none'
  }}
>
          <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Scores" component={ScoresScreen} options={{ headerShown: false, title: 'High Scores' }} />
          <Stack.Screen name="Shop" component={ShopScreen} options={{ headerShown: false, title: 'Shop' }} />
          <Stack.Screen name="GameOver" component={GameOverScreen} options={{ headerShown: false, title: 'Game Over' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
