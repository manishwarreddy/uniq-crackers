import React from 'react';
import Link from 'next/link';
import { Flame, Shield, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';
import { STORE_DEFAULTS } from '@/lib/constants';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-amber-500/20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800 text-sm">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <span className="font-heading text-lg font-bold text-white tracking-tight">
                N CRACKERS
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Premium festival fireworks and crackers retail platform. Serving Velmala and adjoining
              localities within a strict 7 km radius with fast local delivery.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Award className="w-4 h-4 shrink-0" />
              <span>100% Certified Green Crackers (CSIR-NEERI)</span>
            </div>
          </div>

          {/* Delivery Center */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
              Dispatch Center
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{STORE_DEFAULTS.CENTER_LOCATION.ADDRESS}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Festival Hours: 7:00 AM – 11:30 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Geofence Boundary: 7.0 KM Maximum</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
              System Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/api/health" className="hover:text-amber-400 transition-colors">
                  System Health API Endpoint
                </Link>
              </li>
              <li>
                <Link href="/api/geo/check-radius?lat=17.5029&lng=78.2573" className="hover:text-amber-400 transition-colors">
                  7 KM Geofence API Inspector
                </Link>
              </li>
              <li>
                <span className="text-slate-500">PostgreSQL Relational Schema (Phase 0)</span>
              </li>
              <li>
                <span className="text-slate-500">Live GPS Realtime Architecture</span>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
              Direct Contact
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{STORE_DEFAULTS.SUPPORT_PHONE}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{STORE_DEFAULTS.SUPPORT_EMAIL}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2">
                WhatsApp alerts configured exclusively for Admin and Delivery Agent operations.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} N Crackers. Production Architecture Foundation.</p>
          <div className="flex items-center gap-4">
            <span>Velmala Hub (F6GQ+7PW)</span>
            <span>•</span>
            <span>PostgreSQL & Next.js Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
