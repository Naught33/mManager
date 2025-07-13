import { StyleSheet, Text, View, FlatList, SafeAreaView, StatusBar, Dimensions, TouchableOpacity, Alert, Modal } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { 
  getBalance, 
  getSavingsTarget, 
  getTransactions,
  getSavingsTransfers,
  clearAllData,
  getUserInfo,
  getNotifications,
  markNotificationAsRead
} from '../../services/databaseManager.js';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

const { height } = Dimensions.get('window');

const TransactionItem = ({ item }) => (
  <View style={styles.transactionItem}>
    <View>
      <Text style={styles.transactionName}>{item.entity || 'N/A'}</Text>
      <Text style={[styles.transactionAmount, item.amount < 0 ? styles.negativeAmount : styles.positiveAmount]}>
        KES {item.amount < 0 ? "" : "+"}
        {item.amount.toFixed(2)}
      </Text>
    </View>
    <View style={styles.transactionTimeContainer}>
      <Text style={styles.transactionDate}>{item.date}</Text>
      <Text style={styles.transactionTime}>{item.time}</Text>
    </View>
  </View>
);

const Home = () => {
  const [balance, setBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('User');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      // Fetch all data in parallel
      const [
        balanceResult,
        transactionsResult,
        savingsTransfersResult,
        savingsTargetResult,
        userInfoResult,
        notificationsResult
      ] = await Promise.all([
        getBalance(),
        getTransactions({ limit: 10 }),
        getSavingsTransfers(),
        getSavingsTarget(),
        getUserInfo(),
        getNotifications()
      ]);

      if (balanceResult.success) {
        setBalance(balanceResult.balance || 0);
      }

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data || []);
      }

      if (userInfoResult.success && userInfoResult.user?.username) {
        setUsername(userInfoResult.user.username);
      }

      if (notificationsResult.success) {
        setNotifications(notificationsResult.data || []);
        setUnreadCount(notificationsResult.data.filter(n => !n.is_read).length);
      }

      // Calculate savings balance from savings transfers
      if (savingsTransfersResult.success) {
        const savingsTotal = savingsTransfersResult.data.reduce(
          (sum, transfer) => sum + transfer.amount, 0
        );
        setSavingsBalance(savingsTotal);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    if (!refreshing) {
      fetchData();
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all transaction data? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear", 
          onPress: async () => {
            try {
              const result = await clearAllData();
              if (result.success) {
                Alert.alert("Success", "All data has been cleared");
                fetchData();
              } else {
                Alert.alert("Error", "Failed to clear data");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while clearing data");
              console.error('Error clearing data:', error);
            }
          }
        }
      ]
    );
  };

  const formatAmount = (amount) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleNotifications = async () => {
    if (!notificationsVisible) {
      // When opening notifications, mark all as read
      const unreadNotifications = notifications.filter(n => !n.is_read);
      if (unreadNotifications.length > 0) {
        await Promise.all(
          unreadNotifications.map(n => markNotificationAsRead(n.id))
        );
        setUnreadCount(0);
      }
    }
    setNotificationsVisible(!notificationsVisible);
  };

  const formatNotificationTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={toggleNotifications}
            >
              <Ionicons 
                name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                size={24} 
                color="#9F5BFF" 
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Notifications Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={notificationsVisible}
            onRequestClose={() => setNotificationsVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.notificationsContainer}>
                <View style={styles.notificationsHeader}>
                  <Text style={styles.notificationsTitle}>Notifications</Text>
                  <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                    <Ionicons name="close" size={24} color="#9F5BFF" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={notifications}
                  renderItem={({ item }) => (
                    <View style={[
                      styles.notificationItem,
                      !item.is_read && styles.notificationUnread,
                      item.type === 'warning' && styles.notificationWarning
                    ]}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationMessage}>{item.message}</Text>
                      <Text style={styles.notificationTime}>
                        {formatNotificationTime(item.timestamp)}
                      </Text>
                    </View>
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  ListEmptyComponent={
                    <Text style={styles.noNotificationsText}>No notifications yet</Text>
                  }
                />
              </View>
            </View>
          </Modal>

          {/* Balance Card */}
          <LinearGradient 
            style={styles.balanceCard}
            colors={['#9F5BFF', '#8229FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceAmount}>
                  {loading ? '--' : formatAmount(balance)}
                </Text>
                <Text style={styles.currencyLabel}>KES</Text>
              </View>
            </View>
            <View style={styles.savingsContainer}>
              <Text style={styles.savingsLabel}>Savings Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.savingsAmount}>
                  {loading ? '--' : formatAmount(savingsBalance)}
                </Text>
                <Text style={styles.currencyLabel}>KES</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Transactions Section */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  onPress={handleClearData} 
                  style={styles.actionButton}
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={20} 
                    color="#FF6B6B" 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleRefresh} 
                  style={styles.actionButton}
                  disabled={refreshing}
                >
                  <Ionicons 
                    name="refresh" 
                    size={20} 
                    color={refreshing ? "#999999" : "#9F5BFF"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.transactionsListContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
              ) : transactions.length > 0 ? (
                <FlatList
                  data={transactions}
                  renderItem={({ item }) => <TransactionItem item={item} />}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.flatListContent}
                  indicatorStyle="white"
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No transactions found</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  content: {
    padding: 20,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    color: "#CCCCCC",
    fontSize: 16,
    fontWeight: "300",
    letterSpacing: 1,
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  notificationsContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationsTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notificationUnread: {
    backgroundColor: 'rgba(159, 91, 255, 0.15)',
  },
  notificationWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  notificationTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationMessage: {
    color: "#CCCCCC",
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    color: "#999999",
    fontSize: 12,
  },
  noNotificationsText: {
    color: "#CCCCCC",
    textAlign: 'center',
    padding: 20,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#9F5BFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  balanceAmount: {
    color: "white",
    fontSize: 42,
    fontWeight: "bold",
    marginRight: 8,
  },
  currencyLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.9,
  },
  savingsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  savingsLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  savingsAmount: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginRight: 8,
    marginTop: 4,
  },
  transactionsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  transactionsListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    height: height * 0.4,
    borderWidth: 1,
    borderColor: 'rgba(159, 91, 255, 0.2)',
    marginBottom: 80,
    justifyContent: 'center',
  },
  flatListContent: {
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  negativeAmount: {
    color: "#FF6B6B",
  },
  positiveAmount: {
    color: "#4ECDC4",
  },
  transactionTimeContainer: {
    alignItems: "flex-end",
  },
  transactionDate: {
    fontSize: 14,
    color: "#CCCCCC",
    fontWeight: "500",
  },
  transactionTime: {
    fontSize: 14,
    color: "#999999",
    marginTop: 4,
    fontWeight: "400",
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
});

export default Home;