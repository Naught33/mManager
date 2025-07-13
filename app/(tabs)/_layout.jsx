import { StyleSheet, Text, View, StatusBar } from 'react-native'
import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import TabBar from '../../components/tabBar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

const TabLayout = () => {
  useEffect(() => {
    // Configure navigation bar for Android
    if (Platform.OS === 'android') {
      const configureNavigationBar = async () => {
        try {
          // Hide the navigation bar
          await NavigationBar.setVisibilityAsync('hidden');
          
          // Set navigation bar background to black
          await NavigationBar.setBackgroundColorAsync('#000000');
          
          // Set navigation bar buttons to white
          await NavigationBar.setButtonStyleAsync('light');
          
          // Optional: Make it immersive (full screen)
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch (error) {
          console.log('Navigation bar configuration error:', error);
        }
      };
      
      configureNavigationBar();
    }
  }, []);

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000000" 
        translucent={false}
      />
      <Tabs
        tabBar={props => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen 
          name='home' 
          options={{
            title: 'Home', 
            headerShown: false
          }}
        />
        <Tabs.Screen 
          name='profile' 
          options={{
            title: 'Profile', 
            headerShown: false
          }}
        />
        <Tabs.Screen 
          name='wallet' 
          options={{
            title: 'Wallet', 
            headerShown: false
          }}
        />
        <Tabs.Screen 
          name='settings' 
          options={{
            title: 'Settings', 
            headerShown: false
          }}
        />
      </Tabs>
    </>
  )
}

export default TabLayout

const styles = StyleSheet.create({})