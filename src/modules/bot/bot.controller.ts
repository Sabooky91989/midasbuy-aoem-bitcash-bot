import { Request, Response, NextFunction } from 'express';
import { AoemBotService } from './aoemBot.service';
import { z } from 'zod';

const topupSchema = z.object({
  uid: z.string().optional(),
  server: z.string().optional(),
  pack: z.string().optional(),
  priceJpy: z.number().optional(),
  autoOtp: z.boolean().optional(),
});

const otpSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain numbers only'),
});

export class BotController {
  private botService = AoemBotService.getInstance();

  public execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = topupSchema.parse(req.body);
      const job = await this.botService.executeTopup(parsed);
      res.status(202).json({
        success: true,
        message: 'Bot top-up job initialized successfully',
        data: job,
      });
    } catch (err) {
      next(err);
    }
  };

  public getJobs = (req: Request, res: Response): void => {
    const jobs = this.botService.getJobs();
    res.status(200).json({ success: true, data: jobs });
  };

  public getJobById = (req: Request, res: Response): void => {
    const job = this.botService.getJobById(req.params.id as string);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    res.status(200).json({ success: true, data: job });
  };

  public submitOtp = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { jobId, otp } = otpSchema.parse(req.body);
      const success = this.botService.submitOtp(jobId, otp);
      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Job is not waiting for OTP or jobId is invalid',
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'OTP submitted successfully to the bot engine',
      });
    } catch (err) {
      next(err);
    }
  };
}
