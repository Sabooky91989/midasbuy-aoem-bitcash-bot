import { logger } from '../../utils/logger';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export interface MidasbuySession {
  isLoggedIn: boolean;
  email: string;
  token?: string;
  loginTime?: string;
  expiresAt?: string;
}

export interface BitcashSession {
  isLoggedIn: boolean;
  id: string;
  token?: string;
  loginTime?: string;
}

export interface OperatorSession {
  isLoggedIn: boolean;
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  token?: string;
}

export class AuthService {
  private static instance: AuthService;

  private operatorSession: OperatorSession = {
    isLoggedIn: true,
    username: 'admin@inblackm.com',
    role: 'ADMIN',
    token: 'op_token_9918231',
  };

  private midasbuySession: MidasbuySession = {
    isLoggedIn: true,
    email: 'Botfordevinblack@hotmail.com',
    token: 'mb_session_884172901c',
    loginTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  private bitcashSession: BitcashSession = {
    isLoggedIn: true,
    id: 'Inblackm7',
    token: 'bc_token_4819028',
    loginTime: new Date().toISOString(),
  };

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Operator Auth
  public getOperatorSession(): OperatorSession {
    return this.operatorSession;
  }

  public loginOperator(username: string, password: string): { success: boolean; session?: OperatorSession; error?: string } {
    if (
      (username === 'admin' || username === 'admin@inblackm.com') &&
      (password === 'testdev123' || password === 'inblackm2026')
    ) {
      this.operatorSession = {
        isLoggedIn: true,
        username: 'admin@inblackm.com',
        role: 'ADMIN',
        token: `op_token_${Date.now()}`,
      };
      logger.info(`Operator logged in: ${this.operatorSession.username}`);
      return { success: true, session: this.operatorSession };
    }
    return { success: false, error: 'Invalid operator credentials' };
  }

  public logoutOperator(): void {
    this.operatorSession = {
      isLoggedIn: false,
      username: '',
      role: 'OPERATOR',
    };
  }

  // Midasbuy Account Auth (PDF Page 1-2)
  public getMidasbuySession(): MidasbuySession {
    return this.midasbuySession;
  }

  public loginMidasbuy(email: string, password: string): { success: boolean; session?: MidasbuySession; error?: string } {
    // Validate credentials matching test sheet
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (email === 'Botfordevinblack@hotmail.com' && password === 'testdev123') {
      const now = new Date();
      this.midasbuySession = {
        isLoggedIn: true,
        email,
        token: `mb_auth_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        loginTime: now.toISOString(),
        expiresAt: new Date(now.getTime() + 86400000).toISOString(),
      };

      logger.info(`Midasbuy account logged in successfully: ${email}`);
      RealtimeBroadcaster.getInstance().broadcast('midasbuy_login_success', this.midasbuySession);

      return { success: true, session: this.midasbuySession };
    }

    return {
      success: false,
      error: 'ข้อมูลเข้าสู่ระบบ Midasbuy ไม่ถูกต้อง (ต้องใช้ Botfordevinblack@hotmail.com / testdev123)',
    };
  }

  public logoutMidasbuy(): void {
    this.midasbuySession = {
      isLoggedIn: false,
      email: '',
    };
    logger.info('Midasbuy account logged out');
    RealtimeBroadcaster.getInstance().broadcast('midasbuy_logged_out', this.midasbuySession);
  }

  // Bitcash Account Auth (PDF Page 4)
  public getBitcashSession(): BitcashSession {
    return this.bitcashSession;
  }

  public loginBitcash(id: string, password: string): { success: boolean; session?: BitcashSession; error?: string } {
    if (id === 'Inblackm7' && password === 'kanomtandede@7') {
      this.bitcashSession = {
        isLoggedIn: true,
        id,
        token: `bc_auth_${Date.now()}`,
        loginTime: new Date().toISOString(),
      };
      logger.info(`Bitcash account authenticated: ${id}`);
      return { success: true, session: this.bitcashSession };
    }

    return {
      success: false,
      error: 'ข้อมูลเข้าสู่ระบบ Bitcash ไม่ถูกต้อง (ต้องใช้ Inblackm7 / kanomtandede@7)',
    };
  }
}
