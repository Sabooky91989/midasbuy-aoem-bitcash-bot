import { logger } from '../../utils/logger';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export interface BalanceLedgerEntry {
  id: string;
  timestamp: string;
  type: 'TOPUP_PAYMENT' | 'BALANCE_TOPUP' | 'SYNC_CHECK';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  invoiceNo?: string;
  referenceId?: string;
  note: string;
}

export class BalanceService {
  private static instance: BalanceService;

  // Initial balance matching PDF Page 4 screenshot: 25,140 credits
  private currentBalance = 25140;
  private currency = 'クレジット (Credits / JPY)';
  private lowBalanceThreshold = 1000;
  private ledger: BalanceLedgerEntry[] = [
    {
      id: 'tx-init-001',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      type: 'BALANCE_TOPUP',
      amount: 30000,
      balanceBefore: 0,
      balanceAfter: 30000,
      currency: 'クレジット',
      note: 'เติมเงินเข้ากระเป๋า MyBitCash ประจำเดือน',
    },
    {
      id: 'tx-init-002',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      type: 'TOPUP_PAYMENT',
      amount: 4860,
      balanceBefore: 30000,
      balanceAfter: 25140,
      currency: 'クレジット',
      invoiceNo: 'INV20261004112019',
      note: 'เติมแพ็กเกจ AOEM ให้ลูกค้าก่อนหน้า',
    }
  ];

  public static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  public getBalance(): {
    currentBalance: number;
    currency: string;
    isLowBalance: boolean;
    threshold: number;
    lastUpdated: string;
  } {
    return {
      currentBalance: this.currentBalance,
      currency: this.currency,
      isLowBalance: this.currentBalance <= this.lowBalanceThreshold,
      threshold: this.lowBalanceThreshold,
      lastUpdated: new Date().toISOString(),
    };
  }

  public getLedger(limit = 20): BalanceLedgerEntry[] {
    return this.ledger.slice(0, limit);
  }

  /**
   * Deduct balance upon successful top-up
   */
  public deductBalance(
    amount: number,
    invoiceNo: string,
    orderId: string,
    note = 'ชำระค่าแพ็กเกจ AOEM'
  ): { balanceBefore: number; balanceAfter: number } {
    const before = this.currentBalance;
    this.currentBalance = Math.max(0, this.currentBalance - amount);

    const entry: BalanceLedgerEntry = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'TOPUP_PAYMENT',
      amount,
      balanceBefore: before,
      balanceAfter: this.currentBalance,
      currency: 'クレジット',
      invoiceNo,
      referenceId: orderId,
      note,
    };

    this.ledger.unshift(entry);
    logger.info(`Bitcash Balance deducted: -${amount} Credits. New balance: ${this.currentBalance}`);

    RealtimeBroadcaster.getInstance().broadcast('balance_updated', this.getBalance());

    return { balanceBefore: before, balanceAfter: this.currentBalance };
  }

  /**
   * Check / sync balance against MyBitCash portal
   */
  public async syncBitcashPortal(): Promise<{
    currentBalance: number;
    syncedAt: string;
    status: string;
  }> {
    logger.info('Performing automated Bitcash portal balance inquiry...');
    // In production, queries Bitcash API / mybitcash.net account session
    const syncedAt = new Date().toISOString();
    
    RealtimeBroadcaster.getInstance().broadcast('balance_synced', {
      currentBalance: this.currentBalance,
      syncedAt,
    });

    return {
      currentBalance: this.currentBalance,
      syncedAt,
      status: 'SYNCHRONIZED',
    };
  }
}
