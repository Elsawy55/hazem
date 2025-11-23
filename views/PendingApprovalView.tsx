
import React from 'react';
import { Clock, RefreshCcw, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const PendingApprovalView: React.FC = () => {
  const { auth, logout, checkAuth, t } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={40} />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('pendingApprovalTitle')}</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {t('pendingApprovalDesc')}
        </p>

        <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left border border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('profile')}</p>
          <p className="font-bold text-slate-800">{auth.user?.name}</p>
          <p className="text-sm text-slate-500">{auth.user?.phoneNumber}</p>
        </div>

        <div className="space-y-3">
          <Button fullWidth onClick={async () => {
            try {
              await checkAuth();
              // Force a small delay to ensure state updates
              setTimeout(() => {
                const currentUser = JSON.parse(localStorage.getItem('hafiz_user_session') || '{}');
                if (currentUser.status === 'ACTIVE') {
                  window.location.reload(); // Force reload to show dashboard
                } else {
                  alert(t('statusRefreshed') || 'Status refreshed - still pending approval');
                }
              }, 500);
            } catch (e) {
              alert('Error refreshing status');
            }
          }} icon={<RefreshCcw size={18} />}>
            {t('refreshStatus')}
          </Button>
          <Button fullWidth variant="ghost" onClick={logout} icon={<LogOut size={18} />}>
            {t('logout')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
