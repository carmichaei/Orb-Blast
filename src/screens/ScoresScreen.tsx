import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles, getThemePalette } from '../styles';

/*
  ScoresScreen – Adds light/dark theming while keeping original layout + styles.
*/

const ScoresScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { highScores, theme } = useGame();
  const palette = getThemePalette(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>      
      {/* Top bar */}
      <View style={styles.topRow}>        
        <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
          <Text style={[styles.menuText, { color: palette.header }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.scoreText, { color: palette.header }]}>High Scores</Text>
        <View style={{ width: 24 }} /> {/* Spacer for symmetry */}
      </View>

      {/* Score list */}
      <View style={styles.scoresList}>        
        {(!highScores || highScores.length === 0) ? (
          <Text style={[styles.text, { color: palette.text }]}>No high scores yet</Text>
        ) : (
          highScores.map((entry, i) => (
            <Text
              key={i}
              style={[styles.text, {
                fontWeight: i === 0 ? 'bold' : 'normal',
                fontSize: i === 0 ? 28 : 18,
                marginVertical: 2,
                color: i === 0 ? (palette.sliderTrack ?? '#ffd36e') : palette.text,
              }]}>
              {i + 1}. {entry.score} pts – Level {entry.level}
            </Text>
          ))
        )}
      </View>
    </SafeAreaView>
  );
};

export default ScoresScreen;
