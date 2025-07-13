import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateUser } from '../../services/databaseManager.js';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  // Check biometric support on component mount
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);

      if (compatible) {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await validateUser(username, password);
      
      if (result.success && result.isValid) {
        // Store credentials for biometric login (encrypted storage recommended in production)
        await AsyncStorage.setItem('biometric_username', username);
        await AsyncStorage.setItem('biometric_password', password);
        
        router.replace('/home');
      } else {
        Alert.alert('Error', 'Invalid username or password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to login. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Error', 'Biometric authentication is not supported on this device');
        return;
      }

      if (!isEnrolled) {
        Alert.alert(
          'Biometric Not Set Up',
          'Please set up biometric authentication in your device settings first'
        );
        return;
      }

      // Check if user has previously logged in (has stored credentials)
      const storedUsername = await AsyncStorage.getItem('biometric_username');
      const storedPassword = await AsyncStorage.getItem('biometric_password');

      if (!storedUsername || !storedPassword) {
        Alert.alert(
          'No Saved Credentials',
          'Please log in with your username and password first to enable biometric login'
        );
        return;
      }

      // Perform biometric authentication
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (biometricResult.success) {
        setIsLoading(true);
        
        try {
          const result = await validateUser(storedUsername, storedPassword);
          
          if (result.success && result.isValid) {
            router.replace('/home');
          } else {
            Alert.alert('Error', 'Authentication failed. Please try logging in manually.');
            // Clear stored credentials if they're invalid
            await AsyncStorage.removeItem('biometric_username');
            await AsyncStorage.removeItem('biometric_password');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to authenticate. Please try again.');
          console.error('Biometric login error:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (biometricResult.error === 'UserCancel') {
        // User cancelled, do nothing
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication was not successful');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact support to reset your password');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'face':
        return 'scan';
      case 'iris':
        return 'eye';
      default:
        return 'finger-print';
    }
  };

  const getBiometricText = () => {
    switch (biometricType) {
      case 'face':
        return 'Use Face ID';
      case 'iris':
        return 'Use Iris Scan';
      default:
        return 'Use Fingerprint';
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.appTitle}>mManager</Text>
              <Text style={styles.subtitle}>Manage your finances with ease</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Sign In</Text>
              
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#9F5BFF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#9F5BFF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="rgba(255, 255, 255, 0.7)" 
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#9F5BFF', '#8229FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loginButtonText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Biometric Login */}
              {isBiometricSupported && (
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                >
                  <Ionicons name={getBiometricIcon()} size={24} color="#9F5BFF" />
                  <Text style={styles.biometricText}>{getBiometricText()}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  )
}

export default Login

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 18,
    color: '#CCCCCC',
    fontWeight: '300',
    letterSpacing: 1,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: 400,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(159, 91, 255, 0.3)',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#9F5BFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(159, 91, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(159, 91, 255, 0.3)',
    height: 56,
    marginBottom: 20,
  },
  biometricText: {
    color: '#9F5BFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  signUpText: {
    color: '#9F5BFF',
    fontSize: 16,
    fontWeight: '600',
  },
})