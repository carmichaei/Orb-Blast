// src/components/FloatingMenu.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

type Props = {
  visible: boolean;
  onContinue: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const FloatingMenu: React.FC<Props> = ({ visible, onContinue, onRestart, onMainMenu }) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent
    onRequestClose={onContinue}
  >
    <View style={styles.overlay}>
      <View style={styles.menuBox}>
        <Text style={styles.title}>Paused</Text>
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onRestart}>
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onMainMenu}>
          <Text style={styles.buttonText}>Main Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,20,36,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBox: {
    backgroundColor: '#23243a',
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
    color: '#7bffde',
    fontWeight: 'bold',
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#7bffde',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 36,
    marginTop: 14,
    width: 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#23243a',
    fontSize: 19,
    fontWeight: 'bold',
  },
});

export default FloatingMenu;
