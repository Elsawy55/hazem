import React from 'react';
import { SessionStatus } from '../../types';
import { useApp } from '../../context/AppContext';

export const Badge: React.FC<{ status: SessionStatus; className?: string }> = ({ status, className = '' }) => {
  const { t } = useApp();
  let styles = '';
  let label = '';

  switch (status) {
    case SessionStatus.IN_PROGRESS:
      styles = 'bg-blue-100 text-blue-700 border-blue-200';
      label = t('statusInProgress');
      break;
    case SessionStatus.READY:
      styles = 'bg-primary-100 text-primary-700 border-primary-200';
      label = t('statusReady');
      break;
    case SessionStatus.WAITING:
      styles = 'bg-amber-50 text-amber-600 border-amber-100';
      label = t('statusWaiting');
      break;
    case SessionStatus.COMPLETED:
      styles = 'bg-slate-100 text-slate-600 border-slate-200';
      label = t('statusCompleted');
      break;
    case SessionStatus.ABSENT:
      styles = 'bg-red-50 text-red-600 border-red-100';
      label = t('statusAbsent');
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full me-1.5 ${status === SessionStatus.IN_PROGRESS ? 'animate-pulse bg-blue-500' : 'bg-current'}`}></span>
      {label}
    </span>
  );
};