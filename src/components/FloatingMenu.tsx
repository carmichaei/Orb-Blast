import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useGame } from '../context/GameContext';
import { getThemePalette, styles as globalStyles } from '../styles';

/*
  FloatingMenu (pause screen)
  ─────────────────────────
  • Overlay + menu box colours respond to current theme.
  • Button styling re‑uses global palette for consistency.
*/

type Props = {
  visible: boolean;
  onContinue: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const FloatingMenu: React.FC<Props> = ({ visible, onContinue, onRestart, onMainMenu }) => {
  const { theme } = useGame();
  const palette = getThemePalette(theme);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <View style={[s.overlay, { backgroundColor: theme === 'dark' ? 'rgba(15,20,36,0.93)' : 'rgba(250,250,255,0.93)' }]}>        
        <View style={[s.menuBox, { backgroundColor: palette.panel }]}>          
          <Text style={[s.title, { color: palette.header }]}>Paused</Text>

          <TouchableOpacity style={[s.button, { backgroundColor: palette.button }]} onPress={onContinue}>
            <Text style={[s.buttonText, { color: palette.buttonText }]}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.button, { backgroundColor: palette.button }]} onPress={onRestart}>
            <Text style={[s.buttonText, { color: palette.buttonText }]}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.button, { backgroundColor: palette.button }]} onPress={onMainMenu}>
            <Text style={[s.buttonText, { color: palette.buttonText }]}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Styles (theme agnostic base) ─────────────────────────────────────────*/
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBox: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 270,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.19,
    shadowRadius: 8,
    elevation: 9,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 28,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 36,
    marginTop: 14,
    width: 180,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 19,
    fontWeight: 'bold',
  },
});

export default FloatingMenu;
