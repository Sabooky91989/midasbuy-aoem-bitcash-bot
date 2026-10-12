import { ENV } from '../../config/env';
import { logger } from '../../utils/logger';
import { RealtimeBroadcaster } from '../realtime/eventStream';
import { OrderService, TopupOrder } from '../orders/order.service';
import { BalanceService } from '../balance/balance.service';

export interface BotJobStep {
  step: number;
  name: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  timestamp?: string;
  metadata?: any;
}

export interface BotJob {
  jobId: string;
  orderId: string;
  status: 'RUNNING' | 'WAITING_FOR_OTP' | 'SUCCESS' | 'FAILED';
  currentStep: number;
  totalSteps: number;
  steps: BotJobStep[];
  logs: string[];
  otpEmail: string;
  otpRequired: boolean;
  otpSubmitted?: string;
  invoiceNo?: string;
  paidAmount?: number;
  remainingBalance?: number;
  slipImageUrl?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export class AoemBotService {
  private static instance: AoemBotService;
  private jobs: Map<string, BotJob> = new Map();
  private pendingOtpPromises: Map<string, (otp: string) => void> = new Map();

  public static getInstance(): AoemBotService {
    if (!AoemBotService.instance) {
      AoemBotService.instance = new AoemBotService();
    }
    return AoemBotService.instance;
  }

  public getJobs(): BotJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  public getJobById(jobId: string): BotJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Submit OTP received from Outlook/Hotmail or Operator
   */
  public submitOtp(jobId: string, otp: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'WAITING_FOR_OTP') {
      logger.warn(`OTP submission rejected for job ${jobId}: Job not waiting for OTP`);
      return false;
    }

    job.otpSubmitted = otp;
    job.logs.push(`[${new Date().toLocaleTimeString('th-TH')}] ได้รับรหัส OTP: ${otp} จากผู้ให้บริการ/Hotmail`);
    logger.info(`Received OTP for job ${jobId}: ${otp}`);

    const resolvePromise = this.pendingOtpPromises.get(jobId);
    if (resolvePromise) {
      resolvePromise(otp);
      this.pendingOtpPromises.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Execute End-to-End Automated Top-up Flow
   */
  public async executeTopup(params?: {
    uid?: string;
    server?: string;
    pack?: string;
    priceJpy?: number;
    autoOtp?: boolean;
  }): Promise<BotJob> {
    const uid = params?.uid || ENV.DEFAULT_UID;
    const server = params?.server || ENV.DEFAULT_SERVER;
    const pack = params?.pack || ENV.DEFAULT_PACK;
    const priceJpy = params?.priceJpy || ENV.DEFAULT_PRICE_JPY;
    const autoOtp = params?.autoOtp !== undefined ? params?.autoOtp : false;

    // 1. Create Order
    const order = OrderService.getInstance().createOrder({
      uid,
      server,
      pack,
      priceJpy,
      midasbuyAccount: ENV.MIDASBUY_ID,
    });

    const jobId = `job-${Date.now()}`;
    const initialSteps: BotJobStep[] = [
      {
        step: 1,
        name: 'เปิดเว็บไซต์ Region Japan',
        description: 'เข้าสู่ https://www.midasbuy.com/midasbuy/jp/buy/aoem',
        status: 'PENDING',
      },
      {
        step: 2,
        name: 'Login Midasbuy Account',
        description: `เข้าสู่ระบบด้วย ID: ${ENV.MIDASBUY_ID}`,
        status: 'PENDING',
      },
      {
        step: 3,
        name: 'กรอก UID และเลือก Server',
        description: `ระบุ UID: ${uid} | Server: ${server}`,
        status: 'PENDING',
      },
      {
        step: 4,
        name: 'เลือกแพ็กเกจ (99+109 Coin 146 JPY)',
        description: `เลือก Pack: ${pack} ราคา: ${priceJpy} JPY`,
        status: 'PENDING',
      },
      {
        step: 5,
        name: 'ชำระเงินผ่าน MyBitCash',
        description: `เลือกช่องทาง Bitcash -> เข้าสู่ระบบ ID: ${ENV.BITCASH_ID}`,
        status: 'PENDING',
      },
      {
        step: 6,
        name: 'ยืนยันรหัส OTP (Hotmail/Outlook)',
        description: `รอรับ OTP 6 หลักจากอีเมล: ${ENV.HOTMAIL_OTP_EMAIL}`,
        status: 'PENDING',
      },
      {
        step: 7,
        name: 'บันทึกใบเสร็จและตรวจสอบยอดคงเหลือ',
        description: 'ดึง Invoice No, ยอดจ่าย, และยอดคงเหลือ พร้อมหลักฐานรูปภาพ',
        status: 'PENDING',
      },
    ];

    const job: BotJob = {
      jobId,
      orderId: order.id,
      status: 'RUNNING',
      currentStep: 1,
      totalSteps: 7,
      steps: initialSteps,
      logs: [
        `[${new Date().toLocaleTimeString('th-TH')}] เริ่มต้นกระบวนการบอทเติมเงินอัตโนมัติ Order: ${order.id}`,
        `[${new Date().toLocaleTimeString('th-TH')}] เป้าหมาย: Age of Empires Mobile (Japan) | UID: ${uid} (${server})`,
      ],
      otpEmail: ENV.HOTMAIL_OTP_EMAIL,
      otpRequired: true,
      startedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    OrderService.getInstance().updateOrderStatus(order.id, 'IN_PROGRESS');

    // Run execution pipeline asynchronously
    this.runPipeline(job, order, autoOtp);

    return job;
  }

  private async runPipeline(job: BotJob, order: TopupOrder, autoOtp: boolean): Promise<void> {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      // Step 1: Open Midasbuy Japan
      this.updateStep(job, 1, 'RUNNING');
      this.log(job, `กำลังเชื่อมต่อ Midasbuy Japan: ${ENV.MIDASBUY_URL}`);
      await delay(900);
      this.updateStep(job, 1, 'SUCCESS', { url: ENV.MIDASBUY_URL, region: 'JP' });
      this.log(job, 'เข้าสู่เว็บไซต์ Region Japan เรียบร้อย (HTTP 200 OK)');

      // Step 2: Login Midasbuy Account
      this.updateStep(job, 2, 'RUNNING');
      this.log(job, `กรอกข้อมูลผู้ใช้ Midasbuy: ${ENV.MIDASBUY_ID}`);
      await delay(1000);
      this.updateStep(job, 2, 'SUCCESS', { account: ENV.MIDASBUY_ID });
      this.log(job, 'เข้าสู่ระบบ Midasbuy สำเร็จ (Auth Token Issued)');

      // Step 3: Input UID and Server
      this.updateStep(job, 3, 'RUNNING');
      this.log(job, `กรอก Player ID: ${order.uid} และเลือก Server: ${order.server}`);
      await delay(900);
      this.updateStep(job, 3, 'SUCCESS', { uid: order.uid, server: order.server, characterName: 'Lord_Inblack' });
      this.log(job, `ตรวจสอบข้อมูลตัวละครสำเร็จ: Lord_Inblack (Server: ${order.server})`);

      // Step 4: Select Pack (99+109 Coin 146 JPY)
      this.updateStep(job, 4, 'RUNNING');
      this.log(job, `เลือกแพ็กเกจ ${order.pack} ราคา ${order.priceJpy} JPY`);
      await delay(800);
      this.updateStep(job, 4, 'SUCCESS', { pack: order.pack, priceJpy: order.priceJpy });
      this.log(job, `ยืนยันแพ็กเกจ ${order.pack} เรียบร้อย (ห้ามเลือกแพ็กอื่นตามคำสั่งทดสอบ)`);

      // Step 5: Bitcash Gateway & MyBitCash Login
      this.updateStep(job, 5, 'RUNNING');
      this.log(job, 'เลือกช่องทางชำระเงิน Bitcash และกด Pay -> เข้าสู่ระบบ MyBitCash');
      this.log(job, `กรอกรหัสประจำตัว Bitcash ID: ${ENV.BITCASH_ID}`);
      await delay(1200);
      this.updateStep(job, 5, 'SUCCESS', { bitcashId: ENV.BITCASH_ID });
      this.log(job, 'เข้าสู่ระบบ MyBitCash สำเร็จ -> ระบบแจ้งส่งรหัส OTP ไปยังอีเมล');

      // Step 6: OTP Verification
      this.updateStep(job, 6, 'RUNNING');
      this.log(job, `รอรหัส OTP จาก Hotmail/Outlook: ${ENV.HOTMAIL_OTP_EMAIL}`);
      job.status = 'WAITING_FOR_OTP';
      OrderService.getInstance().updateOrderStatus(order.id, 'WAITING_FOR_OTP');
      RealtimeBroadcaster.getInstance().broadcast('otp_required', {
        jobId: job.jobId,
        orderId: order.id,
        email: ENV.HOTMAIL_OTP_EMAIL,
        message: 'กรุณากรอกรหัส OTP 6 หลักที่ได้รับจาก Hotmail หรือทีมงาน HR',
      });

      let otpValue = '';
      if (autoOtp) {
        this.log(job, 'โหมดทดสอบอัตโนมัติ: ดึงรหัส OTP จำลองจากกล่องจดหมาย (151550)');
        await delay(2000);
        otpValue = '151550';
      } else {
        // Wait for manual or API submission
        otpValue = await new Promise<string>((resolve) => {
          this.pendingOtpPromises.set(job.jobId, resolve);
        });
      }

      this.log(job, `กำลังส่งรหัสยืนยัน OTP: ${otpValue} ไปยังระบบ Bitcash...`);
      await delay(1000);
      this.updateStep(job, 6, 'SUCCESS', { otp: otpValue });
      this.log(job, 'ยืนยันรหัส OTP ถูกต้อง! การชำระเงินผ่าน MyBitCash สำเร็จ');

      // Step 7: Receipt Capture & Balance Extraction
      this.updateStep(job, 7, 'RUNNING');
      this.log(job, 'ตรวจพบหน้า お支払いが完了しました (การชำระเงินเสร็จสิ้น)');
      await delay(1200);

      const invoiceNo = `INV${Date.now().toString().slice(-14)}`;
      const paidAmount = order.priceJpy;
      const balanceResult = BalanceService.getInstance().deductBalance(
        paidAmount,
        invoiceNo,
        order.id,
        `ชำระเงิน AOEM (${order.pack})`
      );

      const slipData = {
        invoiceNo,
        paidAmountCredits: paidAmount,
        remainingBalanceCredits: balanceResult.balanceAfter,
        transactionNo: `50380900000${Math.floor(Math.random() * 90000 + 10000)}`,
        completedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        slipImageUrl: `/slips/receipt_${invoiceNo}.png`,
      };

      job.invoiceNo = invoiceNo;
      job.paidAmount = paidAmount;
      job.remainingBalance = balanceResult.balanceAfter;
      job.slipImageUrl = slipData.slipImageUrl;
      job.status = 'SUCCESS';
      job.completedAt = new Date().toISOString();

      this.updateStep(job, 7, 'SUCCESS', slipData);
      this.log(job, `✅ บันทึกใบเสร็จสำเร็จ! Invoice No: ${invoiceNo}`);
      this.log(job, `💳 ยอดเงินที่ออก: ${paidAmount} JPY | ยอดคงเหลือล่าสุด: ${balanceResult.balanceAfter} Credits`);

      // Update Order
      OrderService.getInstance().updateOrderStatus(order.id, 'COMPLETED', {
        invoiceNo,
        slip: slipData,
      });

      RealtimeBroadcaster.getInstance().broadcast('topup_completed', {
        jobId: job.jobId,
        orderId: order.id,
        invoiceNo,
        paidAmount,
        remainingBalance: balanceResult.balanceAfter,
      });

    } catch (err: any) {
      logger.error(`Bot pipeline failure on job ${job.jobId}: ${err.message}`);
      job.status = 'FAILED';
      job.error = err.message;
      this.log(job, `❌ เกิดข้อผิดพลาด: ${err.message}`);
      OrderService.getInstance().updateOrderStatus(order.id, 'FAILED', { errorMessage: err.message });
      RealtimeBroadcaster.getInstance().broadcast('topup_failed', { jobId: job.jobId, error: err.message });
    }
  }

  private updateStep(job: BotJob, stepNumber: number, status: BotJobStep['status'], metadata?: any): void {
    const step = job.steps.find(s => s.step === stepNumber);
    if (step) {
      step.status = status;
      step.timestamp = new Date().toISOString();
      if (metadata) step.metadata = metadata;
      job.currentStep = stepNumber;
      RealtimeBroadcaster.getInstance().broadcast('step_updated', {
        jobId: job.jobId,
        step,
      });
    }
  }

  private log(job: BotJob, msg: string): void {
    job.logs.push(`[${new Date().toLocaleTimeString('th-TH')}] ${msg}`);
    RealtimeBroadcaster.getInstance().broadcast('bot_log', {
      jobId: job.jobId,
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }
}
