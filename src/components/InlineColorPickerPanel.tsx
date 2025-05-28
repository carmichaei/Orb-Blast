import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { getThemePalette, styles as globalStyles } from '../styles';

/*
  InlineColorPickerPanel
  ─────────────────────
  • Adapts colours to current theme (Light/Dark).
  • Orb colour row is disabled (greyed + non‑interactive) whenever the player has a non‑default skin equipped.
  • Ripple colour row is disabled in Light Mode because ripple tint is forced black.
  • Disabled rows render at 35 % opacity and ignore taps; a small label explains why.
*/

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedWallColor: string;
  setSelectedWallColor: (c: string) => void;
  selectedOrbColor: string;
  setSelectedOrbColor: (c: string) => void;
  selectedRippleColor: string;
  setSelectedRippleColor: (c: string) => void;
  wallColors: string[];
  orbColors: string[];
  rippleColors: string[];
};

const InlineColorPickerPanel: React.FC<Props> = ({
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
}) => {
  /* Theme + skin context */
  const { theme, equippedSkin } = useGame();
  const palette = getThemePalette(theme);

  if (!visible) return null;

  /* Disable logic */
  const skinActive = equippedSkin && equippedSkin !== 'default';
  const orbDisabled = skinActive;
  const rippleDisabled = theme === 'light';

  /* Render helpers */
  const renderRow = (
    colors: string[],
    selected: string,
    onChange: (c: string) => void,
    selBorder: string,
    disabled = false,
  ) => (
    <View style={s.row}>
      {colors.map(color => {
        const isSelected = selected === color;
        const circleStyle = [
          s.circle,
          {
            backgroundColor: color,
            borderColor: isSelected ? selBorder : '#fff',
            borderWidth: isSelected ? 3 : 1,
            opacity: disabled ? 0.35 : 1,
          },
        ];
        return (
          <TouchableOpacity
            key={color}
            style={circleStyle}
            onPress={() => !disabled && onChange(color)}
            activeOpacity={disabled ? 1 : 0.7}
          />
        );
      })}
    </View>
  );

  /* ── UI ───────────────────────────────────────────────────────────────────*/
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={[s.panel, { backgroundColor: palette.panel }]}>            
            {/* Walls */}
            <Text style={[s.title, { color: palette.header }]}>Walls</Text>
            {renderRow(wallColors, selectedWallColor, setSelectedWallColor, '#7bffde')}

            {/* Orbs */}
            <Text style={[s.title, { color: palette.header }]}>Orbs</Text>
            {renderRow(orbColors, selectedOrbColor, setSelectedOrbColor, '#ffd36e', orbDisabled)}
            {orbDisabled && (
              <Text style={[s.disabledHint, { color: palette.text }]}>Orb colours locked by skin</Text>
            )}

            {/* Ripples */}
            <Text style={[s.title, { color: palette.header }]}>Ripples</Text>
            {renderRow(rippleColors, selectedRippleColor, setSelectedRippleColor, '#cdbaff', rippleDisabled)}
            {rippleDisabled && (
              <Text style={[s.disabledHint, { color: palette.text }]}>Ripple colours disabled in Light Mode</Text>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

/* ─── Styles ───────────────────────────────────────────────────────────────*/
const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 120,
    left: 180,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  panel: {
    ...globalStyles.colorPanel,
    padding: 12,
    borderRadius: 18,
    elevation: 4,
  },
  title: {
    ...globalStyles.colorPanelTitle,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  circle: {
    ...globalStyles.colorCircle,
  },
  disabledHint: {
    fontSize: 12,
    marginBottom: 6,
  },
});

export default InlineColorPickerPanel;