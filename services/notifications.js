import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { 
  getBalance, 
  getMonthlyLimit, 
  getSavingsTarget, 
  getSavingsTransfers, 
  getAllTransactions,
  addNotification 
} from './databaseManager';
import { format, subDays } from 'date-fns';

// Define the background task name
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register the background task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    await checkFinancialStatus();
  } catch (error) {
    console.error('Error in background notification task:', error);
  }
});

// Initialize the notification service
export const initNotificationService = async () => {
  // Request notification permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  // Register the background task
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background notification task registered');
  } catch (error) {
    console.log('Error registering background task:', error);
  }

  // Schedule weekly summary notifications
  await scheduleWeeklySummaries();
};

// Main function to check financial status
const checkFinancialStatus = async () => {
  try {
    // Get all necessary financial data
    const [balanceResult, limitResult, savingsTargetResult, transactionsResult] = await Promise.all([
      getBalance(),
      getMonthlyLimit(),
      getSavingsTarget(),
      getAllTransactions(),
    ]);

    const currentBalance = balanceResult.success ? balanceResult.balance : 0;
    const monthlyLimit = limitResult.success ? limitResult.limit : 0;
    const savingsTarget = savingsTargetResult.success ? savingsTargetResult.data : null;
    const transactions = transactionsResult.success ? transactionsResult.data : [];

    // Calculate current month's expenditure
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyExpenditure = transactions
      .filter(t => t.date.startsWith(currentMonth) && t.amount < 0 && !t.is_savings_transfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate savings progress
    const monthlySavings = transactions
      .filter(t => t.date.startsWith(currentMonth) && t.is_savings_transfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Check various financial conditions and send appropriate notifications
    await checkBudgetWarnings(monthlyLimit, monthlyExpenditure);
    await checkSavingsProgress(savingsTarget, monthlySavings);
    await checkNegativeBalance(currentBalance);
    await checkLargeExpenses(monthlyLimit, transactions);
  } catch (error) {
    console.error('Error checking financial status:', error);
  }
};

// Budget-related warnings
const checkBudgetWarnings = async (monthlyLimit, monthlyExpenditure) => {
  if (monthlyLimit <= 0) return;

  const percentageUsed = (monthlyExpenditure / monthlyLimit) * 100;

  if (percentageUsed >= 100) {
    await createNotification(
      'warning',
      'Budget Exceeded!',
      `You've used ${percentageUsed.toFixed(0)}% of your monthly budget. Consider reviewing your expenses.`
    );
  } else if (percentageUsed >= 75) {
    await createNotification(
      'warning',
      'Budget Warning',
      `You've used ${percentageUsed.toFixed(0)}% of your monthly budget. You're approaching your limit.`
    );
  }
};

// Savings progress checks
const checkSavingsProgress = async (savingsTarget, monthlySavings) => {
  if (!savingsTarget) return;

  const { target_amount, start_date, end_date } = savingsTarget;
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();

  // Calculate expected savings progress
  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  const daysPassed = (today - startDate) / (1000 * 60 * 60 * 24);
  const expectedProgress = (daysPassed / totalDays) * target_amount;

  if (monthlySavings < expectedProgress * 0.75) {
    await createNotification(
      'warning',
      'Savings Behind Schedule',
      `You're behind on your savings goal. Consider increasing your savings contributions.`
    );
  }
};

// Negative balance check
const checkNegativeBalance = async (currentBalance) => {
  if (currentBalance < 0) {
    await createNotification(
      'warning',
      'Negative Balance Alert',
      `Your account balance is negative (KES ${Math.abs(currentBalance).toFixed(2)}). Take action to avoid fees.`
    );
  }
};

// Large expense check
const checkLargeExpenses = async (monthlyLimit, transactions) => {
  if (monthlyLimit <= 0) return;

  const significantAmount = monthlyLimit * 0.05; // 5% of budget
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Check for any significant expenses today
  const largeExpenses = transactions.filter(
    t => t.date === today && t.amount < 0 && Math.abs(t.amount) >= significantAmount
  );

  if (largeExpenses.length > 0) {
    const totalLargeExpenses = largeExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    await createNotification(
      'warning',
      'Large Expense Detected',
      `You've spent KES ${totalLargeExpenses.toFixed(2)} today (${(totalLargeExpenses/monthlyLimit*100).toFixed(0)}% of monthly budget).`
    );
  }
};

// Weekly summary notifications
const scheduleWeeklySummaries = async () => {
  // Cancel any existing weekly notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule for every Monday at 9 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly Financial Summary',
      body: 'Your weekly financial summary is ready.',
      data: { type: 'weekly-summary' },
    },
    trigger: {
      weekday: 1, // Monday
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
};

// Generate and send weekly summary
export const sendWeeklySummary = async () => {
  try {
    const [balanceResult, limitResult, savingsTargetResult, transactionsResult] = await Promise.all([
      getBalance(),
      getMonthlyLimit(),
      getSavingsTarget(),
      getAllTransactions(),
    ]);

    const currentBalance = balanceResult.success ? balanceResult.balance : 0;
    const monthlyLimit = limitResult.success ? limitResult.limit : 0;
    const savingsTarget = savingsTargetResult.success ? savingsTargetResult.data : null;
    const transactions = transactionsResult.success ? transactionsResult.data : [];

    // Calculate weekly metrics
    const oneWeekAgo = subDays(new Date(), 7);
    
    const weeklyExpenses = transactions
      .filter(t => new Date(t.date) >= oneWeekAgo && t.amount < 0 && !t.is_savings_transfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const weeklySavings = transactions
      .filter(t => new Date(t.date) >= oneWeekAgo && t.is_savings_transfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Generate summary message
    let summary = `Weekly Summary:\n`;
    summary += `- Balance: KES ${currentBalance.toFixed(2)}\n`;
    
    if (monthlyLimit > 0) {
      const percentageUsed = (weeklyExpenses / monthlyLimit) * 100;
      summary += `- Weekly Expenses: KES ${weeklyExpenses.toFixed(2)} (${percentageUsed.toFixed(0)}% of monthly budget)\n`;
    }

    if (savingsTarget) {
      const { target_amount } = savingsTarget;
      const progressPercentage = (weeklySavings / target_amount) * 100;
      summary += `- Weekly Savings: KES ${weeklySavings.toFixed(2)} (${progressPercentage.toFixed(0)}% of target)\n`;
    }

    // Determine if on track
    if (monthlyLimit > 0) {
      const expectedWeeklyExpense = monthlyLimit / 4; // Roughly 1/4 of monthly budget
      if (weeklyExpenses > expectedWeeklyExpense * 1.1) {
        summary += `⚠️ You're spending faster than planned.\n`;
      } else if (weeklyExpenses < expectedWeeklyExpense * 0.9) {
        summary += `✅ Your spending is below expectations.\n`;
      } else {
        summary += `🔹 Your spending is on track.\n`;
      }
    }

    if (savingsTarget) {
      const expectedWeeklySavings = savingsTarget.target_amount / 4; // Roughly 1/4 of monthly target
      if (weeklySavings < expectedWeeklySavings * 0.9) {
        summary += `⚠️ You're saving less than planned.\n`;
      } else if (weeklySavings > expectedWeeklySavings * 1.1) {
        summary += `✅ You're saving more than planned!\n`;
      } else {
        summary += `🔹 Your savings are on track.\n`;
      }
    }

    await createNotification('info', 'Weekly Financial Summary', summary);
  } catch (error) {
    console.error('Error generating weekly summary:', error);
  }
};

// Helper function to create and store notifications
const createNotification = async (type, title, message) => {
  try {
    // First store in database
    const dbResult = await addNotification({
      type,
      title,
      message,
    });

    if (!dbResult.success) {
      console.error('Failed to save notification to database');
    }

    // Then show to user
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: message,
        data: { type, notificationId: dbResult.id },
        sound: type === 'warning' ? 'alert.wav' : 'default',
      },
      trigger: null, // Send immediately
    });

    return dbResult;
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

// Export for use in other files
export default {
  initNotificationService,
  sendWeeklySummary,
  checkFinancialStatus,
  createNotification,
};