import React, { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, Button, Fade, Alert, Stack, Tooltip, LinearProgress, Skeleton, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import TimerIcon from '@mui/icons-material/Timer';
import RefreshButton from '../common/RefreshButton';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SubscriptionManagementProps {
  // Optional QA-only scenario retained, but real data is preferred
  qaScenario?: 'active' | 'expiring' | 'expired';
}

type FirestoreSubscription = {
  planId?: 'starter' | 'pro' | 'enterprise';
  status?: 'active' | 'past_due' | 'expired' | 'canceled' | 'trialing';
  currentPeriodStart?: any;
  currentPeriodEnd?: any;
};

function planIdToName(planId?: string): string {
  switch (planId) {
    case 'starter': return 'Starter Plan';
    case 'pro': return 'Pro Plan';
    case 'enterprise': return 'Enterprise Plan';
    default: return 'Pro Plan';
  }
}

function getDaysRemaining(endDateIso: string): number {
  const now = new Date();
  const end = new Date(endDateIso);
  const diffMs = end.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusColor(daysRemaining: number): { color: string; label: string; icon: React.ReactNode } {
  if (daysRemaining <= 0) {
    return { color: '#ef5350', label: 'Expired', icon: <ReportProblemIcon fontSize="small" /> };
  }
  if (daysRemaining < 10) {
    return { color: '#fb8c00', label: 'Expiring Soon', icon: <ErrorOutlineIcon fontSize="small" /> };
  }
  return { color: '#43a047', label: 'Active', icon: <CheckCircleIcon fontSize="small" /> };
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ qaScenario }) => {
  const [data, setData] = React.useState<{ planName: string; startDate: string; endDate: string; status: 'active' | 'expiring' | 'expired'; } | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [bannerVisible, setBannerVisible] = useState(true);
  const { currentUser } = useAuth();

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setBannerVisible(true);
      // Real-time Firestore subscription; falls back gracefully if missing
      const rid = currentUser?.restaurantId;
      if (!rid) {
        setError('Missing restaurant context');
        return;
      }
      const ref = doc(db, 'restaurantProfile', rid);
      const unsub = onSnapshot(ref, (snap) => {
        const d = snap.data() as any;
        const sub: FirestoreSubscription | undefined = d?.subscription;
        if (!sub || !sub.currentPeriodEnd) {
          setError('No subscription found');
          setData(null);
          return;
        }
        const start = sub.currentPeriodStart?.toDate ? sub.currentPeriodStart.toDate() : new Date();
        const end = sub.currentPeriodEnd?.toDate ? sub.currentPeriodEnd.toDate() : new Date();
        const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const status = daysLeft <= 0 ? 'expired' : (daysLeft < 10 ? 'expiring' : 'active');
        setData({
          planName: planIdToName(sub.planId),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status,
        });
      }, (err) => {
        setError('Failed to load subscription');
        console.error('Subscription snapshot error:', err);
      });
      // Store unsubscribe on window to allow manual refresh to resubscribe
      (window as any).__sub_unsub && (window as any).__sub_unsub();
      (window as any).__sub_unsub = unsub;
    } catch (e) {
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.restaurantId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const daysRemaining = useMemo(() => (data ? getDaysRemaining(data.endDate) : 0), [data]);
  const totalDays = useMemo(() => {
    if (!data) return 0;
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    const diff = Math.max(0, end - start);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [data]);
  const usedDays = Math.max(0, (totalDays || 0) - Math.max(0, daysRemaining));
  const percentRemaining = totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysRemaining / totalDays) * 100))) : 0;
  const statusMeta = useMemo(() => getStatusColor(daysRemaining), [daysRemaining]);

  const websiteBase = process.env.REACT_APP_WEBSITE_BASE_URL || 'https://sura-resto.vercel.app';
  const manageUrl = currentUser?.restaurantId
    ? `${websiteBase}/renew?rid=${encodeURIComponent(currentUser.restaurantId)}&plan=${encodeURIComponent((data?.planName || 'Pro').toLowerCase().includes('starter') ? 'starter' : (data?.planName || '').toLowerCase().includes('enterprise') ? 'enterprise' : 'pro')}`
    : `${websiteBase}/renew`;

  const openManage = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(manageUrl);
    } else {
      window.open(manageUrl, '_blank', 'noopener');
    }
  };

  const showWarning = data && daysRemaining > 0 && daysRemaining < 10;
  const isExpired = data && daysRemaining <= 0;

  return (
    <Box>
      <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', boxShadow: '0 10px 28px rgba(106,27,154,0.14)', border: '1px solid rgba(106,27,154,0.12)' }}>
        <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <WorkspacePremiumIcon />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.1 }}>Subscription Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>Manage your plan, billing and renewals</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={statusMeta.label} icon={statusMeta.icon as any} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.35)', fontWeight: 600 }} />
            <RefreshButton onClick={load} refreshing={loading} color="#fff" hoverBg="rgba(255,255,255,0.18)" disabledColor="rgba(255,255,255,0.6)" />
          </Stack>
        </Box>

        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>
          )}

          {!data && loading ? (
            <Box>
              <Skeleton variant="rounded" height={64} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" height={18} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={18} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={18} sx={{ mb: 3 }} />
              <Skeleton variant="rounded" height={120} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
                    <Metric label="Plan" value={data?.planName || '—'} icon={<WorkspacePremiumIcon fontSize="small" />} />
                    <Metric label="Start Date" value={data ? formatDate(data.startDate) : '—'} icon={<CalendarTodayIcon fontSize="small" />} />
                    <Metric label="End Date" value={data ? formatDate(data.endDate) : '—'} icon={<EventBusyIcon fontSize="small" />} />
                  </Box>

                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TimerIcon sx={{ color: '#6A1B9A' }} fontSize="small" />
                        <Typography variant="subtitle2" sx={{ color: '#6A1B9A', fontWeight: 600 }}>Time Remaining</Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>{Math.max(0, daysRemaining)} days left</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentRemaining}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: '#f3e8fd',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: isExpired ? '#ef5350' : (daysRemaining < 10 ? '#fb8c00' : '#6A1B9A')
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>{usedDays} used</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>{percentRemaining}% remaining</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ p: 2.5, border: '1px solid #eee', borderRadius: 2, background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8fd 100%)' }}>
                  <Typography variant="subtitle2" sx={{ color: '#6A1B9A', fontWeight: 700, mb: 1.5 }}>Plan Benefits</Typography>
                  <List dense>
                    {[
                      'Unlimited bills & order management',
                      'Advanced revenue analytics',
                      'Priority support',
                      'Multi-user roles (Owner, Manager)',
                    ].map((benefit) => (
                      <ListItem key={benefit} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckCircleOutlineIcon fontSize="small" sx={{ color: '#6A1B9A' }} />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" spacing={1}>
                    <Button onClick={openManage} variant="contained" size="small" sx={{ bgcolor: '#6A1B9A' }}>Manage Plan</Button>
                    <Button component="a" href="https://sura-resto.com/support" target="_blank" rel="noreferrer" variant="outlined" size="small" startIcon={<SupportAgentIcon />}>
                      Support
                    </Button>
                  </Stack>
                </Box>
              </Box>

              <Fade in={Boolean((showWarning || isExpired) && bannerVisible)} timeout={400}>
                <Box sx={{ mt: 2 }}>
                  {isExpired ? (
                    <Alert
                      severity="error"
                      icon={<ReportProblemIcon />}
                      action={
                        <Button onClick={openManage} variant="contained" size="small" sx={{ bgcolor: '#d32f2f' }}>
                          Renew Now
                        </Button>
                      }
                      sx={{ alignItems: 'center' }}
                    >
                      Your subscription has expired. Renew to continue uninterrupted service.
                    </Alert>
                  ) : showWarning ? (
                    <Alert
                      severity="warning"
                      icon={<ErrorOutlineIcon />}
                      action={
                        <Button onClick={openManage} variant="contained" size="small" sx={{ bgcolor: '#fb8c00' }}>
                          Renew Now
                        </Button>
                      }
                    >
                      Your subscription will expire in {daysRemaining} days. Renew now to avoid interruption.
                    </Alert>
                  ) : (
                    <Alert icon={<InfoOutlinedIcon />} severity="info" sx={{ alignItems: 'center' }}>
                      Your plan is active. You can upgrade, pause, or renew anytime from Manage Plan.
                    </Alert>
                  )}
                </Box>
              </Fade>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const Metric: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
	<Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #eee' }}>
		<Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
		<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
			{icon}
			<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{value}</Typography>
		</Box>
	</Box>
);

export default SubscriptionManagement;


