import { logger } from '../../utils/logger';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export interface TopupOrder {
  id: string;
  game: string;
  region: string;
  uid: string;
  server: string;
  pack: string;
  priceJpy: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_FOR_OTP' | 'COMPLETED' | 'FAILED';
  midasbuyAccount: string;
  paymentMethod: string;
  invoiceNo?: string;
  slip?: {
    invoiceNo: string;
    paidAmountCredits: number;
    remainingBalanceCredits: number;
    transactionNo: string;
    completedAt: string;
    slipImageUrl: string;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export class OrderService {
  private static instance: OrderService;

  private orders: TopupOrder[] = [
    {
      id: 'ORD-AOEM-1092',
      game: 'Age of Empires Mobile',
      region: 'Japan',
      uid: '5250140737488366145',
      server: 'Empire#239',
      pack: '99+109 Coin',
      priceJpy: 146,
      status: 'COMPLETED',
      midasbuyAccount: 'Botfordevinblack@hotmail.com',
      paymentMethod: 'MyBitCash',
      invoiceNo: 'INV20261004153947',
      slip: {
        invoiceNo: 'INV20261004153947',
        paidAmountCredits: 146,
        remainingBalanceCredits: 25140,
        transactionNo: '5038090000017469',
        completedAt: '2026/10/04 15:39:47',
        slipImageUrl: '/slips/receipt_INV20261004153947.png',
      },
      createdAt: '2026-10-04T08:39:47.000Z',
      updatedAt: '2026-10-04T08:40:15.000Z',
    }
  ];

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  public getAll(): TopupOrder[] {
    return this.orders;
  }

  public getById(id: string): TopupOrder | undefined {
    return this.orders.find(o => o.id === id);
  }

  public createOrder(params: {
    uid: string;
    server: string;
    pack: string;
    priceJpy: number;
    midasbuyAccount: string;
  }): TopupOrder {
    const order: TopupOrder = {
      id: `ORD-AOEM-${Date.now().toString().slice(-6)}`,
      game: 'Age of Empires Mobile',
      region: 'Japan',
      uid: params.uid,
      server: params.server,
      pack: params.pack,
      priceJpy: params.priceJpy,
      status: 'PENDING',
      midasbuyAccount: params.midasbuyAccount,
      paymentMethod: 'Bitcash (MyBitCash)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.unshift(order);
    logger.info(`Top-up order created: ${order.id} for UID ${order.uid}`);
    RealtimeBroadcaster.getInstance().broadcast('order_created', order);
    return order;
  }

  public updateOrderStatus(
    orderId: string,
    status: TopupOrder['status'],
    extra?: Partial<TopupOrder>
  ): TopupOrder | undefined {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return undefined;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (extra) {
      Object.assign(order, extra);
    }

    RealtimeBroadcaster.getInstance().broadcast('order_updated', order);
    return order;
  }
}
