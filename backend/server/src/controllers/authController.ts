/**
 * Sola Vacation Rentals — Server Auth Controller
 * Location: server/src/controllers/authController.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import { AuthService } from '../services/authService.js';
import type { ApiSuccessResponse, ApiErrorResponse } from '../types/server';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService = new AuthService()) {
    this.authService = authService;
  }

  async requestOtp(phone: string): Promise<ApiSuccessResponse<{ success: boolean; message: string }> | ApiErrorResponse> {
    try {
      const result = await this.authService.requestOtp(phone);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const isRateLimit = err.message?.includes('RATE_LIMIT') || err.message?.includes('MAX_3_OTP');
      return {
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : (err.message || 'INTERNAL_SERVER_ERROR'),
          message: isRateLimit
            ? 'تم طلب رمز الدخول عدة مرات. يرجى المحاولة مرة أخرى بعد قليل.'
            : (err.message || 'حدث خطأ غير متوقع'),
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyOtp(phone: string, code: string, surface: 'CUSTOMER' | 'OWNER'): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    if (!surface || (surface !== 'CUSTOMER' && surface !== 'OWNER')) {
      return {
        success: false,
        error: {
          code: 'MISSING_OR_INVALID_AUTH_SURFACE',
          message: 'يجب تحديد نوع واجهة الدخول (CUSTOMER أو OWNER)',
        },
        timestamp: new Date().toISOString(),
      };
    }
    try {
      const result = await this.authService.verifyOtp(phone, code, surface);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err?.message === 'OWNER_ALREADY_EXISTS') {
        return {
          success: false,
          error: { code: 'OWNER_ALREADY_EXISTS', message: 'لديك حساب مالك بالفعل، سجّل الدخول للوصول إلى حسابك.' },
          timestamp: new Date().toISOString(),
        };
      }
      return {
        success: false,
        error: {
          code: err.message || 'UNAUTHORIZED',
          message: err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async prototypeLogin(
    phone: string,
    surface: 'CUSTOMER' | 'OWNER',
    fullName?: string | null,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    if (!surface || (surface !== 'CUSTOMER' && surface !== 'OWNER')) {
      return {
        success: false,
        error: {
          code: 'MISSING_OR_INVALID_AUTH_SURFACE',
          message: 'يجب تحديد نوع واجهة الدخول (CUSTOMER أو OWNER)',
        },
        timestamp: new Date().toISOString(),
      };
    }
    if (!phone) {
      return {
        success: false,
        error: {
          code: 'MISSING_PHONE_NUMBER',
          message: 'يرجى إدخال رقم الهاتف',
        },
        timestamp: new Date().toISOString(),
      };
    }
    try {
      const result = await this.authService.prototypeLogin(phone, surface, fullName, deviceInfo, ipAddress);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message || 'INTERNAL_SERVER_ERROR',
          message: err.message || 'حدث خطأ غير متوقع',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async registerOwner(
    phone: string,
    fullName: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    if (!phone || !fullName?.trim()) {
      return {
        success: false,
        error: { code: 'OWNER_REGISTRATION_REQUIRED_FIELDS_MISSING', message: 'يرجى إدخال الاسم الكامل ورقم الهاتف المصري.' },
        timestamp: new Date().toISOString(),
      };
    }
    try {
      const result = await this.authService.registerOwner(phone, fullName, deviceInfo, ipAddress);
      return { success: true, data: result, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return {
        success: false,
        error: { code: err.message || 'OWNER_REGISTRATION_FAILED', message: 'تعذر إنشاء حساب المالك. حاول مرة أخرى.' },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async adminLogin(email: string, password_raw: string): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    try {
      const result = await this.authService.adminLogin(email, password_raw);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message || 'INVALID_ADMIN_CREDENTIALS',
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async refreshSession(refreshToken: string): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    try {
      const result = await this.authService.refreshSession(refreshToken);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message || 'UNAUTHORIZED',
          message: 'جلسة عمل منتهية الصلاحية',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async revokeSession(refreshToken: string): Promise<ApiSuccessResponse<any> | ApiErrorResponse> {
    try {
      const result = await this.authService.revokeSession(refreshToken);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message || 'BAD_REQUEST',
          message: err.message || 'فشل إلغاء الجلسة',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
