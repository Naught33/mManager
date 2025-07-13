import { StyleSheet, Text, View, StatusBar, Animated, Easing, PermissionsAndroid, Platform } from 'react-native'
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router'
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import DatabaseManager from '../services/databaseManager.js';

const Home = () => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Check and request SMS permission (Android only)
  const checkSMSPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'mManager needs access to your SMS to analyze transactions',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error checking SMS permission:', err);
      return false;
    }
  };

  // Load assets function
  const loadAssets = async () => {
    try {
      // Load icon fonts
      await Font.loadAsync({
        ...Ionicons.font,
      });
      
      // Initialize database
      await DatabaseManager.init();
      console.log('Database initialized successfully');
      
      // Check SMS permission (don't await it, we'll handle it separately)
      checkSMSPermission().then(hasPermission => {
        console.log('SMS Permission:', hasPermission ? 'Granted' : 'Denied');
      }).catch(err => {
        console.warn('Error handling SMS permission:', err);
      });
      
      // Set assets as loaded after minimum delay (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAssetsLoaded(true);
    } catch (e) {
      console.warn('Asset/Database loading error:', e);
      setTimeout(() => setAssetsLoaded(true), 2000);
    }
  };

  // Start pulsing animation that continues until navigation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Navigate to home when both animation is complete and assets are loaded
  useEffect(() => {
    if (animationComplete && assetsLoaded) {
      // Final fade out before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        router.replace('/login');
      });
    } else if (animationComplete) {
      // If animation is done but assets aren't loaded, show loading indicator
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [animationComplete, assetsLoaded]);

  // Main effect to load assets and start animations
  useEffect(() => {
    // Start loading assets
    loadAssets();
    
    // Start the main animation sequence
    Animated.sequence([
      // Fade in and scale up the logo
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Hold for a moment
      Animated.delay(1200),
    ]).start(() => {
      // Mark main animation as complete
      setAnimationComplete(true);
      // Start pulsing animation for extended loading
      startPulseAnimation();
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: animationComplete ? pulseAnim : scaleAnim },
              { translateY: slideAnim }
            ],
          },
        ]}
      >
        <Text style={styles.appName}>mManager</Text>
        <View style={styles.underline} />
        <Text style={styles.tagline}>Manage with ease</Text>
      </Animated.View>
      
      {/* Loading indicator that shows when main animation is done but assets still loading */}
      <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
        <Text style={styles.loadingText}>Loading assets...</Text>
        <View style={styles.loadingDots}>
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot1,
              { opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.4, 0.8]
              }) }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot2,
              { opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.6, 1]
              }) }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot3,
              { opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.8, 1]
              }) }
            ]} 
          />
        </View>
      </Animated.View>
    </View>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  underline: {
    width: 80,
    height: 3,
    backgroundColor: '#9F5BFF',
    marginBottom: 16,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#CCCCCC',
    letterSpacing: 1,
    textAlign: 'center',
    fontWeight: '300',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9F5BFF',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9F5BFF',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
})