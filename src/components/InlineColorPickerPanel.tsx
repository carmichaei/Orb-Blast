import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { WALL_COLORS, ORB_COLORS, RIPPLE_COLORS } from '../constants';
import { styles } from '../styles';
import { InlineColorPickerPanelProps } from '../types';

export default function InlineColorPickerPanel({
  visible,
  onClose,
  selectedWallColor, setSelectedWallColor,
  selectedOrbColor, setSelectedOrbColor,
  selectedRippleColor, setSelectedRippleColor,
}: InlineColorPickerPanelProps) {
  if (!visible) return null;
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99,
      }}>
        <View
          style={[
            styles.colorPanelOverlay,
            { pointerEvents: 'box-none' }
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.colorPanel}>
              {/* (panel layout just as before) */}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
