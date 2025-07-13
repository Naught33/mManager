import { StyleSheet, Text, View, SafeAreaView, ScrollView, Image, Switch, TouchableOpacity, StatusBar } from "react-native"
import { useState } from "react"
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const Settings = () => {
  // State for toggle switches
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(true) // Set to true since we're using dark theme
  const [savingsReminderEnabled, setSavingsReminderEnabled] = useState(true)
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true)
  const [dataAnalyticsEnabled, setDataAnalyticsEnabled] = useState(false)

  // Toggle switch handler
  const toggleSwitch = (setter) => (value) => setter(value)

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Profile Summary */}
          <LinearGradient 
            style={styles.profileCard}
            colors={['#9F5BFF', '#8229FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: "https://via.placeholder.com/60" }} style={styles.avatar} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>Username</Text>
                <Text style={styles.userEmail}>user@example.com</Text>
              </View>
              <TouchableOpacity style={styles.editProfileButton}>
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.editProfileText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Account Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account Settings</Text>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="person" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Personal Information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="finger-print" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Biometric Authentication</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={biometricEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setBiometricEnabled)}
                value={biometricEnabled}
              />
            </View>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="link" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Linked Accounts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>
          </View>

          {/* Notification Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={notificationsEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setNotificationsEnabled)}
                value={notificationsEnabled}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="save" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Savings Reminders</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={savingsReminderEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setSavingsReminderEnabled)}
                value={savingsReminderEnabled}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="alert-circle" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Budget Alerts</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={budgetAlertsEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setBudgetAlertsEnabled)}
                value={budgetAlertsEnabled}
              />
            </View>
          </View>

          {/* Appearance */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={darkModeEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setDarkModeEnabled)}
                value={darkModeEnabled}
              />
            </View>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="cash" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Currency Display</Text>
              </View>
              <View style={styles.settingValueContainer}>
                <Text style={styles.settingValue}>KES</Text>
                <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Privacy & Data */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Privacy & Data</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="analytics" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Share Analytics Data</Text>
              </View>
              <Switch
                trackColor={{ false: "#333333", true: "#9F5BFF" }}
                thumbColor={dataAnalyticsEnabled ? "#FFFFFF" : "#CCCCCC"}
                ios_backgroundColor="#333333"
                onValueChange={toggleSwitch(setDataAnalyticsEnabled)}
                value={dataAnalyticsEnabled}
              />
            </View>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="download" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Data Export</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>
          </View>

          {/* Help & Support */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Help & Support</Text>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="headset" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Contact Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>FAQs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="bug" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Report a Problem</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text" size={20} color="#9F5BFF" style={styles.settingIcon} />
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9F5BFF" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.logoutRow]}>
              <View style={styles.settingLeft}>
                <Ionicons name="log-out" size={20} color="#FF6B6B" style={styles.settingIcon} />
                <Text style={styles.logoutText}>Log Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Add extra padding at the bottom to account for the tab navigation
  },
  header: {
    marginTop: 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#9F5BFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 91, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  avatar: {
    width: 60,
    height: 60,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  editProfileText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
    width: 24,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    marginRight: 8,
  },
  logoutRow: {
    justifyContent: "flex-start",
    borderBottomWidth: 0,
    paddingTop: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  logoutText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "600",
  },
})