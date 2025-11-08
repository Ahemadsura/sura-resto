import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscriptionManagement from './subscription/SubscriptionManagement';
import { useAuth } from '../../contexts/SupabaseAuthContext';

const blurWrapperStyle: React.CSSProperties = {
  filter: 'blur(4px)',
  pointerEvents: 'none',
  userSelect: 'none',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '24px',
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'saturate(180%) blur(2px)',
  zIndex: 1500,
};

const SubscriptionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, isDeveloperBypass, isDeveloperAccount } = useSubscription();
  const { logout } = useAuth();
  const isExpired = !isDeveloperBypass && status === 'expired';

  return (
    <>
      <div style={isExpired ? blurWrapperStyle : undefined}>{children}</div>
      {isExpired && (
        <div style={overlayStyle}>
          <Box sx={{ maxWidth: 960, width: '100%', px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button size="small" variant="outlined" onClick={logout}>
                Log out
              </Button>
            </Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                🔒 Subscription Required
              </Typography>
              Your subscription has expired or payment is required to access the restaurant management system. 
              Please complete your subscription to continue using SURA.
            </Alert>
            <SubscriptionManagement />
          </Box>
        </div>
      )}
    </>
  );
};

export default SubscriptionGate;


