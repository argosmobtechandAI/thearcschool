import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginSuccess } from '../../store/authSlice';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const LOGO = require('../../assets/images/logo.jpeg');

const SplashScreen = ({ onFinish }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const dispatch = useDispatch();

  useEffect(() => {
    // Check local storage for persistent login
    const checkLoginStatus = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        const storedToken = await AsyncStorage.getItem('@auth_token');
        if (storedUser && storedToken) {
          dispatch(loginSuccess({ user: JSON.parse(storedUser), token: storedToken }));
        }
      } catch (e) {
        console.error('Failed to restore login state', e);
      }
    };

    checkLoginStatus();

    // 3 Second Animation Sequence (including "304" style bouncy/fluid entrance)
    Animated.sequence([
      // Step 1: Logo fades and scales in with a spring (Bouncy 3D-like feel)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]),
      // Step 2: Text slides up and fades in
      Animated.parallel([
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]),
      // Step 3: Hold for the remainder of the 3 seconds
      Animated.delay(1000),
      
      // Step 4: Fade everything out smoothly before finishing
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, [scaleAnim, opacityAnim, textOpacityAnim, translateYAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={LOGO} style={styles.logo} />
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, { opacity: textOpacityAnim, transform: [{ translateY: translateYAnim }] }]}>
        <Text style={styles.title}>The Arc School</Text>
        <Text style={styles.subtitle}>App for Students of Our School</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 40,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.surface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface + 'CC',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
