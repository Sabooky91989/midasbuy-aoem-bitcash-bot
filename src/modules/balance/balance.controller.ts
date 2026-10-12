import { Request, Response, NextFunction } from 'express';
import { BalanceService } from './balance.service';

export class BalanceController {
  private balanceService = BalanceService.getInstance();

  public getBalance = (req: Request, res: Response): void => {
    const data = this.balanceService.getBalance();
    res.status(200).json({ success: true, data });
  };

  public getLedger = (req: Request, res: Response): void => {
    const data = this.balanceService.getLedger();
    res.status(200).json({ success: true, data });
  };

  public syncBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.balanceService.syncBitcashPortal();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
