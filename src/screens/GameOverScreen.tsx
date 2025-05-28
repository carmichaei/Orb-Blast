// src/screens/GameOverScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles } from '../styles';

const GameOverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const game = useGame();
  const {
    score, level, gameOverAnim,
    startNewGame, setCanContinue
  } = game;

  // Animate the Game Over title in on mount
  useEffect(() => {
    gameOverAnim.setValue(0); // Reset animation for re-entry
    Animated.timing(gameOverAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, [gameOverAnim]);

  const handleMainMenu = () => {
    setCanContinue(false);
    navigation.reset({ index: 0, routes: [{ name: 'Menu' }] });
  };

  const handleRestart = () => {
  startNewGame();
  navigation.reset({ index: 0, routes: [{ name: 'Game' }] });
};


  const handleShare = () => {
    const message = `I scored ${score} points at level ${level} in Orb Blast! Can you beat me?`;
    // Uncomment and implement share logic with Share API if needed.
    // Share.share({ message });
  };

  return (
    <View style={styles.gameOverScreen}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: gameOverAnim,
          transform: [
            {
              scale: gameOverAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1]
              })
            }
          ]
        }}
      >
        <Text style={styles.gameOverTitle}>Game Over</Text>
        <Text style={styles.gameOverText}>Score: {score}   |   Level: {level}</Text>
        <View style={styles.gameOverButtons}>
          <TouchableOpacity style={styles.button} onPress={handleMainMenu}>
            <Text style={styles.buttonText}>Main Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRestart}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleShare}>
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default GameOverScreen;
