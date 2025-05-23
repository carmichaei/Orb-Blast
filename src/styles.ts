import { StyleSheet } from 'react-native';
import { BG_GRADIENT_END } from './constants'; // adjust import path if needed

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_GRADIENT_END },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  topRowPanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, marginTop: 8
  },
  panelBlur: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: '#22284cbb',
    borderRadius: 16,
    marginRight: 10
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  menuButton: { padding: 7, marginLeft: 3, borderRadius: 8 },
  menuText: { color: '#fff', fontSize: 32, opacity: 0.7 },
  scoreText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 1, fontFamily: 'System' },
  title: {
    fontSize: 46, color: '#fff', letterSpacing: 4, fontWeight: '800',
    textShadowColor: '#7bffde99', textShadowRadius: 24, marginBottom: 30, fontFamily: 'System'
  },
  menuScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_GRADIENT_END },
  button: {
    backgroundColor: '#22284cbb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 22,
    marginVertical: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 9,
  },
  buttonText: {
    color: '#fff', fontSize: 22, letterSpacing: 2, fontWeight: 'bold', fontFamily: 'System', textAlign: 'center'
  },
  credits: { color: '#fff', opacity: 0.2, marginTop: 38, fontSize: 15, fontFamily: 'System' },
  scoresList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18, fontFamily: 'System', textAlign: 'center' },
  gameOverScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  gameOverTitle: {
    color: '#fff', fontSize: 46, fontWeight: 'bold', marginBottom: 14, letterSpacing: 2, fontFamily: 'System',
    textShadowColor: '#7bffde', textShadowRadius: 25,
  },
  gameOverText: { color: '#fff', fontSize: 22, marginBottom: 28, fontWeight: '600', fontFamily: 'System',textAlign: 'center' },
  gameOverButtons: { flexDirection: 'column', justifyContent: 'space-around', width: '80%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,22,38,0.99)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    color: '#7bffde',
    fontSize: 22,
    letterSpacing: 2,
    marginBottom: 32,
    fontWeight: '700',
    fontFamily: 'System'
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  barBg: {
  width: 240,
  height: 14,
  backgroundColor: '#23243a',
  borderRadius: 12,
  overflow: 'hidden',
  borderColor: '#7bffde',
  borderWidth: 3,
  shadowColor: '#7bffde99',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.13,
  shadowRadius: 7,
  padding: 0,         // Ensure no padding
},

barFill: {
  height: 14,         // Match barBg
  backgroundColor: '#7bffde',
  borderRadius: 12,   // Match barBg
  alignSelf: 'flex-start', // Make sure it's top-aligned
  margin: 0,          // No accidental margin
  padding: 0,
  top: -2,
  left: -2,
},
  // ---- Color Panel Styles ----
  colorPanelOverlay: {
    position: 'absolute',
    top: 120,
    right: 20,
    bottom: 0,
    width: 70,
    zIndex: 99,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  colorPanel: {
    backgroundColor: '#20223b',
    borderRadius: 16,
    padding: 10,
    paddingTop: 12,
    paddingBottom: 16,
    minWidth: 100,
    width: 240,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
  },
  colorPanelTitle: {
    color: '#fff', fontWeight: '600', fontSize: 13, marginBottom: 2, marginTop: 10, letterSpacing: 1,
  },
  colorCircle: {
    width: 33, height: 33, borderRadius: 19,
    marginVertical: 2, marginHorizontal: 0,
    borderWidth: 1.5, borderColor: '#fff'
  },
  colorPanelCloseBtn: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#23243a',
    padding: 3,
    borderRadius: 13,
  },
  tutorialScreen: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: BG_GRADIENT_END,
  padding: 24,
},
tutorialTitle: {
  color: '#7bffde',
  fontSize: 36,
  fontWeight: 'bold',
  marginBottom: 20,
},
tutorialText: {
  color: '#fff',
  fontSize: 20,
  textAlign: 'center',
  marginBottom: 36,
},

});