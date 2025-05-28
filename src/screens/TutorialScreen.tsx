// src/screens/TutorialScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, StackActions } from '@react-navigation/native';
import { styles } from '../styles';

const TutorialScreen: React.FC = () => {
  const navigation = useNavigation();

  const finishTutorial = async () => {
    try {
      await AsyncStorage.setItem('TUTORIAL_SHOWN', 'yes');
      navigation.dispatch(StackActions.replace('Menu'));
    } catch (e) {
      // If there's a storage error, just navigate anyway
      navigation.dispatch(StackActions.replace('Menu'));
    }
  };

  return (
    <View style={styles.tutorialScreen}>
      <Text style={styles.tutorialTitle}>Welcome to Orb Blast!</Text>
      <Text style={styles.tutorialText}>
        - Tap anywhere to launch a blast{"\n"}
        - The blast collects orbs, but stops at walls{"\n"}
        - You only get 3 taps per level{"\n"}
        - Collect all orbs to win!
      </Text>
      <TouchableOpacity style={styles.button} onPress={finishTutorial}>
        <Text style={styles.buttonText}>Got it!</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TutorialScreen;
