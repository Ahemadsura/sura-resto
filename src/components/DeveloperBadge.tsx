import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Code, Security } from '@mui/icons-material';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/SupabaseAuthContext';

const DeveloperBadge: React.FC = () => {
  const { isDeveloperAccount } = useSubscription();
  const { currentUser } = useAuth();

  if (!isDeveloperAccount) {
    return null;
  }

  return (
    <Tooltip 
      title={`Developer Account: ${currentUser?.email} - Unlimited access with no subscription restrictions`}
      arrow
    >
      <Chip
        icon={<Code />}
        label="DEVELOPER"
        size="small"
        sx={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          '& .MuiChip-icon': {
            color: 'white'
          },
          boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      />
    </Tooltip>
  );
};

export default DeveloperBadge;