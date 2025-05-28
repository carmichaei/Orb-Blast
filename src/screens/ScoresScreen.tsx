// src/screens/ScoresScreen.tsx
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles } from '../styles';

const ScoresScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { highScores } = useGame();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
          <Text style={styles.menuText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.scoreText}>High Scores</Text>
        <View style={{ width: 24 }} /> {/* Spacer for symmetry */}
      </View>

      {/* Score list */}
      <View style={styles.scoresList}>
        {highScores && highScores.length === 0 ? (
          <Text style={styles.text}>No high scores yet</Text>
        ) : (
          highScores.map((entry, i) => (
            <Text
              key={i}
              style={[
                styles.text,
                {
                  fontWeight: i === 0 ? 'bold' : 'normal',
                  fontSize: i === 0 ? 28 : 18,
                  marginVertical: 2,
                  color: i === 0 ? '#ffd36e' : '#fff'
                }
              ]}
            >
              {i + 1}. {entry.score} pts – Level {entry.level}
            </Text>
          ))
        )}
      </View>
    </SafeAreaView>
  );
};

export default ScoresScreen;
