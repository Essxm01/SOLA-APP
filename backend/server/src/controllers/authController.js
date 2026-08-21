/**
 * Sola Vacation Rentals — Server Auth Controller
 * Location: server/src/controllers/authController.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { AuthService } from '../services/authService.js';
export class AuthController {
    authService;
    constructor(authService = new AuthService()) {
        this.authService = authService;
    }
    async requestOtp(phone) {
        try {
            const result = await this.authService.requestOtp(phone);
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
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
    async verifyOtp(phone, code, surface) {
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
        }
        catch (err) {
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
    async adminLogin(email, password_raw) {
        try {
            const result = await this.authService.adminLogin(email, password_raw);
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
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
    async refreshSession(refreshToken) {
        try {
            const result = await this.authService.refreshSession(refreshToken);
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
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
    async revokeSession(refreshToken) {
        try {
            const result = await this.authService.revokeSession(refreshToken);
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
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
