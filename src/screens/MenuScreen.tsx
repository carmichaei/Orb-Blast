// src/screens/MenuScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles as globalStyles, getThemePalette } from '../styles';
import AnimatedOrbBlastTitle from '../components/AnimatedOrbBlastTitle';
import { getHighScores } from '../utils/game';

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    playerPoints, canContinue, setCanContinue,
    setWalls, setOrbs, setLevel, setScore, setTapsUsed,
    setRipples, setBursts, setWallSparks, setLevelUpPending,
    startNewGame,
    setHighScores,
    theme
  } = useGame();

  const palette = getThemePalette(theme);

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
    <View style={[globalStyles.menuScreen, { backgroundColor: palette.background }]}>
      <AnimatedOrbBlastTitle />
      <Text style={{
        color: palette.header,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center'
      }}>
        Points: {playerPoints}
      </Text>

      {canContinue && (
        <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleContinue}>
          <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Continue</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleNewGame}>
        <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>New Game</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleShowScores}>
        <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>High Scores</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={() => navigation.navigate('Settings')}>
        <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={handleOpenShop}>
        <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Shop</Text>
      </TouchableOpacity>

      {/* Credits / external links */}
      <TouchableOpacity onPress={() => Linking.openURL('http://dig.ccmixter.org/files/Kirkoid/68981')}>
        <Text style={[
          globalStyles.credits,
          {
            textDecorationLine: 'underline',
            color: palette.header,
            opacity: 0.95,
            marginTop: 12,
          }
        ]}>
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
          backgroundColor: palette.button + "cc",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 9,
          alignItems: 'center',
          marginRight: 16
        }}
          onPress={() => Linking.openURL('https://venmo.com/u/connorcarmichael')}
        >
          <Text style={{ color: palette.header, fontSize: 17, fontWeight: 'bold' }}>☕ Coffee Tip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MenuScreen;
