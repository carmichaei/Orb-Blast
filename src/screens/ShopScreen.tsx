// src/screens/ShopScreen.tsx
import React from 'react';
import { SafeAreaView, View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { styles } from '../styles';
import { ORB_SKINS } from '../constants';
import { storePlayerPoints, unlockSkin, getUnlockedSkins, setEquippedSkin } from '../utils/game';

const ShopScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    playerPoints, setPlayerPoints,
    unlockedSkins, setUnlockedSkins,
    equippedSkin, setEquippedSkinState
  } = useGame();

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
      // Handle errors if necessary
    }
  };

  const handleEquip = async (skinKey: string) => {
    try {
      await setEquippedSkin(skinKey);
      setEquippedSkinState(skinKey);
    } catch (e) {
      // Handle errors if necessary
    }
  };

  const handleUnequip = async () => {
    try {
      await setEquippedSkin('default');
      setEquippedSkinState('default');
    } catch (e) {
      // Handle errors if necessary
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{
        color: '#ffd36e',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 8
      }}>
        Points: {playerPoints}
      </Text>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginTop: 10
      }}>
        {ORB_SKINS.filter(skin => skin.key !== 'default').map(skin => {
          const owned = unlockedSkins.includes(skin.key);
          const isEquipped = equippedSkin === skin.key;
          return (
            <View key={skin.key} style={{
              width: 82,
              margin: 10,
              alignItems: 'center',
              opacity: owned ? 1 : 0.65
            }}>
              <View style={{
                borderWidth: owned ? 2 : 0,
                borderColor: '#7bffde',
                borderRadius: 44,
                padding: 4,
                backgroundColor: '#20223b',
                marginBottom: 2
              }}>
                <Image source={skin.file} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" />
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>
                {skin.price}
              </Text>
              {!owned && (
                <TouchableOpacity
                  style={{
                    backgroundColor: playerPoints >= skin.price ? '#7bffde' : '#444a',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    marginTop: 2
                  }}
                  disabled={playerPoints < skin.price}
                  onPress={() => handleBuy(skin.key, skin.price)}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Buy</Text>
                </TouchableOpacity>
              )}
              {owned && !isEquipped && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#7bffde',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    marginTop: 2
                  }}
                  onPress={() => handleEquip(skin.key)}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Equip</Text>
                </TouchableOpacity>
              )}
              {owned && isEquipped && (
                <>
                  <Text style={{ color: '#7bffde', fontSize: 13, marginTop: 4, fontWeight: 'bold' }}>Equipped</Text>
                  {/* Unequip option */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#ffd36e',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      marginTop: 2
                    }}
                    onPress={handleUnequip}
                  >
                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>Unequip</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ShopScreen;
