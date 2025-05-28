// src/screens/MenuScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles } from '../styles';
import AnimatedOrbBlastTitle from '../components/AnimatedOrbBlastTitle';
import { getHighScores } from '../utils/game'; // <-- ADD THIS IMPORT

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    playerPoints, canContinue, setCanContinue,
    setWalls, setOrbs, setLevel, setScore, setTapsUsed,
    setRipples, setBursts, setWallSparks, setLevelUpPending,
    startNewGame, 
    setHighScores
  } = useGame();

  const handleContinue = () => {
    navigation.navigate('Game');
  };

  const handleNewGame = () => {
    startNewGame();
    navigation.navigate('Game');
  };

  const handleShowScores = async () => {
    const scores = await getHighScores();
    setHighScores(scores);
    navigation.navigate('Scores');
  };

  const handleOpenShop = () => {
    navigation.navigate('Shop');
  };

  return (
    <View style={styles.menuScreen}>
      <AnimatedOrbBlastTitle />
      <Text style={{
        color: '#ffd36e',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center'
      }}>
        Points: {playerPoints}
      </Text>

      {canContinue && (
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={handleNewGame}>
        <Text style={styles.buttonText}>New Game</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleShowScores}>
        <Text style={styles.buttonText}>High Scores</Text>
      </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleOpenShop}>
        <Text style={styles.buttonText}>Shop</Text>
      </TouchableOpacity>

      {/* Credits / external links */}
      <TouchableOpacity onPress={() => Linking.openURL('http://dig.ccmixter.org/files/Kirkoid/68981')}>
        <Text style={[styles.credits, { textDecorationLine: 'underline', color: '#7bffde' }]}>
          ♫ "Slow Down" by Kirkoid
        </Text>
      </TouchableOpacity>
      {/* Footer buttons: Coffee tip & music mute */}
      <View style={{
        position: 'absolute',
        left: 18,
        bottom: 36,
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        <TouchableOpacity style={{
          backgroundColor: "#23243acc",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 9,
          alignItems: 'center',
          marginRight: 16
        }}
          onPress={() => Linking.openURL('https://venmo.com/u/connorcarmichael')}
        >
          <Text style={{ color: '#7bffde', fontSize: 17, fontWeight: 'bold' }}>☕ Coffee Tip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MenuScreen;
