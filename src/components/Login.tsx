import React, { useState } from 'react';
import {
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock
} from '@mui/icons-material';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { rateLimiter } from '../utils/rateLimiter';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { login } = useAuth();

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      isValid = false;
    }

    // Validate password - use login mode
    const passwordValidation = validatePassword(password, true);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || 'Invalid password');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Check rate limiting before attempting login
    const rateLimitCheck = rateLimiter.canAttemptLogin(email.toLowerCase());
    if (!rateLimitCheck.allowed) {
      const blockedTime = rateLimiter.getBlockedTime(email.toLowerCase());
      const timeRemaining = rateLimiter.formatBlockedTime(blockedTime);
      setError(`Too many failed login attempts. Please try again in ${timeRemaining}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, 'manager');
      // Record successful login (clears any failed attempts)
      rateLimiter.recordSuccessfulLogin(email.toLowerCase());
    } catch (error: any) {
      // Record failed attempt for rate limiting
      rateLimiter.recordFailedAttempt(email.toLowerCase());
      
      // Check if this was the final attempt before blocking
      const remainingAttempts = rateLimiter.canAttemptLogin(email.toLowerCase()).remainingAttempts;
      
      // Handle specific error cases with professional messages
      const errorMessage = error.message || '';
      let displayError = '';
      
      if (errorMessage.includes('auth/invalid-credential')) {
        displayError = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        displayError = 'Please enter a valid email address.';
      } else if (errorMessage.includes('auth/user-disabled')) {
        displayError = 'This account has been disabled. Please contact support.';
      } else if (errorMessage.includes('auth/user-not-found')) {
        displayError = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('auth/wrong-password')) {
        displayError = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('Invalid role selected')) {
        displayError = 'You do not have manager access. Please use the correct login portal.';
      } else if (errorMessage.includes('User data not found')) {
        displayError = 'Account configuration error. Please contact support.';
      } else {
        displayError = 'An error occurred while signing in. Please try again later.';
      }
      
      // Add rate limiting warning if approaching limit
      if (remainingAttempts !== undefined && remainingAttempts <= 2 && remainingAttempts > 0) {
        displayError += ` (${remainingAttempts} attempts remaining before temporary lockout)`;
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    console.log('Forgot password clicked');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-poppins p-4">
      <Card 
        className="w-full max-w-md p-8 animate-slide-in rounded-2xl shadow-xl" 
        sx={{ 
          width: { xs: '90%', sm: '100%' }, 
          maxWidth: '448px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🍽️</span>
          </div>
          <Typography
            variant="h4"
            className="font-bold text-primary mb-2"
            sx={{ fontFamily: 'Poppins, sans-serif' }}
          >
            SURA
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            className="text-gray-600"
            sx={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Restaurant Management System
          </Typography>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            className="mb-6 rounded-lg"
            sx={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
            required
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email className="text-primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: 'none',
                outline: 'none',
                '& fieldset': {
                  borderColor: '#E0E0E0',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#E0E0E0',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#E0E0E0',
                  borderWidth: '1px',
                },
                '& input': {
                  outline: 'none',
                  boxShadow: 'none',
                },
              },
              '& .MuiInputLabel-root': {
                fontFamily: 'Poppins, sans-serif',
                '&.Mui-focused': {
                  color: '#7B2CBF',
                },
                '&.Mui-error': {
                  color: '#f44336',
                },
              },
              '& .MuiFormHelperText-root': {
                fontFamily: 'Poppins, sans-serif',
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            required
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock className="text-primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#7B2CBF' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: 'none',
                outline: 'none',
                '& fieldset': {
                  borderColor: '#E0E0E0',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#E0E0E0',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#E0E0E0',
                  borderWidth: '1px',
                },
                '& input': {
                  outline: 'none',
                  boxShadow: 'none',
                },
              },
              '& .MuiInputLabel-root': {
                fontFamily: 'Poppins, sans-serif',
                '&.Mui-focused': {
                  color: '#7B2CBF',
                },
                '&.Mui-error': {
                  color: '#f44336',
                },
              },
              '& .MuiFormHelperText-root': {
                fontFamily: 'Poppins, sans-serif',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            className="bg-primary hover:bg-purple-800 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              textTransform: 'none',
              backgroundColor: '#7B2CBF',
              borderRadius: '12px',
              padding: '12px 0',
              boxShadow: '0 4px 14px rgba(123, 44, 191, 0.25)',
              '&:hover': {
                backgroundColor: '#6A1B9A',
                boxShadow: '0 6px 20px rgba(123, 44, 191, 0.35)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                backgroundColor: '#BDBDBD',
                color: '#FFFFFF',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} className="text-white" />
            ) : (
              'Login'
            )}
          </Button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center mt-6">
          <Link
            component="button"
            variant="body2"
            onClick={handleForgotPassword}
            sx={{
              fontFamily: 'Poppins, sans-serif',
              color: '#7B2CBF',
              textDecoration: 'none',
              fontSize: '14px',
              '&:hover': {
                textDecoration: 'underline',
                color: '#6A1B9A',
              },
            }}
          >
            Forgot Password?
          </Link>
        </div>

        {/* Powered by SURA */}
        <div className="text-center mt-4">
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Poppins, sans-serif',
              color: '#666666',
              fontSize: '12px',
              fontWeight: 400,
            }}
          >
            Powered by SURA
          </Typography>
        </div>
      </Card>
    </div>
  );
};

export default Login; 