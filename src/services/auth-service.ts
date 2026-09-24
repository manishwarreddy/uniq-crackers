import { Role, UserSession } from '@/types';

export class AuthService {
  /**
   * Evaluates if a role is authorized to perform admin-level tasks
   */
  static isAdmin(role: Role): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  /**
   * Evaluates if a role is authorized to perform staff or management tasks
   */
  static isStaffOrAdmin(role: Role): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';
  }

  /**
   * Evaluates if an entity is a registered delivery agent
   */
  static isDeliveryAgent(role: Role): boolean {
    return role === 'DELIVERY_AGENT';
  }

  /**
   * Checks resource ownership or privileged role
   */
  static canAccessCustomerData(session: UserSession, targetCustomerId: string): boolean {
    if (this.isStaffOrAdmin(session.role)) return true;
    return session.userId === targetCustomerId;
  }
}
