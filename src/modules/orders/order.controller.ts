import { Request, Response } from 'express';
import { OrderService } from './order.service';

export class OrderController {
  private orderService = OrderService.getInstance();

  public getOrders = (req: Request, res: Response): void => {
    const orders = this.orderService.getAll();
    res.status(200).json({ success: true, data: orders });
  };

  public getOrderById = (req: Request, res: Response): void => {
    const order = this.orderService.getById(req.params.id as string);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.status(200).json({ success: true, data: order });
  };
}
