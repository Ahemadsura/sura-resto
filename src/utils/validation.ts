// Input validation and sanitization utilities

// Email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string, isLogin: boolean = false): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  // For login, only check if password exists and is not too long
  if (isLogin) {
    if (password.length > 128) {
      return { isValid: false, error: 'Password is too long' };
    }
    return { isValid: true };
  }
  
  // For new passwords or password changes, apply strict validation
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*...)' };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc12345', '123456789', 'password123',
    'admin123', 'user1234', 'welcome123', 'restaurant123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common. Please choose a more secure password' };
  }
  
  return { isValid: true };
};

// Sanitize HTML to prevent XSS
export const sanitizeHtml = (input: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#x3D;'
  };
  
  return input.replace(/[&<>"'`=/]/g, (s) => map[s]);
};

// Validate and sanitize text input
export const validateText = (
  text: string, 
  fieldName: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternError?: string;
  } = {}
): { isValid: boolean; sanitizedValue: string; error?: string } => {
  const { required = false, minLength = 0, maxLength = 1000, pattern, patternError } = options;
  
  // Sanitize input
  const sanitizedValue = sanitizeHtml(text.trim());
  
  // Required validation
  if (required && !sanitizedValue) {
    return { isValid: false, sanitizedValue, error: `${fieldName} is required` };
  }
  
  // Length validation
  if (sanitizedValue.length < minLength) {
    return { 
      isValid: false, 
      sanitizedValue, 
      error: `${fieldName} must be at least ${minLength} characters long` 
    };
  }
  
  if (sanitizedValue.length > maxLength) {
    return { 
      isValid: false, 
      sanitizedValue, 
      error: `${fieldName} must be no more than ${maxLength} characters long` 
    };
  }
  
  // Pattern validation
  if (pattern && sanitizedValue && !pattern.test(sanitizedValue)) {
    return { 
      isValid: false, 
      sanitizedValue, 
      error: patternError || `${fieldName} format is invalid` 
    };
  }
  
  return { isValid: true, sanitizedValue };
};

// Validate numeric input
export const validateNumber = (
  value: string | number, 
  fieldName: string, 
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): { isValid: boolean; numericValue: number; error?: string } => {
  const { required = false, min, max, integer = false } = options;
  
  // Convert to string for processing
  const stringValue = String(value).trim();
  
  // Required validation
  if (required && !stringValue) {
    return { isValid: false, numericValue: 0, error: `${fieldName} is required` };
  }
  
  // Empty but not required
  if (!stringValue && !required) {
    return { isValid: true, numericValue: 0 };
  }
  
  // Numeric validation
  const numericValue = Number(stringValue);
  if (isNaN(numericValue)) {
    return { isValid: false, numericValue: 0, error: `${fieldName} must be a valid number` };
  }
  
  // Integer validation
  if (integer && !Number.isInteger(numericValue)) {
    return { isValid: false, numericValue, error: `${fieldName} must be a whole number` };
  }
  
  // Range validation
  if (min !== undefined && numericValue < min) {
    return { 
      isValid: false, 
      numericValue, 
      error: `${fieldName} must be at least ${min}` 
    };
  }
  
  if (max !== undefined && numericValue > max) {
    return { 
      isValid: false, 
      numericValue, 
      error: `${fieldName} must be no more than ${max}` 
    };
  }
  
  return { isValid: true, numericValue };
};

// Validate phone number (Indian format)
export const validatePhoneNumber = (phone: string): { isValid: boolean; sanitizedValue: string; error?: string } => {
  const sanitizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
  
  if (!sanitizedPhone) {
    return { isValid: false, sanitizedValue: '', error: 'Phone number is required' };
  }
  
  // Indian phone number validation (10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(sanitizedPhone)) {
    return { 
      isValid: false, 
      sanitizedValue: sanitizedPhone, 
      error: 'Please enter a valid 10-digit phone number' 
    };
  }
  
  return { isValid: true, sanitizedValue: sanitizedPhone };
};

// Validate GSTIN (Indian tax number)
export const validateGSTIN = (gstin: string): { isValid: boolean; sanitizedValue: string; error?: string } => {
  const sanitizedGSTIN = gstin.trim().toUpperCase();
  
  if (!sanitizedGSTIN) {
    return { isValid: true, sanitizedValue: '' }; // GSTIN is optional
  }
  
  // GSTIN format: 15 characters (2 digits + 10 alphanumeric + 1 digit + 1 alphabet + 1 alphanumeric)
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(sanitizedGSTIN)) {
    return { 
      isValid: false, 
      sanitizedValue: sanitizedGSTIN, 
      error: 'Please enter a valid GSTIN number' 
    };
  }
  
  return { isValid: true, sanitizedValue: sanitizedGSTIN };
};

// General form validation helper
export const validateForm = (fields: Array<{
  value: any;
  validator: (value: any) => { isValid: boolean; error?: string; sanitizedValue?: any; numericValue?: any };
}>): { isValid: boolean; errors: string[]; sanitizedValues: any[] } => {
  const errors: string[] = [];
  const sanitizedValues: any[] = [];
  
  let allValid = true;
  
  fields.forEach((field) => {
    const result = field.validator(field.value);
    if (!result.isValid) {
      allValid = false;
      if (result.error) {
        errors.push(result.error);
      }
    }
    sanitizedValues.push(result.sanitizedValue || result.numericValue || field.value);
  });
  
  return { isValid: allValid, errors, sanitizedValues };
}; 