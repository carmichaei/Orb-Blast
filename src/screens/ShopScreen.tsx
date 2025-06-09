import React from 'react';
import { SafeAreaView, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { getThemePalette, styles as globalStyles } from '../styles';
import { ORB_SKINS } from '../constants';
import { storePlayerPoints, unlockSkin, getUnlockedSkins, setEquippedSkin } from '../utils/game';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNLOCKED_SKINS_KEY, EQUIPPED_SKIN_KEY } from '../constants';

const resetShopPurchases = async () => {
  await AsyncStorage.removeItem(UNLOCKED_SKINS_KEY);
  await AsyncStorage.setItem(EQUIPPED_SKIN_KEY, 'default');
};

const ShopScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    playerPoints, setPlayerPoints,
    unlockedSkins, setUnlockedSkins,
    equippedSkin, setEquippedSkinState,
    theme,
  } = useGame();

  const palette = getThemePalette(theme);

  const handleBuy = async (skinKey: string, price: number) => {
    if (playerPoints < price) return;
    const newPoints = playerPoints - price;
    try {
      await storePlayerPoints(newPoints);
      setPlayerPoints(newPoints);
      await unlockSkin(skinKey);
      const updatedSkins = await getUnlockedSkins();
      setUnlockedSkins(updatedSkins);
    } catch (e) {
      // Error handling
    }
  };

  const handleEquip = async (skinKey: string) => {
    try {
      await setEquippedSkin(skinKey);
      setEquippedSkinState(skinKey);
    } catch (e) {
      // Error handling
    }
  };

  const handleUnequip = async () => {
    try {
      await setEquippedSkin('default');
      setEquippedSkinState('default');
    } catch (e) {
      // Error handling
    }
  };

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[localStyles.points, { color: palette.header }]}>
          Points: {playerPoints}
        </Text>

        <View style={localStyles.skinList}>
          {ORB_SKINS.filter(skin => skin.key !== 'default').map(skin => {
            const owned = unlockedSkins.includes(skin.key);
            const isEquipped = equippedSkin === skin.key;
            return (
              <View key={skin.key} style={[localStyles.skinContainer, { opacity: owned ? 1 : 0.65 }]}>
                <View style={[localStyles.skinImageContainer, { borderColor: palette.sliderTrack, backgroundColor: palette.panel, borderWidth: owned ? 2 : 0 }]}>
                  <Image source={skin.file} style={localStyles.skinImage} resizeMode="contain" />
                </View>
                <Text style={[localStyles.priceText, { color: palette.text }]}>
                  {skin.price}
                </Text>

                {!owned && (
                  <TouchableOpacity
                    style={[localStyles.actionButton, { backgroundColor: playerPoints >= skin.price ? palette.sliderTrack : palette.sliderTrackBg }]}
                    disabled={playerPoints < skin.price}
                    onPress={() => handleBuy(skin.key, skin.price)}
                  >
                    <Text style={[localStyles.actionText, { color: palette.overlay }]}>Buy</Text>
                  </TouchableOpacity>
                )}

                {owned && !isEquipped && (
                  <TouchableOpacity
                    style={[localStyles.actionButton, { backgroundColor: palette.sliderTrack }]}
                    onPress={() => handleEquip(skin.key)}
                  >
                    <Text style={[localStyles.actionText, { color: palette.overlay }]}>Equip</Text>
                  </TouchableOpacity>
                )}

                {owned && isEquipped && (
                  <>
                    <Text style={[localStyles.equippedLabel, { color: palette.header }]}>Equipped</Text>
                    <TouchableOpacity
                      style={[localStyles.actionButton, { backgroundColor: palette.sliderTrack }]}
                      onPress={handleUnequip}
                    >
                      <Text style={[localStyles.actionText, { color: palette.overlay }]}>Unequip</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button, marginTop: 28, marginBottom: 18 }]} onPress={() => navigation.navigate('Menu')}>
          <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 36, // ensures the back button isn't cut off at bottom
  },
  points: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  skinList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  skinContainer: {
    width: 82,
    margin: 10,
    alignItems: 'center',
  },
  skinImageContainer: {
    borderRadius: 44,
    padding: 4,
    marginBottom: 2,
  },
  skinImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 2,
  },
  actionText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  equippedLabel: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
  },
});

export default ShopScreen;
