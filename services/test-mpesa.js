/**
 * Test file for M-Pesa SMS Parser
 * Run this with: node test_mpesa_parser.js
 */

// Copy the MpesaParser class here (without the export at the bottom)
class MpesaParser {
  static parseSMS(smsBody, receivedAt = new Date()) {
    if (!smsBody || typeof smsBody !== 'string') {
      return null;
    }

    const message = smsBody.trim();
    
    if (!this.isMpesaMessage(message)) {
      return null;
    }

    try {
      return (
        this.parseSentMoney(message, receivedAt) ||
        this.parseReceivedMoney(message, receivedAt) ||
        this.parseWithdrawal(message, receivedAt) ||
        this.parseDeposit(message, receivedAt) ||
        this.parseBuyGoods(message, receivedAt) ||
        this.parsePayBill(message, receivedAt) ||
        this.parseAirtime(message, receivedAt) ||
        this.parseBalance(message, receivedAt)
      );
    } catch (error) {
      console.error('Error parsing M-Pesa message:', error);
      return null;
    }
  }

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
      'deposit'
    ];
    
    const lowerMessage = message.toLowerCase();
    return mpesaIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  static parseSentMoney(message, receivedAt) {
    const sentPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*sent to\s*([^0-9\n]+?)(?:\s*254\d{9})?\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m).*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /ksh([\d,]+\.?\d*)\s*sent to\s*([^0-9\n]+?)(?:\s*254\d{9})?\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of sentPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'sent',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[5] || match[3]),
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parseReceivedMoney(message, receivedAt) {
    const receivedPatterns = [
      /confirmed\.\s*you have received ksh([\d,]+\.?\d*)\s*from\s*([^0-9\n]+?)(?:\s*254\d{9})?\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m).*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /received ksh([\d,]+\.?\d*)\s*from\s*([^0-9\n]+?)(?:\s*254\d{9})?\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of receivedPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'received',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[5] || match[3]),
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parseWithdrawal(message, receivedAt) {
    const withdrawalPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*withdrawn from\s*([^0-9\n]+?)(?:\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m))?.*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /withdrawn ksh([\d,]+\.?\d*)\s*from\s*([^.]+?).*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of withdrawalPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'withdrawal',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[5] || match[3]),
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parseDeposit(message, receivedAt) {
    const depositPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*deposited to\s*([^0-9\n]+?)(?:\s*on\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*at\s*(\d{1,2}:\d{2}\s*[ap]m))?.*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /deposited ksh([\d,]+\.?\d*)\s*.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of depositPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'deposit',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2] || 'M-Pesa Agent'),
          balance: this.parseAmount(match[5] || match[2]),
          date: this.parseDate(match[3], receivedAt),
          time: this.parseTime(match[4], receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parseBuyGoods(message, receivedAt) {
    const buyGoodsPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*paid to\s*([^0-9\n]+?).*?buy goods.*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /ksh([\d,]+\.?\d*)\s*paid to\s*([^.]+?).*?buy goods.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of buyGoodsPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'buy_goods',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[3]),
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parsePayBill(message, receivedAt) {
    const payBillPatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*paid to\s*([^0-9\n]+?).*?pay bill.*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /ksh([\d,]+\.?\d*)\s*paid to\s*([^.]+?).*?pay bill.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of payBillPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'pay_bill',
          amount: this.parseAmount(match[1]),
          entity: this.cleanEntityName(match[2]),
          balance: this.parseAmount(match[3]),
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  static parseAirtime(message, receivedAt) {
    const airtimePatterns = [
      /confirmed\.\s*ksh([\d,]+\.?\d*)\s*airtime.*?new m-pesa balance is ksh([\d,]+\.?\d*)/i,
      /ksh([\d,]+\.?\d*)\s*airtime.*?balance.*?ksh([\d,]+\.?\d*)/i
    ];

    for (const pattern of airtimePatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'airtime',
          amount: this.parseAmount(match[1]),
          entity: 'Airtime Purchase',
          balance: this.parseAmount(match[2]),
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

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
          amount: 0,
          entity: 'Balance Inquiry',
          balance: this.parseAmount(match[1]),
          date: this.extractDateFromMessage(message, receivedAt),
          time: this.extractTimeFromMessage(message, receivedAt),
          rawMessage: message
        };
      }
    }
    return null;
  }

  // Helper methods
  static parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/,/g, '')) || 0;
  }

  static cleanEntityName(name) {
    if (!name) return 'Unknown';
    return name.trim()
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
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
}

// Test cases
const testMessages = [
  // Sent money
  "Confirmed. Ksh500.00 sent to JOHN DOE 254712345678 on 1/6/25 at 2:30 PM. New M-PESA balance is Ksh1,500.00. Transaction cost, Ksh0.00.",
  
  // Received money
  "Confirmed. You have received Ksh1,000.00 from JANE SMITH 254798765432 on 1/6/25 at 3:45 PM. New M-PESA balance is Ksh2,500.00.",
  
  // Withdrawal
  "Confirmed. Ksh200.00 withdrawn from SAFARICOM AGENT - WESTLANDS on 1/6/25 at 4:15 PM. New M-PESA balance is Ksh2,300.00. Transaction cost, Ksh28.00.",
  
  // Buy goods
  "Confirmed. Ksh250.00 paid to SUPERMARKET XYZ for buy goods on 1/6/25 at 5:20 PM. New M-PESA balance is Ksh2,050.00. Transaction cost, Ksh0.00.",
  
  // Airtime
  "Confirmed. Ksh100.00 airtime for 254712345678 on 1/6/25 at 6:00 PM. New M-PESA balance is Ksh1,950.00. Transaction cost, Ksh0.00.",
  
  // Non M-Pesa message (should return null)
  "Your OTP code is 123456. Valid for 5 minutes.",
  
  // Balance inquiry
  "Your M-PESA balance is Ksh1,950.00 as at 1/6/25 6:30 PM.",
];

// Run tests
console.log('=== M-Pesa SMS Parser Tests ===\n');

testMessages.forEach((message, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Input: "${message}"`);
  
  const result = MpesaParser.parseSMS(message);
  
  if (result) {
    console.log('✅ Parsed successfully:');
    console.log(`   Type: ${result.type}`);
    console.log(`   Amount: ${result.amount}`);
    console.log(`   Entity: ${result.entity}`);
    console.log(`   Balance: ${result.balance}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Time: ${result.time}`);
  } else {
    console.log('❌ Not parsed (not M-Pesa or unrecognized format)');
  }
  
  console.log('---\n');
});

// Performance test
console.log('=== Performance Test ===');
const startTime = Date.now();
for (let i = 0; i < 1000; i++) {
  testMessages.forEach(msg => MpesaParser.parseSMS(msg));
}
const endTime = Date.now();
console.log(`Parsed ${testMessages.length * 1000} messages in ${endTime - startTime}ms`);
console.log(`Average: ${((endTime - startTime) / (testMessages.length * 1000)).toFixed(3)}ms per message`);