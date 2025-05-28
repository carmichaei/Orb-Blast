import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { styles } from '../styles';

type InlineColorPickerPanelProps = {
  visible: boolean;
  onClose: () => void;
  selectedWallColor: string;
  setSelectedWallColor: (color: string) => void;
  selectedOrbColor: string;
  setSelectedOrbColor: (color: string) => void;
  selectedRippleColor: string;
  setSelectedRippleColor: (color: string) => void;
  wallColors: string[];
  orbColors: string[];
  rippleColors: string[];
};

export default function InlineColorPickerPanel({
  visible,
  onClose,
  selectedWallColor,
  setSelectedWallColor,
  selectedOrbColor,
  setSelectedOrbColor,
  selectedRippleColor,
  setSelectedRippleColor,
  wallColors,
  orbColors,
  rippleColors,
}: InlineColorPickerPanelProps) {
  if (!visible) return null;
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={{
        position: 'absolute',
        top: 120, left: 180, right: 0, bottom: 0,
        zIndex: 99,
      }}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.colorPanel}>
            <Text style={styles.colorPanelTitle}>Walls</Text>
            <View style={styles.colorRow}>
              {wallColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color, borderWidth: selectedWallColor === color ? 3 : 1, borderColor: selectedWallColor === color ? '#7bffde' : '#fff' }
                  ]}
                  onPress={() => setSelectedWallColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <Text style={styles.colorPanelTitle}>Orbs</Text>
            <View style={styles.colorRow}>
              {orbColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color, borderWidth: selectedOrbColor === color ? 3 : 1, borderColor: selectedOrbColor === color ? '#ffd36e' : '#fff' }
                  ]}
                  onPress={() => setSelectedOrbColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <Text style={styles.colorPanelTitle}>Ripples</Text>
            <View style={styles.colorRow}>
              {rippleColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color, borderWidth: selectedRippleColor === color ? 3 : 1, borderColor: selectedRippleColor === color ? '#cdbaff' : '#fff' }
                  ]}
                  onPress={() => setSelectedRippleColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}
