import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useEffect } from 'react';
import { getBalance, getSavingsTarget, getMonthlyLimit, validateUser, registerUser, getSavingsTransfers, getAllTransactions, getUserInfo, updateUsername, updatePassword } from '../../services/databaseManager.js';

const Profile = () => {
  const [userData, setUserData] = useState({
    username: 'Loading...',
    balance: 0,
    savings: 0,
    spending: 0,
    monthlyExpenditure: 0,
    monthlySavings: 0,
    monthlyIn: 0,
    monthlyOut: 0
  });
  const [savingsTarget, setSavingsTarget] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      // First load user info
      const userInfoResult = await getUserInfo();
      const username = userInfoResult.success ? userInfoResult.user?.username : 'User';
      
      // Get balance data
      const balanceResult = await getBalance();
      const balance = balanceResult.success ? balanceResult.balance : 0;
      
      // Get savings data
      const savingsResult = await getSavingsTransfers();
      const savings = savingsResult.success ? 
        savingsResult.data.reduce((sum, t) => sum + t.amount, 0) : 0;
      
      // Calculate spending (balance minus savings)
      const spending = balance - savings;
      
      // Get all transactions for metrics
      const transactionsResult = await getAllTransactions();
      if (transactionsResult.success) {
        const transactions = transactionsResult.data;
        const monthlyData = calculateMonthlyMetrics(transactions);
        
        setUserData({
          username,
          balance,
          savings,
          spending,
          ...monthlyData
        });
      }
      
      // Get savings target
      const targetResult = await getSavingsTarget();
      if (targetResult.success) {
        setSavingsTarget(targetResult.data);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const calculateMonthlyMetrics = (transactions) => {
    // Group transactions by month and calculate metrics
    const monthlyGroups = {};
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      if (date < sixMonthsAgo) return;
      
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
      if (!monthlyGroups[monthYear]) {
        monthlyGroups[monthYear] = { in: 0, out: 0, savings: 0 };
      }
      
      if (transaction.amount >= 0) {
        monthlyGroups[monthYear].in += transaction.amount;
      } else {
        monthlyGroups[monthYear].out += Math.abs(transaction.amount);
      }
      
      if (transaction.is_savings_transfer) {
        monthlyGroups[monthYear].savings += Math.abs(transaction.amount);
      }
    });
    
    // Calculate averages
    const months = Object.keys(monthlyGroups);
    if (months.length === 0) return {
      monthlyExpenditure: 0,
      monthlySavings: 0,
      monthlyIn: 0,
      monthlyOut: 0
    };
    
    const totals = months.reduce((acc, month) => {
      acc.in += monthlyGroups[month].in;
      acc.out += monthlyGroups[month].out;
      acc.savings += monthlyGroups[month].savings;
      return acc;
    }, { in: 0, out: 0, savings: 0 });
    
    return {
      monthlyExpenditure: totals.out / months.length,
      monthlySavings: totals.savings / months.length,
      monthlyIn: totals.in / months.length,
      monthlyOut: totals.out / months.length
    };
  };

  const formatCurrency = (amount) => {
    return `KES ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const handleEditField = (field, currentValue) => {
    setEditField(field);
    setEditValue(currentValue);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (editField === 'username') {
        const result = await updateUsername(editValue);
        if (result.success) {
          setUserData(prev => ({ ...prev, username: editValue }));
          Alert.alert("Success", "Username updated successfully");
        } else {
          Alert.alert("Error", "Failed to update username");
        }
      } else if (editField === 'password') {
        if (editValue.length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters");
          return;
        }
        const result = await updatePassword(editValue);
        if (result.success) {
          Alert.alert("Success", "Password updated successfully");
        } else {
          Alert.alert("Error", "Failed to update password");
        }
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user info:', error);
      Alert.alert("Error", "An error occurred while updating");
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* User Profile Section */}
          <LinearGradient 
            style={styles.profileCard}
            colors={['#9F5BFF', '#8229FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>{userData.username}</Text>
                <Text style={styles.balance}>{formatCurrency(userData.balance)}</Text>
              </View>
            </View>

            {/* Balance Breakdown Section */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Balance Breakdown:</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total:</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(userData.balance)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Savings:</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(userData.savings)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spending:</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(userData.spending)}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* AI Recommendation Section */}
          <View style={styles.card}>
            <View style={styles.aiHeader}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="sparkles" size={18} color="#9F5BFF" />
              </View>
              <Text style={styles.aiTitle}>AI Advisor</Text>
            </View>
            <Text style={styles.aiMessage}>
              {savingsTarget ? (
                `You're saving towards a target of ${formatCurrency(savingsTarget.target_amount)} by ${new Date(savingsTarget.end_date).toLocaleDateString()}. `
              ) : (
                'Consider setting a savings target to help with your financial goals. '
              )}
              {userData.monthlyExpenditure > userData.monthlyIn * 0.7 ? (
                'Your spending is high compared to your income. Try to reduce unnecessary expenses.'
              ) : (
                'Your monthly spending is within healthy limits. Keep it up!'
              )}
            </Text>
          </View>

          {/* Metrics Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Metrics</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="trending-down" size={18} color="#9F5BFF" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Average Monthly Expenditure:</Text>
                <Text style={styles.metricValue}>{formatCurrency(userData.monthlyExpenditure)}</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="save" size={18} color="#9F5BFF" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Average Monthly Savings:</Text>
                <Text style={styles.metricValue}>{formatCurrency(userData.monthlySavings)}</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="arrow-down" size={18} color="#9F5BFF" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Average Monthly Money in:</Text>
                <Text style={styles.metricValue}>{formatCurrency(userData.monthlyIn)}</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="arrow-up" size={18} color="#9F5BFF" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Average Monthly Money Out:</Text>
                <Text style={styles.metricValue}>{formatCurrency(userData.monthlyOut)}</Text>
              </View>
            </View>
          </View>

          {/* Account Info Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account Info</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Username:</Text>
              <View style={styles.accountValueContainer}>
                {isEditing && editField === 'username' ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus
                    />
                    <TouchableOpacity 
                      style={styles.iconButton} 
                      onPress={handleSaveEdit}
                    >
                      <Ionicons name="checkmark" size={16} color="#9F5BFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.accountValue}>{userData.username}</Text>
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleEditField('username', userData.username)}
                    >
                      <Ionicons name="pencil" size={16} color="#9F5BFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Password:</Text>
              <View style={styles.accountValueContainer}>
                {isEditing && editField === 'password' ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editValue}
                      onChangeText={setEditValue}
                      secureTextEntry
                      autoFocus
                      placeholder="Enter new password"
                      placeholderTextColor="#999999"
                    />
                    <TouchableOpacity 
                      style={styles.iconButton} 
                      onPress={handleSaveEdit}
                    >
                      <Ionicons name="checkmark" size={16} color="#9F5BFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.accountValue}>********</Text>
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleEditField('password', '')}
                    >
                      <Ionicons name="pencil" size={16} color="#9F5BFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
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
    marginBottom: 24,
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
    marginBottom: 20,
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
  profileInfo: {
    marginLeft: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balance: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  breakdownSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  accountLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  accountValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountValue: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  iconButton: {
    marginLeft: 12,
    padding: 6,
    backgroundColor: "rgba(159, 91, 255, 0.2)",
    borderRadius: 8,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(159, 91, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(159, 91, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  aiMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(159, 91, 255, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#9F5BFF",
  },
  editInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#9F5BFF',
    color: '#FFFFFF',
    padding: 4,
    minWidth: 100,
  },
})