import { View, Platform, StyleSheet } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import Ionicons from '@expo/vector-icons/Ionicons';

function TabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const { buildHref } = useLinkBuilder();
  
  const icons = {
    home: (props) => <Ionicons name='home' size={24} {...props}/>,
    profile: (props) => <Ionicons name='person' size={24} {...props}/>,
    wallet: (props) => <Ionicons name='wallet' size={24} {...props}/>,
    settings: (props) => <Ionicons name='settings' size={24} {...props}/>,
  }

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <PlatformPressable
            key={route.name}
            href={buildHref(route.name, route.params)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, isFocused && styles.tabItemFocused]}
          >
            <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
              {icons[route.name]({
                color: isFocused ? "#FFFFFF" : "#666666"
              })}
            </View>
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? "#FFFFFF" : "#666666" }
            ]}>
              {label}
            </Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </PlatformPressable>
        );
      })}
    </View>
  );
}

export default TabBar;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // Dark background with slight transparency
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(159, 91, 255, 0.3)', // Subtle purple border
    shadowColor: '#9F5BFF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    // Add backdrop blur effect simulation
    backdropFilter: 'blur(10px)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    position: 'relative',
  },
  tabItemFocused: {
    backgroundColor: 'rgba(159, 91, 255, 0.2)', // Subtle purple background for active tab
  },
  iconContainer: {
    marginBottom: 4,
    padding: 4,
    borderRadius: 8,
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(159, 91, 255, 0.3)', // Slightly more purple for active icon
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 3,
    backgroundColor: '#9F5BFF', // Purple indicator
    borderRadius: 2,
  },
});