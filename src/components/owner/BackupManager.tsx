import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Chip,
  Divider
} from '@mui/material';
import {
  BackupOutlined,
  CloudDownload,
  Schedule,
  Email,
  Security
} from '@mui/icons-material';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';

const BackupManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  const triggerManualBackup = async () => {
    if (!currentUser?.restaurantId) {
      setError('Restaurant ID not found');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const functions = getFunctions();
      const triggerBackup = httpsCallable(functions, 'triggerBackup');
      const result = await triggerBackup({ 
        restaurantId: currentUser.restaurantId 
      });

      console.log('Manual backup result:', result.data);
      
      setSuccess('✅ Manual backup completed successfully! Check your email for backup details and statistics.');
      
    } catch (error: any) {
      console.error('Manual backup failed:', error);
      const errorMessage = error.message || 'Backup failed. Please try again.';
      setError(`❌ Backup failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <BackupOutlined sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h6" component="h2" fontWeight={600}>
            Data Backup Management
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Secure automated backups of all your restaurant data including bills, menu items, staff records, and more.
        </Typography>

        {/* Backup Features */}
        <Box mb={3}>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            📦 Backup Features:
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            <Chip 
              icon={<Schedule />} 
              label="Monthly Auto-Backup" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<Email />} 
              label="Email Reports" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<Security />} 
              label="Secure Storage" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<CloudDownload />} 
              label="On-Demand" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            <strong>Automatic Schedule:</strong> 1st of every month at 2:00 AM<br/>
            <strong>Includes:</strong> Bills, Menu Items, Staff Records, User Accounts, Expenses<br/>
            <strong>Email Report:</strong> Detailed backup summary with monthly performance stats
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Manual Backup Section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            🎛️ Manual Backup:
          </Typography>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create an immediate backup of all your restaurant data. You'll receive an email confirmation with backup details.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BackupOutlined />}
            onClick={triggerManualBackup}
            disabled={loading}
            fullWidth
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              mb: 2
            }}
          >
            {loading ? 'Creating Backup...' : '📦 Create Backup Now'}
          </Button>
        </Box>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Additional Info */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>💡 Pro Tip:</strong> Your data is automatically backed up monthly. Manual backups are useful before major changes or for immediate peace of mind.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            <strong>🔒 Security:</strong> All backups are encrypted and stored securely in Google Cloud Storage with restaurant-level isolation.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BackupManager; 