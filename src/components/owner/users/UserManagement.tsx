import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  AdminPanelSettings,
  Person
} from '@mui/icons-material';
import RefreshButton from "../common/RefreshButton";
import { 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface RestaurantUser {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'manager';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdBy: string;
}

interface UserFormData {
  email: string;
  password: string;
  displayName: string;
  role: 'manager';
}

interface UserManagementProps {
  users: RestaurantUser[];
  onRefreshUsers: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefreshUsers }) => {
  const [restaurantUsers, setRestaurantUsers] = useState<RestaurantUser[]>(users);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    email: '',
    password: '',
    displayName: '',
    role: 'manager'
  });
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [loadingUserOperation, setLoadingUserOperation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { currentUser } = useAuth();

  // Update local state when props change
  useEffect(() => {
    setRestaurantUsers(users);
  }, [users]);

  // Function to fix owner status
  const fixOwnerStatus = async () => {
    try {
      if (!currentUser?.restaurantId) return;
      
      // Update current user's isActive to true
      await updateDoc(
        doc(db, 'restaurantProfile', currentUser.restaurantId, 'users', currentUser.uid),
        { isActive: true }
      );
      
      setSuccess('Owner status updated successfully!');
      onRefreshUsers();
    } catch (error) {
      console.error('Error fixing owner status:', error);
      setError('Failed to update owner status');
    }
  };

  const handleAddUser = async () => {
    try {
      setLoadingUserOperation(true);
      
      if (!userFormData.email || !userFormData.password || !userFormData.displayName) {
        setError('Please fill in all required fields');
        return;
      }

      if (!currentUser?.restaurantId) {
        setError('Restaurant ID not found');
        return;
      }

      // Check manager limit (maximum 2 managers)
      const activeManagers = restaurantUsers.filter(user => user.role === 'manager' && user.isActive);
      if (activeManagers.length >= 2) {
        setError('Maximum limit of 2 managers reached. Please remove an existing manager before adding a new one.');
        return;
      }

      // Check if user already exists
      const existingUser = restaurantUsers.find(user => user.email === userFormData.email);
      if (existingUser) {
        setError('A user with this email already exists');
        return;
      }

      // Call Cloud Function to create user
      const functions = getFunctions();
      const createManagerUser = httpsCallable(functions, 'createManagerUser');
      
      const result = await createManagerUser({
        email: userFormData.email,
        password: userFormData.password,
        displayName: userFormData.displayName
      });

      setSuccess(`Manager ${userFormData.displayName} created successfully! They can now login with their credentials.`);
      setUserFormData({ email: '', password: '', displayName: '', role: 'manager' });
      setShowUserDialog(false);
      onRefreshUsers();

    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.code === 'functions/already-exists') {
        setError('A user with this email already exists');
      } else if (error.code === 'functions/permission-denied') {
        setError('You do not have permission to add managers');
      } else if (error.code === 'functions/resource-exhausted') {
        setError('Maximum limit of 2 managers reached. Please remove an existing manager before adding a new one.');
      } else {
        setError('Failed to add user: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoadingUserOperation(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // If trying to activate a manager, check the limit first
      if (!currentStatus) {
        const activeManagers = restaurantUsers.filter(user => user.role === 'manager' && user.isActive);
        if (activeManagers.length >= 2) {
          setError('Maximum limit of 2 active managers reached. Please deactivate an existing manager before activating this one.');
          return;
        }
      }

      const functions = getFunctions();
      const toggleManagerStatus = httpsCallable(functions, 'toggleManagerStatus');
      
      await toggleManagerStatus({
        userId: userId,
        isActive: !currentStatus
      });
      
      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      onRefreshUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      if (error.code === 'functions/resource-exhausted') {
        setError('Maximum limit of 2 active managers reached. Please deactivate an existing manager before activating this one.');
      } else {
      setError('Failed to update user status: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const functions = getFunctions();
      const removeManagerUser = httpsCallable(functions, 'removeManagerUser');
      
      await removeManagerUser({ userId: userId });
      setSuccess(`${userName} removed successfully`);
      onRefreshUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      setError('Failed to remove user: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <Box>
      {/* User Management Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
              👥 User Management
            </Typography>
            <RefreshButton onClick={onRefreshUsers} />
          </Box>
        </Box>

        {/* Manager Limit Alert */}
        <Alert 
          severity={restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 ? 'warning' : 'info'}
          sx={{ mb: 2 }}
        >
          Active Managers: {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2
        </Alert>

        {/* Add Manager Button */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Tooltip
            title={restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2
              ? 'Maximum 2 managers allowed. Remove an existing manager first.'
              : 'Add a new manager to help manage the restaurant'
            }
          >
            <span>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  if (setShowUserDialog) {
                    setShowUserDialog(true);
                  }
                }}
                disabled={restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2}
                sx={{
                  background: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2
                    ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                    : 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  '&:hover': {
                    background: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2
                      ? 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)'
                      : 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)'
                  },
                  boxShadow: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2
                    ? '0 4px 12px rgba(244, 67, 54, 0.3)'
                    : '0 6px 20px rgba(106, 27, 154, 0.3)',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 ? 'Manager Limit Reached' : 'Add Manager'}
              </Button>
            </span>
          </Tooltip>

          {/* Fix Owner Status Button */}
          {restaurantUsers.some(user => user.role === 'owner' && !user.isActive) && (
            <Button
              variant="outlined"
              onClick={fixOwnerStatus}
              sx={{
                borderColor: '#FF9800',
                color: '#FF9800',
                '&:hover': {
                  borderColor: '#F57C00',
                  bgcolor: 'rgba(255, 152, 0, 0.04)'
                }
              }}
            >
              Fix Owner Status
            </Button>
          )}
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {restaurantUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.role === 'owner' ? <AdminPanelSettings sx={{ color: '#FF9800' }} /> : <Person sx={{ color: '#6A1B9A' }} />}
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {user.displayName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role === 'owner' ? 'Owner' : 'Manager'} 
                      size="small"
                      color={user.role === 'owner' ? 'warning' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={user.isActive}
                        onChange={() => handleToggleUserStatus(user.id, user.isActive)}
                        disabled={user.role === 'owner' || (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50'),
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50')
                          }
                        }}
                      />
                      <Chip 
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{user.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {user.role === 'manager' && (
                        <>
                          <Tooltip 
                            title={!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 
                              ? "Maximum limit of 2 active managers reached. Deactivate another manager first." 
                              : user.isActive ? "Deactivate this manager" : "Activate this manager"}
                            arrow
                          >
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2}
                                onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                sx={{ 
                                  minWidth: 'auto',
                                  color: user.isActive ? '#f57c00' : 
                                        (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50'),
                                  borderColor: user.isActive ? '#f57c00' : 
                                              (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50')
                                }}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </span>
                          </Tooltip>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleRemoveUser(user.id, user.displayName)}
                            sx={{ minWidth: 'auto' }}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                      {user.role === 'owner' && (
                        <Typography variant="body2" color="textSecondary">
                          Owner
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {restaurantUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No users found. Add a manager to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="body2" sx={{ color: '#6A1B9A' }}>
              👑 Owners: <b>{restaurantUsers.filter(user => user.role === 'owner').length}</b>
            </Typography>
            <Typography variant="body2" sx={{ color: '#6A1B9A' }}>
              👨‍💼 Active Managers: <b>{restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2</b>
            </Typography>
            <Typography variant="body2" sx={{ color: '#f57c00' }}>
              ⏸️ Inactive Managers: <b>{restaurantUsers.filter(user => user.role === 'manager' && !user.isActive).length}</b>
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ color: '#6A1B9A' }}>
            Total Users: <b>{restaurantUsers.length}</b>
          </Typography>
        </Box>
      </Box>

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
          color: '#8E24AA',
          textAlign: 'center', 
          fontWeight: 'bold', 
          fontSize: '1.2rem', 
          py: 2, 
          borderTopLeftRadius: 8, 
          borderTopRightRadius: 8,
          background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none'
        }}>
          Add New Manager
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
          <Card sx={{ p: 3, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)', mb: 2, maxWidth: 500, mx: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Full Name"
                value={userFormData.displayName}
                onChange={e => setUserFormData({ ...userFormData, displayName: e.target.value })}
                fullWidth
                required
                InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
                sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
              />
              <TextField
                label="Email Address"
                type="email"
                value={userFormData.email}
                onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                fullWidth
                required
                InputProps={{ startAdornment: <InputAdornment position="start">✉️</InputAdornment> }}
                sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
              />
              <TextField
                label="Password"
                type="password"
                value={userFormData.password}
                onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                fullWidth
                required
                InputProps={{ startAdornment: <InputAdornment position="start">🔒</InputAdornment> }}
                sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
              />
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Manager Limit:</strong> You can add up to 2 active managers for your restaurant. 
                  Currently {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2 manager slots are used.
                </Typography>
              </Alert>
              <Alert severity="success" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Automatic User Creation:</strong> The manager will be created automatically with full access. 
                  They can login immediately with these credentials.
                </Typography>
              </Alert>
            </Box>
          </Card>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
          <Button onClick={() => setShowUserDialog(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            disabled={loadingUserOperation}
            sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}
          >
            {loadingUserOperation ? 'Adding...' : 'Add Manager'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default UserManagement;