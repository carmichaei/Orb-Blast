import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Share, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles as globalStyles, getThemePalette } from '../styles';

/*
  GameOverScreen – banks points and saves high‑scores exactly once, with theme support.
*/

const GameOverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // pull everything in one call
  const {
    startNewGame,
    setCanContinue,
    setPlayerPoints,
    playerPoints,
    gameOverAnim,
    theme,
    saveHighScoreAndUpdate, // provided by context
  } = useGame();

  const palette = getThemePalette(theme);

  /* params from GameScreen (defensive Number conversion) */
  const score = Number(route.params?.score ?? 0);
  const level = Number(route.params?.level ?? 1);

  /* run‑once ref */
  const hasProcessed = useRef(false);
  const [bankedPoints, setBankedPoints] = useState(playerPoints);

  useEffect(() => {
    if (hasProcessed.current) return;

    // 1. save high‑score (persist + update context)
    if (score > 0) saveHighScoreAndUpdate(score, level);

    // 2. bank points
    const newPts = playerPoints + score;
    setPlayerPoints(newPts);
    setBankedPoints(newPts);

    hasProcessed.current = true;
  }, [saveHighScoreAndUpdate, playerPoints, score, level, setPlayerPoints]);

  /* title pop‑in */
  useEffect(() => {
    gameOverAnim.setValue(0);
    Animated.timing(gameOverAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [gameOverAnim]);

  /* navigation handlers */
  const handleMainMenu = () => {
    setCanContinue(false);
    navigation.reset({ index: 0, routes: [{ name: 'Menu' }] });
  };
  const handleRestart = () => {
    startNewGame();
    navigation.reset({ index: 0, routes: [{ name: 'Game' }] });
  };
  const handleShare = () => {
    Share.share({ message: `I scored ${score} points at level ${level} in Orb Blast! Can you beat me?` });
  };

  /* UI */
  return (
    <View style={[s.screen, { backgroundColor: palette.background }]}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: gameOverAnim,
          transform: [{ scale: gameOverAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        <Text style={[s.title, { color: palette.header, textShadowColor: palette.header }]}>Game Over</Text>
        <Text style={[s.text, { color: palette.text }]}>Score: {score}   |   Level: {level}</Text>
        <Text style={[s.text, { color: palette.header, fontSize: 19 }]}>Total Points: {bankedPoints}</Text>

        <View style={s.buttons}>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleMainMenu}>
            <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Main Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleRestart}>
            <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleShare}>
            <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

/* base styles */
const s = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 46,
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 2,
    fontFamily: 'System',
    textShadowRadius: 25,
  },
  text: {
    fontSize: 22,
    marginBottom: 18,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 16,
  },
});

export default GameOverScreen;
