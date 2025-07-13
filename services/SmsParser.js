/**
 * Enhanced M-Pesa SMS Parser - Improved Version
 * Parses M-Pesa SMS messages with better entity name extraction
 * Positive amounts = money received, Negative amounts = money spent
 */

class MpesaParser {
  /**
   * Parse M-Pesa SMS message and return structured data
   * @param {string} smsBody - The SMS message body
   * @param {Date} receivedAt - When the SMS was received
   * @returns {Object|null} - Parsed transaction data or null if not M-Pesa message
   */
  static parseSMS(smsBody, receivedAt = new Date()) {
    if (!smsBody || typeof smsBody !== 'string') {
      return null;
    }

    // Clean the message
    const message = smsBody.trim();
    
    // Check if it's an M-Pesa message
    if (!this.isMpesaMessage(message)) {
      return null;
    }

    try {
      // Try different parsing patterns
      return (
        this.parseSentMoney(message, receivedAt) ||
        this.parseReceivedMoney(message, receivedAt) ||
        this.parseWithdrawal(message, receivedAt) ||
        this.parseDeposit(message, receivedAt) ||
        this.parseBuyGoods(message, receivedAt) ||
        this.parsePayBill(message, receivedAt) ||
        this.parseAirtime(message, receivedAt) ||
        this.parseMshwariTransfer(message, receivedAt) ||
        this.parseKCBTransfer(message, receivedAt) ||
        this.parseFuliza(message, receivedAt) ||
        this.parseFulizaRepayment(message, receivedAt) ||
        this.parseBalance(message, receivedAt)
      );
    } catch (error) {
      console.error('Error parsing M-Pesa message:', error);
      return null;
    }
  }

  /**
   * Check if message is from M-Pesa
   */
  static isMpesaMessage(message) {
    const mpesaIndicators = [
      'confirmed',
      'ksh',
      'new m-pesa balance',
      'transaction cost',
      'mpesa',
      'sent to',
      'received from',
      'withdraw',
      'deposit',
      'fuliza',
      'overdraft',
      'loan',
      'repay',
      'm-shwari',
      'kcb m-pesa',
      'paid to',
      'transferred'
    ];
    
    const lowerMessage = message.toLowerCase();
    return mpesaIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  /**
   * Parse sent money transactions (NEGATIVE amount)
   */
  static parseSentMoney(message, receivedAt) {
    // Updated patterns to better capture entity names
    const sentPatterns = [
      // Standard send money format
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*sent to\s*([^0-9]+?)\s*(\d{10})\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Pochi La Biashara format
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*sent to\s*([^0-9]+?)\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Generic send format
      /ksh([\d,]+\.?\d*)\s*sent to\s*([^.]+?)\s*(?:on\s*(\d{1,2}\/\d{1,2}\/\d{2,4}))?\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of sentPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        const dateStr = match[4] || match[3];
        const timeStr = match[5] || match[4];
        
        return {
          type: 'sent',
          amount: -this.parseAmount(match[1]), // NEGATIVE for money sent
          entity: this.cleanEntityName(match[2]),
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse received money transactions (POSITIVE amount)
   */
  static parseReceivedMoney(message, receivedAt) {
    const receivedPatterns = [
      // Standard receive format
      /confirmed\.\s*you have received ksh([\d,]+\.?\d*)\s*from\s*([^0-9]+?)\s*(\d{10})\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Alternative receive format
      /confirmed\.\s*you have received ksh([\d,]+\.?\d*)\s*from\s*([^0-9]+?)\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Generic receive format
      /received ksh([\d,]+\.?\d*)\s*from\s*([^.]+?)\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of receivedPatterns) {
      const match = message.match(pattern);
      if (match) {
        const balance = this.extractBalance(message);
        const dateStr = match[4] || match[3];
        const timeStr = match[5] || match[4];
        
        return {
          type: 'received',
          amount: this.parseAmount(match[1]), // POSITIVE for money received
          entity: this.cleanEntityName(match[2]),
          balance: balance,
          transactionCost: 0, // Receiving money has no cost
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse buy goods transactions (NEGATIVE amount)
   */
  static parseBuyGoods(message, receivedAt) {
    const buyGoodsPatterns = [
      // Standard buy goods format
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*paid to\s*([^.]+?)\.\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Alternative buy goods format
      /ksh([\d,]+\.?\d*)\s*paid to\s*([^.]+?)\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of buyGoodsPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        const dateStr = match[3];
        const timeStr = match[4];
        
        return {
          type: 'buy_goods',
          amount: -this.parseAmount(match[1]), // NEGATIVE for money spent
          entity: this.cleanEntityName(match[2]),
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse pay bill transactions (NEGATIVE amount)
   */
  static parsePayBill(message, receivedAt) {
    const payBillPatterns = [
      // Standard pay bill format with account number
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*sent to\s*([^0-9]+?)\s*for account\s*(\d+)\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Alternative pay bill format
      /ksh([\d,]+\.?\d*)\s*sent to\s*([^.]+?)\s*for account.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of payBillPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        const dateStr = match[4];
        const timeStr = match[5];
        
        return {
          type: 'pay_bill',
          amount: -this.parseAmount(match[1]), // NEGATIVE for money spent
          entity: this.cleanEntityName(match[2]),
          accountNumber: match[3],
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse airtime purchase (NEGATIVE amount)
   */
  static parseAirtime(message, receivedAt) {
    const airtimePatterns = [
      // Standard airtime format
      /confirmed\.\s*you bought ksh([\d,]+\.?\d*)\s*of airtime\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Alternative airtime format
      /ksh([\d,]+\.?\d*)\s*airtime.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of airtimePatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        const dateStr = match[2];
        const timeStr = match[3];
        
        return {
          type: 'airtime',
          amount: -this.parseAmount(match[1]), // NEGATIVE for money spent
          entity: 'Airtime Purchase',
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse M-Shwari transfers
   */
  static parseMshwariTransfer(message, receivedAt) {
    const mshwariPatterns = [
      // M-Pesa to M-Shwari
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*transferred to m-shwari account\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // M-Shwari to M-Pesa
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*transferred from m-shwari account\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // M-Pesa to M-Shwari Lock Savings
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*transferred to m-shwari lock savings\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Lock Savings to M-Shwari
      /ksh\.([\d,]+\.?\d*)\s*has been moved from your lock savings account to your m-shwari account/i
    ];

    for (const pattern of mshwariPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        const dateStr = match[2];
        const timeStr = match[3];
        
        let type = 'mshwari_transfer';
        let amount = this.parseAmount(match[1]);
        let entity = 'M-Shwari';
        
        // Determine if it's to or from M-Shwari
        if (message.toLowerCase().includes('transferred to m-shwari')) {
          amount = -amount; // Money leaving M-Pesa
          entity = 'M-Shwari Savings';
        } else if (message.toLowerCase().includes('transferred from m-shwari')) {
          // Money coming to M-Pesa (positive)
          entity = 'M-Shwari Withdrawal';
        } else if (message.toLowerCase().includes('lock savings')) {
          amount = -amount; // Money leaving for lock savings
          entity = 'M-Shwari Lock Savings';
        }
        
        return {
          type: type,
          amount: amount,
          entity: entity,
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse KCB M-Pesa transfers
   */
  static parseKCBTransfer(message, receivedAt) {
    const kcbPatterns = [
      // KCB M-Pesa to M-Pesa
      /confirmed\.\s*you have transfered ksh([\d,]+\.?\d*)\s*from your kcb m-pesa account\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
      // Fixed/Target savings account operations
      /dear\s*([^,]+),\s*you have successfully opened a (fixed|target) savings account.*?kes\s*([\d,]+\.?\d*)/i,
      /dear\s*([^,]+),\s*you have unlocked your (fixed|target) savings account.*?kes\s*([\d,]+\.?\d*)/i,
      /dear\s*([^,]+),\s*your target saving top up of kes\s*([\d,]+\.?\d*)\s*has been received/i
    ];

    for (const pattern of kcbPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.extractTransactionCost(message);
        const balance = this.extractBalance(message);
        
        let type = 'kcb_transfer';
        let amount = this.parseAmount(match[1] || match[3] || match[4]);
        let entity = 'KCB M-Pesa';
        
        // Determine transaction type
        if (message.toLowerCase().includes('transfered') && message.toLowerCase().includes('from your kcb')) {
          // Money coming from KCB to M-Pesa (positive)
          entity = 'KCB M-Pesa Withdrawal';
        } else if (message.toLowerCase().includes('opened a')) {
          amount = -amount; // Money leaving for savings
          entity = `KCB ${match[2]} Savings`;
        } else if (message.toLowerCase().includes('unlocked')) {
          // Money coming back from savings (positive)
          entity = `KCB ${match[2]} Savings Unlock`;
        } else if (message.toLowerCase().includes('top up')) {
          amount = -amount; // Money leaving for top up
          entity = 'KCB Target Savings Top Up';
        }
        
        const dateStr = match[2];
        const timeStr = match[3];
        
        return {
          type: type,
          amount: amount,
          entity: entity,
          balance: balance,
          transactionCost: transactionCost,
          date: this.parseDate(dateStr, receivedAt),
          time: this.parseTime(timeStr, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse Fuliza loan transactions (POSITIVE amount - money received as loan)
   */
  static parseFuliza(message, receivedAt) {
    const fulizaPatterns = [
      // Fuliza charge notification
      /confirmed\.\s*fuliza m-pesa amount is ksh\s*([\d,]+\.?\d*).*?total fuliza m-pesa outstanding amount is ksh\s*([\d,]+\.?\d*)/i,
      // Standard fuliza patterns
      /confirmed\.\s*you have received ksh([\d,]+\.?\d*)\s*fuliza.*?new m-pesa balance is ksh([\d,]+\.?\d*).*?overdraft balance is ksh([\d,]+\.?\d*)/i,
      /fuliza.*?ksh([\d,]+\.?\d*).*?balance.*?ksh([\d,]+\.?\d*).*?overdraft.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of fulizaPatterns) {
      const match = message.match(pattern);
      if (match) {
        let fulizaAmount = this.parseAmount(match[1]);
        let outstandingAmount = this.parseAmount(match[2]);
        
        // Check if it's a charge notification
        if (message.toLowerCase().includes('interest charged')) {
          return {
            type: 'fuliza_charge',
            amount: 0, // No money movement, just a charge notification
            entity: 'Fuliza Interest Charge',
            balance: this.extractBalance(message),
            outstandingAmount: outstandingAmount,
            transactionCost: 0,
            date: this.extractDateFromMessage(message, receivedAt),
            time: this.extractTimeFromMessage(message, receivedAt),
            rawMessage: message
          };
        }
        
        const overdraftBalance = this.parseAmount(match[3]) || 0;
        
        return {
          type: 'fuliza_loan',
          amount: fulizaAmount, // POSITIVE for loan received
          entity: 'Fuliza Overdraft',
          balance: this.parseAmount(match[2]),
          overdraftBalance: overdraftBalance,
          transactionCost: 0,
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse Fuliza repayment transactions (NEGATIVE amount - money used to repay)
   */
  static parseFulizaRepayment(message, receivedAt) {
    const fulizaRepaymentPatterns = [
      // Full repayment
      /confirmed\.\s*ksh\s*([\d,]+\.?\d*)\s*from your m-pesa has been used to fully pay your outstanding fuliza m-pesa/i,
      // Partial repayment
      /confirmed\.\s*ksh\s*([\d,]+\.?\d*)\s*from your m-pesa has been used to partially pay your outstanding fuliza m-pesa/i,
      // Generic repayment
      /repaid.*?fuliza.*?ksh([\d,]+\.?\d*).*?balance.*?ksh([\d,]+\.?\d*).*?overdraft.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of fulizaRepaymentPatterns) {
      const match = message.match(pattern);
      if (match) {
        const balance = this.extractBalance(message);
        const isFullRepayment = message.toLowerCase().includes('fully pay');
        
        return {
          type: isFullRepayment ? 'fuliza_full_repayment' : 'fuliza_partial_repayment',
          amount: -this.parseAmount(match[1]), // NEGATIVE for repayment
          entity: isFullRepayment ? 'Fuliza Full Repayment' : 'Fuliza Partial Repayment',
          balance: balance,
          overdraftBalance: 0, // Extract from message if available
          transactionCost: 0,
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Parse balance inquiry (NEUTRAL - no money movement)
   */
  static parseBalance(message, receivedAt) {
    const balancePatterns = [
      /your m-pesa balance.*?ksh([\d,]+\.?\d*)/i,
      /balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'balance_inquiry',
          amount: 0, // NEUTRAL - no money movement
          entity: 'Balance Inquiry',
          balance: this.parseAmount(match[1]),
          transactionCost: 0,
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  /**
   * Helper method to extract balance from message
   */
  static extractBalance(message) {
    const balancePatterns = [
      /new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /balance is ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.parseAmount(match[1]);
      }
    }
    return 0;
  }

  /**
   * Helper method to extract transaction cost from message
   */
  static extractTransactionCost(message) {
    const costPatterns = [
      /transaction cost,?\s*ksh([\d,]+\.?\d*)/i,
      /transaction cost\s*ksh\.?([\d,]+\.?\d*)/i,
      /cost,?\s*ksh([\d,]+\.?\d*)/i,
      /charge,?\s*ksh([\d,]+\.?\d*)/i,
      /fee,?\s*ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of costPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.parseAmount(match[1]);
      }
    }
    
    return 0;
  }

  /**
   * Helper methods
   */
  static parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/,/g, '')) || 0;
  }

  static cleanEntityName(name) {
    if (!name) return 'Unknown';
    return name.trim()
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .replace(/\s+$/, '') // Remove trailing spaces
      .toUpperCase();
  }

  static parseDate(dateStr, fallback) {
    if (!dateStr) return this.formatDate(fallback);
    
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        year = year.length === 2 ? `20${year}` : year;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return this.formatDate(date);
      }
    } catch (error) {
      console.warn('Error parsing date:', error);
    }
    
    return this.formatDate(fallback);
  }

  static parseTime(timeStr, fallback) {
    if (!timeStr) return this.formatTime(fallback);
    
    try {
      const cleanTime = timeStr.trim().toUpperCase();
      return cleanTime;
    } catch (error) {
      console.warn('Error parsing time:', error);
    }
    
    return this.formatTime(fallback);
  }

  static extractDateFromMessage(message, fallback) {
    const dateMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    return dateMatch ? this.parseDate(dateMatch[1], fallback) : this.formatDate(fallback);
  }

  static extractTimeFromMessage(message, fallback) {
    const timeMatch = message.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    return timeMatch ? timeMatch[1].toUpperCase() : this.formatTime(fallback);
  }

  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  static formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // Parse withdrawal transactions (NEGATIVE amount)
  static parseWithdrawal(message, receivedAt) {
    const withdrawalPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*withdrawn from\s*([^0-9\n]+?)(?:\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m))?.*?new m-pesa balance is ksh([\d,]+\.?\d*).*?transaction cost,?\s*ksh([\d,]+\.?\d*)/i,
      /withdrawn ksh([\d,]+\.?\d*)\s*from\s*([^.]+?).*?balance.*?ksh([\d,]+\.?\d*).*?(?:transaction cost|cost).*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of withdrawalPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.parseAmount(match[6] || match[4]) || this.extractTransactionCost(message);
        return {
          type: 'withdrawal',
          amount: -this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[5] || match[3]),
          transactionCost: transactionCost,
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  // Parse deposit transactions (POSITIVE amount)
  static parseDeposit(message, receivedAt) {
    const depositPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*deposited to\s*([^0-9\n]+?)(?:\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m))?.*?new m-pesa balance is ksh([\d,]+\.?\d*).*?transaction cost,?\s*ksh([\d,]+\.?\d*)/i,
      /deposited ksh([\d,]+\.?\d*)\s*.*?balance.*?ksh([\d,]+\.?\d*).*?(?:transaction cost|cost).*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of depositPatterns) {
      const match = message.match(pattern);
      if (match) {
        const transactionCost = this.parseAmount(match[6] || match[3]) || this.extractTransactionCost(message);
        return {
          type: 'deposit',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2] || 'M-Pesa Agent'),
          balance: this.parseAmount(match[5] || match[2]),
          transactionCost: transactionCost,
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }
}

export default MpesaParser;