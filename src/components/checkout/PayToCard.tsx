import React from 'react';
import { Landmark, Hash } from 'lucide-react';
import type { StoreSettings } from '../../types';
import CopyButton from '../ui/CopyButton';

interface PayToCardProps {
  settings: StoreSettings | null;
  reference: string;
  subtotal: number;
}

/** Standout, mobile-first "make payment to" card with tap-to-copy account number + reference. */
const PayToCard: React.FC<PayToCardProps> = ({ settings, reference, subtotal }) => {
  const acct = settings?.account_number?.trim();

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-lg">
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center gap-2">
        <Landmark className="h-5 w-5" />
        <h3 className="font-semibold tracking-tight">Make payment to</h3>
      </div>

      <div className="p-5 space-y-5">
        {!acct ? (
          <p className="text-sm text-amber-600">
            Bank details haven’t been set up yet. Please contact the store to complete payment.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Bank</p>
                <p className="font-medium text-slate-900">{settings?.bank_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Account Name</p>
                <p className="font-medium text-slate-900">{settings?.account_name ?? '—'}</p>
              </div>
            </div>

            {/* Big tap-to-copy account number */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Account Number</p>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(acct).catch(() => {});
                  }}
                  className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-slate-900 select-all"
                  aria-label="Copy account number"
                >
                  {acct}
                </button>
                <CopyButton
                  value={acct}
                  label="Copy"
                  className="shrink-0 bg-slate-900 text-white rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                />
              </div>
            </div>
          </>
        )}

        {/* Reference */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-700 mb-1">
            <Hash className="h-3.5 w-3.5" /> Payment reference
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-mono font-bold text-amber-900">{reference}</span>
            <CopyButton
              value={reference}
              label="Copy"
              className="shrink-0 text-amber-800 border border-amber-300 rounded-lg px-3 py-2 text-sm hover:bg-amber-100"
            />
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Use this as your transfer narration so we can match your payment.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="font-medium text-slate-700">Amount to pay</span>
          <span className="text-xl font-bold text-slate-900">
            {new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: 'NGN',
              minimumFractionDigits: 0,
            }).format(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayToCard;
