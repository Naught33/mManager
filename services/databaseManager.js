import * as SQLite from 'expo-sqlite';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize database and create tables
  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('financeApp.db');
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Create all required tables
  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        entity TEXT,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        is_savings_transfer INTEGER DEFAULT 0
      )`,
      
      `CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_amount REAL NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monthly_limit REAL NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0
      )`
    ];

    for (const query of queries) {
      await this.db.execAsync(query);
    }
  }

  // Ensure database is initialized before operations
  async ensureInit() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // Clear all data from all tables (without dropping tables)
  async clearAllData() {
    await this.ensureInit();
    
    try {
      await this.db.execAsync(`
        DELETE FROM transactions;
        DELETE FROM savings;
        DELETE FROM settings;
      `);
      return { success: true };
    } catch (error) {
      console.error('Error clearing database data:', error);
      return { success: false, error: error.message };
    }
  }

  // Drop all tables
  async dropAllTables() {
    await this.ensureInit();
    
    try {
      await this.db.execAsync(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS user;
        DROP TABLE IF EXISTS savings;
        DROP TABLE IF EXISTS settings;
      `);
      this.isInitialized = false; // Need to reinitialize after dropping tables
      return { success: true };
    } catch (error) {
      console.error('Error dropping tables:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete the entire database file
  async deleteDatabase() {
    try {
      if (this.db) {
        await this.db.closeAsync();
      }
      await FileSystem.deleteAsync(FileSystem.documentDirectory + 'SQLite/financeApp.db');
      this.db = null;
      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      console.error('Error deleting database:', error);
      return { success: false, error: error.message };
    }
  }

  // Transaction Management
  async addTransaction(transactionData) {
    await this.ensureInit();
    
    const { type, entity, amount, date, time, is_savings_transfer = 0 } = transactionData;
    
    const query = `
      INSERT INTO transactions (type, entity, amount, date, time, is_savings_transfer)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await this.db.runAsync(query, [type, entity, amount, date, time, is_savings_transfer]);
      return { success: true, id: result.lastInsertRowId };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTransaction(id, updatedData) {
    await this.ensureInit();
    
    const fields = [];
    const values = [];
    
    Object.keys(updatedData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updatedData[key]);
    });
    
    values.push(id);
    
    const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;
    
    try {
      const result = await this.db.runAsync(query, values);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTransaction(id) {
    await this.ensureInit();
    
    try {
      const result = await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransactions({ limit = 50, offset = 0 } = {}) {
    await this.ensureInit();
    
    const query = `
      SELECT * FROM transactions 
      ORDER BY date DESC, time DESC 
      LIMIT ? OFFSET ?
    `;
    
    try {
      const result = await this.db.getAllAsync(query, [limit, offset]);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllTransactions() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC, time DESC');
      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      return { success: false, error: error.message };
    }
  }

  async getBalance() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getFirstAsync('SELECT SUM(amount) as balance FROM transactions');
      return { success: true, balance: result?.balance || 0 };
    } catch (error) {
      console.error('Error calculating balance:', error);
      return { success: false, error: error.message };
    }
  }

  async getSavingsTransfers() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM transactions WHERE is_savings_transfer = 1 ORDER BY date DESC, time DESC'
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching savings transfers:', error);
      return { success: false, error: error.message };
    }
  }

  // Savings Management
  async setSavingsTarget(targetData) {
    await this.ensureInit();
    
    const { target_amount, start_date, end_date } = targetData;
    
    try {
      // Clear existing savings targets (assuming one active target at a time)
      await this.db.runAsync('DELETE FROM savings');
      
      // Insert new target
      const result = await this.db.runAsync(
        'INSERT INTO savings (target_amount, start_date, end_date) VALUES (?, ?, ?)',
        [target_amount, start_date, end_date]
      );
      
      return { success: true, id: result.lastInsertRowId };
    } catch (error) {
      console.error('Error setting savings target:', error);
      return { success: false, error: error.message };
    }
  }

  async getSavingsTarget() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getFirstAsync('SELECT * FROM savings ORDER BY id DESC LIMIT 1');
      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching savings target:', error);
      return { success: false, error: error.message };
    }
  }

  // Settings Management
  async setMonthlyLimit(amount) {
    await this.ensureInit();
    
    try {
      // Clear existing limits
      await this.db.runAsync('DELETE FROM settings');
      
      // Insert new limit
      const result = await this.db.runAsync(
        'INSERT INTO settings (monthly_limit) VALUES (?)',
        [amount]
      );
      
      return { success: true, id: result.lastInsertRowId };
    } catch (error) {
      console.error('Error setting monthly limit:', error);
      return { success: false, error: error.message };
    }
  }

  async getMonthlyLimit() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getFirstAsync('SELECT monthly_limit FROM settings ORDER BY id DESC LIMIT 1');
      return { success: true, limit: result?.monthly_limit || 0 };
    } catch (error) {
      console.error('Error fetching monthly limit:', error);
      return { success: false, error: error.message };
    }
  }

  // User Management
  async registerUser(username, password) {
    await this.ensureInit();
    
    try {
      const result = await this.db.runAsync(
        'INSERT INTO user (username, password) VALUES (?, ?)',
        [username, password]
      );
      
      return { success: true, id: result.lastInsertRowId };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: error.message };
    }
  }

  async validateUser(username, password) {
    await this.ensureInit();
    
    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM user WHERE username = ? AND password = ?',
        [username, password]
      );
      
      return { success: true, isValid: !!result, user: result };
    } catch (error) {
      console.error('Error validating user:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user information
  async getUserInfo() {
    await this.ensureInit();
    
    try {
      const result = await this.db.getFirstAsync('SELECT id, username FROM user LIMIT 1');
      return { success: true, user: result };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { success: false, error: error.message };
    }
  }

  // Update username
  async updateUsername(newUsername) {
    await this.ensureInit();
    
    try {
      const result = await this.db.runAsync(
        'UPDATE user SET username = ? WHERE id = (SELECT id FROM user LIMIT 1)',
        [newUsername]
      );
      
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating username:', error);
      return { success: false, error: error.message };
    }
  }

  // Update password
  async updatePassword(newPassword) {
    await this.ensureInit();
    
    try {
      const result = await this.db.runAsync(
        'UPDATE user SET password = ? WHERE id = (SELECT id FROM user LIMIT 1)',
        [newPassword]
      );
      
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  }

  // PDF Export
  async exportTransactionsToPDF() {
    await this.ensureInit();
    
    try {
      const transactionsResult = await this.getAllTransactions();
      if (!transactionsResult.success) {
        throw new Error('Failed to fetch transactions');
      }
      
      const transactions = transactionsResult.data;
      const balanceResult = await this.getBalance();
      const currentBalance = balanceResult.success ? balanceResult.balance : 0;
      
      // Generate HTML content for PDF
      const htmlContent = this.generateTransactionHTML(transactions, currentBalance);
      
      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // Share or save the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Transaction Report'
        });
      }
      
      return { success: true, uri };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      return { success: false, error: error.message };
    }
  }

  generateTransactionHTML(transactions, balance) {
    const formatAmount = (amount) => {
      const sign = amount >= 0 ? '+' : '';
      return `${sign}$${amount.toFixed(2)}`;
    };

    const formatType = (type) => {
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const transactionRows = transactions.map(transaction => `
      <tr>
        <td>${transaction.date}</td>
        <td>${transaction.time}</td>
        <td>${formatType(transaction.type)}</td>
        <td>${transaction.entity || 'N/A'}</td>
        <td style="color: ${transaction.amount >= 0 ? 'green' : 'red'}; font-weight: bold;">
          ${formatAmount(transaction.amount)}
        </td>
        <td>${transaction.is_savings_transfer ? 'Yes' : 'No'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transaction Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .balance { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transaction Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="balance">
          Current Balance: <span style="color: ${balance >= 0 ? 'green' : 'red'};">
            ${formatAmount(balance)}
          </span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Entity</th>
              <th>Amount</th>
              <th>Savings Transfer</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Transactions:</strong> ${transactions.length}</p>
          <p><strong>Current Balance:</strong> ${formatAmount(balance)}</p>
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  async addNotification(notificationData) {
  await this.ensureInit();
  
  const { type, title, message } = notificationData;
  
  try {
    const result = await this.db.runAsync(
      'INSERT INTO notifications (type, title, message) VALUES (?, ?, ?)',
      [type, title, message]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Error adding notification:', error);
    return { success: false, error: error.message };
  }
}

async getNotifications() {
  await this.ensureInit();
  try {
    const result = await this.db.getAllAsync(
      'SELECT * FROM notifications ORDER BY timestamp DESC'
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message };
  }
}

async markNotificationAsRead(id) {
  await this.ensureInit();
  try {
    const result = await this.db.runAsync(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [id]
    );
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

  // Utility method to close database connection
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.isInitialized = false;
    }
  }
}

// Create and export singleton instance
const databaseManager = new DatabaseManager();

// Export individual functions for convenience
export const addTransaction = (data) => databaseManager.addTransaction(data);
export const updateTransaction = (id, data) => databaseManager.updateTransaction(id, data);
export const deleteTransaction = (id) => databaseManager.deleteTransaction(id);
export const getTransactions = (options) => databaseManager.getTransactions(options);
export const getAllTransactions = () => databaseManager.getAllTransactions();
export const getBalance = () => databaseManager.getBalance();
export const getSavingsTransfers = () => databaseManager.getSavingsTransfers();
export const setSavingsTarget = (data) => databaseManager.setSavingsTarget(data);
export const getSavingsTarget = () => databaseManager.getSavingsTarget();
export const setMonthlyLimit = (amount) => databaseManager.setMonthlyLimit(amount);
export const getMonthlyLimit = () => databaseManager.getMonthlyLimit();
export const registerUser = (username, password) => databaseManager.registerUser(username, password);
export const validateUser = (username, password) => databaseManager.validateUser(username, password);
export const exportTransactionsToPDF = () => databaseManager.exportTransactionsToPDF();

// New exported functions
export const clearAllData = () => databaseManager.clearAllData();
export const dropAllTables = () => databaseManager.dropAllTables();
export const deleteDatabase = () => databaseManager.deleteDatabase();
export const getUserInfo = () => databaseManager.getUserInfo();
export const updateUsername = (newUsername) => databaseManager.updateUsername(newUsername);
export const updatePassword = (newPassword) => databaseManager.updatePassword(newPassword);
export const addNotification = (data) => databaseManager.addNotification(data);
// Add these exports at the bottom of databaseManager.js with the other exports
export const getNotifications = () => databaseManager.getNotifications();
export const markNotificationAsRead = (id) => databaseManager.markNotificationAsRead(id);

// Export the database manager instance for advanced usage
export default databaseManager;