import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useGame } from '../context/GameContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { styles as globalStyles } from '../styles'; // <-- IMPORTANT

const SettingsScreen: React.FC = () => {
  const {
    soundVolume, setSoundVolume,
    musicVolume, setMusicVolume,
  } = useGame();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={localStyles.container}>
      <Text style={localStyles.header}>Settings</Text>
      <View style={localStyles.settingBlock}>
        <Text style={localStyles.label}>Game Sound</Text>
        <Slider
          style={localStyles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={soundVolume}
          onValueChange={setSoundVolume}
          minimumTrackTintColor="#7bffde"
          maximumTrackTintColor="#555"
        />
        <Text style={localStyles.valueLabel}>{Math.round(soundVolume * 100)}%</Text>
      </View>
      <View style={localStyles.settingBlock}>
        <Text style={localStyles.label}>Music</Text>
        <Slider
          style={localStyles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={musicVolume}
          onValueChange={setMusicVolume}
          minimumTrackTintColor="#ffd36e"
          maximumTrackTintColor="#555"
        />
        <Text style={localStyles.valueLabel}>{Math.round(musicVolume * 100)}%</Text>
      </View>
      {/* USE GLOBAL BUTTON STYLE */}
      <TouchableOpacity style={globalStyles.button} onPress={() => navigation.navigate('Menu')}>
        <Text style={globalStyles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#23243a", justifyContent: 'center', alignItems: 'center', padding: 16 },
  header: { color: "#fff", fontSize: 32, fontWeight: "bold", marginBottom: 24 },
  settingBlock: { width: "90%", marginBottom: 32, alignItems: 'center' },
  label: { color: "#7bffde", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  slider: { width: "100%", height: 40 },
  valueLabel: { color: "#fff", fontSize: 16, marginTop: 4 },
});

export default SettingsScreen;
