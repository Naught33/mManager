import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Alert } from "react-native"
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import MpesaParser from "../../services/SmsParser.js";
import { 
  setMonthlyLimit, 
  getMonthlyLimit, 
  setSavingsTarget, 
  getSavingsTarget,
  getBalance,
  getSavingsTransfers,
  getAllTransactions,
  addTransaction
} from "../../services/databaseManager.js";

const Wallet = () => {
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [monthlySavings, setMonthlySavings] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthlyLimit, setMonthlyLimitState] = useState(0);
  const [savingsTarget, setSavingsTargetState] = useState(null);
  const [spentAmount, setSpentAmount] = useState(0);
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [mpesaMessage, setMpesaMessage] = useState("");

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current balance
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        setCurrentBalance(balanceResult.balance);
      }

      // Get monthly limit
      const limitResult = await getMonthlyLimit();
      if (limitResult.success) {
        setMonthlyLimitState(limitResult.limit);
      }

      // Get savings target
      const savingsResult = await getSavingsTarget();
      if (savingsResult.success) {
        setSavingsTargetState(savingsResult.data);
      }

      // Calculate spent amount and savings
      await calculateSpendingAndSavings();
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load wallet data");
    }
  };

  const calculateSpendingAndSavings = async () => {
    try {
      const transactionsResult = await getAllTransactions();
      if (!transactionsResult.success) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalSpent = 0;
      let totalSavings = 0;

      transactionsResult.data.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
          if (transaction.amount < 0) {
            totalSpent += Math.abs(transaction.amount);
          }
          if (transaction.is_savings_transfer) {
            totalSavings += Math.abs(transaction.amount);
          }
        }
      });

      setSpentAmount(totalSpent);
      setSavingsAmount(totalSavings);
    } catch (error) {
      console.error("Error calculating spending:", error);
    }
  };

  const handleSetBudget = async () => {
    if (!monthlyBudget || isNaN(monthlyBudget) || parseFloat(monthlyBudget) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid budget amount");
      return;
    }

    try {
      const result = await setMonthlyLimit(parseFloat(monthlyBudget));
      if (result.success) {
        setMonthlyLimitState(parseFloat(monthlyBudget));
        setMonthlyBudget("");
        Alert.alert("Success", "Monthly budget set successfully");
      } else {
        Alert.alert("Error", "Failed to set monthly budget");
      }
    } catch (error) {
      console.error("Error setting budget:", error);
      Alert.alert("Error", "Failed to set monthly budget");
    }
  };

  const handleSetSavings = async () => {
    if (!monthlySavings || isNaN(monthlySavings) || parseFloat(monthlySavings) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid savings amount");
      return;
    }

    // Check if there's an existing savings target for the current month
    if (savingsTarget) {
      const now = new Date();
      const targetEndDate = new Date(savingsTarget.end_date);
      
      if (now < targetEndDate) {
        Alert.alert("Cannot Set Savings", "You can only set one savings target per month");
        return;
      }
    }

    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + 30);

      const result = await setSavingsTarget({
        target_amount: parseFloat(monthlySavings),
        start_date: now.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (result.success) {
        setSavingsTargetState({
          target_amount: parseFloat(monthlySavings),
          start_date: now.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });
        setMonthlySavings("");
        Alert.alert("Success", "Monthly savings target set successfully");
      } else {
        Alert.alert("Error", "Failed to set savings target");
      }
    } catch (error) {
      console.error("Error setting savings:", error);
      Alert.alert("Error", "Failed to set savings target");
    }
  };

  const handleExtractTransaction = async () => {
    if (!mpesaMessage.trim()) {
      Alert.alert("Invalid Input", "Please enter an M-Pesa message");
      return;
    }

    try {
      // Parse the M-Pesa message
      const parsedData = MpesaParser.parseSMS(mpesaMessage);
      
      if (!parsedData) {
        Alert.alert("Error", "Could not parse the M-Pesa message. Please ensure it's a valid M-Pesa transaction message.");
        return;
      }

      // Prepare transaction data for database
      const transactionData = {
        type: parsedData.type,
        entity: parsedData.entity,
        amount: parsedData.amount,
        date: parsedData.date,
        time: parsedData.time,
        is_savings_transfer: 0 // Default to 0 (not a savings transfer)
      };

      // Add transaction to database
      const result = await addTransaction(transactionData);
      
      if (result.success) {
        Alert.alert("Success", "Transaction added successfully");
        setMpesaMessage("");
        
        // Refresh the data to show the new transaction
        await loadData();
      } else {
        Alert.alert("Error", "Failed to save transaction to database");
      }
    } catch (error) {
      console.error("Error extracting transaction:", error);
      Alert.alert("Error", "Failed to extract transaction from message");
    }
  };

  // Calculate remaining budget
  const remainingBudget = monthlyLimit - spentAmount;
  const savingsProgress = savingsTarget ? (savingsAmount / savingsTarget.target_amount) * 100 : 0;
  const savingsRemaining = savingsTarget ? savingsTarget.target_amount - savingsAmount : 0;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Wallet</Text>
          </View>

          {/* Balance Overview Card */}
          <LinearGradient 
            style={styles.balanceCard}
            colors={['#9F5BFF', '#8229FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Ionicons name="wallet" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>KES {currentBalance.toFixed(2)}</Text>
              </View>
            </View>

            {/* Monthly Expenditure Section */}
            <View style={styles.expenditureSection}>
              <Text style={styles.sectionTitleLight}>Monthly Overview</Text>
              <View style={styles.expenditureRow}>
                <View style={styles.expenditureItem}>
                  <Ionicons name="trending-down" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.expenditureLabel}>Spent</Text>
                  <Text style={styles.spentAmount}>KES {spentAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.expenditureItem}>
                  <Ionicons name="calculator" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.expenditureLabel}>Budget</Text>
                  <Text style={styles.budgetAmount}>KES {monthlyLimit.toFixed(2)}</Text>
                </View>
                <View style={styles.expenditureItem}>
                  <Ionicons name="cash" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.expenditureLabel}>Remaining</Text>
                  <Text style={remainingBudget >= 0 ? styles.remainingAmount : styles.deficitAmount}>
                    KES {remainingBudget.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Input Mpesa Message Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#9F5BFF" />
              <Text style={styles.sectionTitle}>Input Mpesa message manually</Text>
            </View>
            <View style={styles.mpesaInputContainer}>
              <TextInput
                style={styles.mpesaInput}
                placeholder="Paste your M-Pesa message here (e.g., 'Confirmed. Ksh500.00 sent to JOHN DOE...')"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                value={mpesaMessage}
                onChangeText={setMpesaMessage}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleExtractTransaction}>
              <Text style={styles.buttonText}>Extract Transaction</Text>
            </TouchableOpacity>
          </View>

          {/* Set Monthly Budget Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={20} color="#9F5BFF" />
              <Text style={styles.sectionTitle}>Set Monthly Budget</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                keyboardType="numeric"
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
              />
              <Text style={styles.currencyLabel}>KES</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSetBudget}>
              <Text style={styles.buttonText}>Set Budget</Text>
            </TouchableOpacity>
          </View>

          {/* Set Monthly Savings Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="save" size={20} color="#9F5BFF" />
              <Text style={styles.sectionTitle}>Set Monthly Savings</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                keyboardType="numeric"
                value={monthlySavings}
                onChangeText={setMonthlySavings}
              />
              <Text style={styles.currencyLabel}>KES</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSetSavings}>
              <Text style={styles.buttonText}>Set Savings Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Savings Section */}
          {savingsTarget && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={20} color="#9F5BFF" />
                <Text style={styles.sectionTitle}>Savings Progress</Text>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, savingsProgress)}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(savingsProgress)}% of goal reached</Text>
              </View>
              
              <View style={styles.savingsDetails}>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Current Savings:</Text>
                  <Text style={styles.savingsText}>KES {savingsAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Target Goal:</Text>
                  <Text style={styles.savingsText}>KES {savingsTarget.target_amount.toFixed(2)}</Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Remaining:</Text>
                  <Text style={savingsRemaining > 0 ? styles.deficitAmount : styles.remainingAmount}>
                    KES {Math.abs(savingsRemaining).toFixed(2)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.outlineButton}>
                <Ionicons name="add-circle-outline" size={18} color="#9F5BFF" />
                <Text style={styles.outlineButtonText}>Add to Savings</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default Wallet;

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
  balanceCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  profileInfo: {
    marginLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  expenditureSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionTitleLight: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 0,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  expenditureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expenditureItem: {
    alignItems: 'center',
    flex: 1,
  },
  expenditureLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 6,
    marginBottom: 4,
  },
  spentAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ECDC4", // Softer green
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD166", // Soft yellow
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(159, 91, 255, 0.3)",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  currencyLabel: {
    paddingRight: 16,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#9F5BFF",
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9F5BFF',
    borderRadius: 4,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  savingsDetails: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  savingsLabel: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
  },
  savingsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deficitAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF6B6B", // Softer red
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#9F5BFF",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: 'row',
  },
  outlineButtonText: {
    color: "#9F5BFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  mpesaInputContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(159, 91, 255, 0.3)",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  mpesaInput: {
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
    textAlignVertical: 'top',
  },
})