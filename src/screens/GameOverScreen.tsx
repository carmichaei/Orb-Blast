// src/screens/GameOverScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Share } from 'react-native';
import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles } from '../styles';

const GameOverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { startNewGame, setCanContinue, setPlayerPoints, playerPoints, gameOverAnim } = useGame();

  // Use score/level from params or fallback to context
  const score = route.params?.score ?? 0;
  const level = route.params?.level ?? 1;

  // Bank score only once
  const hasBanked = useRef(false);
  const [bankedPoints, setBankedPoints] = useState(playerPoints);

  useEffect(() => {
  if (!hasBanked.current) {
    const newPoints = playerPoints + score;
    setPlayerPoints(newPoints);
    setBankedPoints(newPoints); // Always show the true bank after update
    hasBanked.current = true;
  }
  }, [score, setPlayerPoints, playerPoints]);

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
    Share.share({ message });
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
        <Text style={styles.gameOverText}>Total Points: {bankedPoints}</Text>
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
