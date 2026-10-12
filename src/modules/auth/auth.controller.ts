import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';

const midasbuyLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  keepSignedIn: z.boolean().optional(),
});

const bitcashLoginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
});

const operatorLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export class AuthController {
  private authService = AuthService.getInstance();

  // Midasbuy
  public getMidasbuyStatus = (req: Request, res: Response): void => {
    const session = this.authService.getMidasbuySession();
    res.status(200).json({ success: true, data: session });
  };

  public loginMidasbuy = (req: Request, res: Response): void => {
    try {
      const { email, password } = midasbuyLoginSchema.parse(req.body);
      const result = this.authService.loginMidasbuy(email, password);
      if (!result.success) {
        res.status(401).json({ success: false, error: result.error });
        return;
      }
      res.status(200).json({ success: true, data: result.session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  public logoutMidasbuy = (req: Request, res: Response): void => {
    this.authService.logoutMidasbuy();
    res.status(200).json({ success: true, message: 'Logged out from Midasbuy' });
  };

  // Bitcash
  public getBitcashStatus = (req: Request, res: Response): void => {
    const session = this.authService.getBitcashSession();
    res.status(200).json({ success: true, data: session });
  };

  public loginBitcash = (req: Request, res: Response): void => {
    try {
      const { id, password } = bitcashLoginSchema.parse(req.body);
      const result = this.authService.loginBitcash(id, password);
      if (!result.success) {
        res.status(401).json({ success: false, error: result.error });
        return;
      }
      res.status(200).json({ success: true, data: result.session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  // Operator
  public getOperatorStatus = (req: Request, res: Response): void => {
    const session = this.authService.getOperatorSession();
    res.status(200).json({ success: true, data: session });
  };

  public loginOperator = (req: Request, res: Response): void => {
    try {
      const { username, password } = operatorLoginSchema.parse(req.body);
      const result = this.authService.loginOperator(username, password);
      if (!result.success) {
        res.status(401).json({ success: false, error: result.error });
        return;
      }
      res.status(200).json({ success: true, data: result.session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}
