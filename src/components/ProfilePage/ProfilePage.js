import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Lock,
  LogOut,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import authService from '../Auth/AuthService';
import { api } from '../Auth/api';

const Profile = ({ user, onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [sessionWarning, setSessionWarning] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Helper function to display field value or "No data found for this field"
  const getFieldValue = (value, fieldName) => {
    if (!value || value.trim() === '') {
      return `No data found for ${fieldName}`;
    }
    return value;
  };

  // Helper function to get display value with fallback
  const getDisplayValue = (value) => {
    return value && value.trim() !== '' ? value : '';
  };

  // Form states - using actual user data
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    aliasName: getDisplayValue(user?.aliasName || user?.alias),
    email: getDisplayValue(user?.email),
    mobile: getDisplayValue(user?.mobile || user?.phone)
  });

  // Profile data from logged in user
  const [profileData, setProfileData] = useState({
    companyName: getDisplayValue(user?.companyName || user?.company || user?.organization),
    userName: getDisplayValue(user?.name || user?.userName || user?.username),
    userId: getDisplayValue(user?.userId || user?.id || user?.userIdAlias),
    email: getDisplayValue(user?.email),
    mobile: getDisplayValue(user?.mobile || user?.phone),
    aliasName: getDisplayValue(user?.aliasName || user?.alias),
    blockBuilding: getDisplayValue(user?.blockBuilding || user?.building),
    floor: getDisplayValue(user?.floor),
    address: getDisplayValue(user?.address),
    location: getDisplayValue(user?.location || user?.city),
    pinCode: getDisplayValue(user?.pinCode || user?.zipCode || user?.postalCode)
  });

  const clearMessages = () => {
    setErrors({});
    setSuccess('');
    setSessionWarning('');
  };

  // Enhanced token validation
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      // Basic JWT token validation (decode payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        console.warn('Token has expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Enhanced authentication check
  const checkAuth = useCallback(() => {
 
    
  setIsInitializing(true);
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    setIsAuthenticated(false);
    setErrors({ general: 'You are not authenticated. Please login again.' });
    setIsInitializing(false);
    return false;
  }

   setIsAuthenticated(true);
  setIsInitializing(false);
  return true;
  }, []);

  useEffect(() => {
  checkAuth();
  console.log('Checking authentication status...',checkAuth);
}, []);

  // Session validation with server
  // const validateSession = useCallback(async () => {
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     if (!token) return false;

  //     // Call a lightweight API endpoint to validate session
  //     const response = await api.auth.validateSession();
  //     return response.status === 200;
  //   } catch (error) {
  //     console.error('Session validation failed:', error);
  //     if (error.response?.status === 401) {
  //       handleSessionExpired();
  //       return false;
  //     }
  //     return true; // Don't logout on network errors
  //   }
  // }, []);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    setSessionWarning('Your session has expired. You will be redirected to login.');
    setIsAuthenticated(false);
    
    // Log the session invalidation event
    console.log({
      timestamp: new Date().toISOString(),
      event: 'LOGOUT',
      data: {
        reason: 'SESSION_INVALID'
      },
      userAgent: navigator.userAgent,
      ip: 'client-side'
    });

    setTimeout(() => handleForceLogout(), 3000);
  }, []);

  // Force logout (for expired sessions)
  const handleForceLogout = useCallback(async () => {
    try {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear auth service
      if (authService) {
        if (authService.logout) authService.logout();
        if (authService.clearUser) authService.clearUser();
        if (authService.clearToken) authService.clearToken();
      }
      
      // Call parent logout callback
      if (onLogout) {
        onLogout();
      } else {
        // Fallback navigation
        navigate('/login');
      }
    } catch (error) {
      console.error('Force logout error:', error);
      // Still navigate to login even if there's an error
      navigate('/login');
    }
  }, [navigate, onLogout]);

  // Token refresh function (if your API supports it)
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await api.auth.refreshToken({ refresh_token: refreshToken });
      
      if (response.data?.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refreshToken', response.data.refresh_token);
        }
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  // Handle API errors with better authentication handling
  const handleApiError = useCallback((error, operation) => {
    console.error(`${operation} error:`, error);
    
    if (error.response?.status === 401) {
      handleSessionExpired();
      return 'Authentication failed. Please login again.';
    }

    // Extract error message
    let errorMessage = `Failed to ${operation.toLowerCase()}. Please try again.`;
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (typeof errors === 'object') {
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return errorMessage;
  }, [handleSessionExpired]);

  // Validate email format
  const validateEmail = (email) => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true, error: null };
  };

  // Validate mobile number
  const validateMobile = (mobile) => {
    const trimmedMobile = mobile.trim();
    
    if (!trimmedMobile) {
      return { isValid: false, error: 'Mobile number is required' };
    }

    // Remove all non-digits
    const digitsOnly = trimmedMobile.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    // Check if it starts with valid Indian mobile prefixes
    const validPrefixes = ['6', '7', '8', '9'];
    if (!validPrefixes.includes(digitsOnly[0])) {
      return { isValid: false, error: 'Please enter a valid mobile number' };
    }

    return { isValid: true, error: null };
  };

  // Validate password
  const validatePassword = (password) => {
    if (!password || password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters long' };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return { 
        isValid: false, 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character' 
      };
    }

    return { isValid: true, error: null };
  };

  // Handle password change with enhanced error handling
  const handlePasswordChange = async () => {
    clearMessages();
    
    if (!checkAuth()) return;
    
    // Validate all password fields
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrors({ password: 'All password fields are required' });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setErrors({ password: 'New password must be different from current password' });
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ password: 'New password and confirm password do not match' });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      setErrors({ password: passwordValidation.error });
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const passwordPayload = {
        old_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
        access_token: token
      };

      console.log('Changing password...', { userId: user?.id });

      const response = await api.auth.changePassword(passwordPayload);
      
      if (response.data) {
        setSuccess('Password updated successfully!');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setIsEditingPassword(false);
        
        setTimeout(() => setSuccess(''), 3000);
        console.log('Password change successful:', response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Password change');
      
      // Handle specific password errors
      if (errorMessage.toLowerCase().includes('current password') || 
          errorMessage.toLowerCase().includes('incorrect password')) {
        setErrors({ password: 'Current password is incorrect' });
      } else if (errorMessage.toLowerCase().includes('weak password') || 
                 errorMessage.toLowerCase().includes('password strength')) {
        setErrors({ password: errorMessage });
      } else {
        setErrors({ password: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle alias name change with enhanced error handling
  const handleAliasChange = async () => {
    clearMessages();
    
    if (!checkAuth()) return;
    
    if (!formData.aliasName.trim()) {
      setErrors({ alias: 'Alias name cannot be empty' });
      return;
    }

    if (formData.aliasName.trim().length < 2) {
      setErrors({ alias: 'Alias name must be at least 2 characters long' });
      return;
    }

    setLoading(true);
    
    try {
      const aliasPayload = {
        aliasName: formData.aliasName.trim()
      };

      console.log('Updating alias name...', aliasPayload);

      let response;
      try {
        response = await api.auth.updateProfile(aliasPayload);
      } catch (authError) {
        response = await api.user.updateProfile(aliasPayload);
      }
      
      if (response.data) {
        const updatedAlias = response.data.aliasName || formData.aliasName;
        
        setProfileData(prev => ({ ...prev, aliasName: updatedAlias }));
        setSuccess('Alias name updated successfully!');
        setIsEditingAlias(false);
        
        if (onProfileUpdate) {
          onProfileUpdate({ ...user, aliasName: updatedAlias });
        }
        
        setTimeout(() => setSuccess(''), 3000);
        console.log('Alias update successful:', response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Alias update');
      
      // Handle specific alias errors
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate')) {
        setErrors({ alias: 'This alias name is already taken. Please choose another.' });
      } else if (errorMessage.toLowerCase().includes('invalid characters')) {
        setErrors({ alias: 'Alias name contains invalid characters' });
      } else {
        setErrors({ alias: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle email change with enhanced error handling
  const handleEmailChange = async () => {
    clearMessages();
    
    if (!checkAuth()) return;
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setErrors({ email: emailValidation.error });
      return;
    }

    setLoading(true);
    
    try {
      const emailPayload = {
        email: formData.email.trim()
      };

      console.log('Updating email...', emailPayload);

      let response;
      try {
        response = await api.user.updateProfile(emailPayload);
      } catch (userError) {
        response = await api.auth.updateProfile(emailPayload);
      }
      
      if (response.data) {
        const updatedEmail = response.data.email || formData.email;
        
        setProfileData(prev => ({ ...prev, email: updatedEmail }));
        setSuccess('Email updated successfully! Verification email sent.');
        setIsEditingEmail(false);
        
        if (onProfileUpdate) {
          onProfileUpdate({ ...user, email: updatedEmail });
        }
        
        setTimeout(() => setSuccess(''), 3000);
        console.log('Email update successful:', response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Email update');
      
      // Handle specific email errors
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('already registered')) {
        setErrors({ email: 'This email is already registered. Please use a different email.' });
      } else if (errorMessage.toLowerCase().includes('invalid email')) {
        setErrors({ email: 'Please enter a valid email address' });
      } else {
        setErrors({ email: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle mobile number change with enhanced error handling
  const handleMobileChange = async () => {
    clearMessages();
    
    if (!checkAuth()) return;
    
    const mobileValidation = validateMobile(formData.mobile);
    if (!mobileValidation.isValid) {
      setErrors({ mobile: mobileValidation.error });
      return;
    }

    setLoading(true);
    
    try {
      const mobilePayload = {
        mobile: formData.mobile.trim()
      };

      console.log('Updating mobile number...', mobilePayload);

      let response;
      try {
        response = await api.user.updateProfile(mobilePayload);
      } catch (userError) {
        response = await api.auth.updateProfile(mobilePayload);
      }
      
      if (response.data) {
        const updatedMobile = response.data.mobile || formData.mobile;
        
        setProfileData(prev => ({ ...prev, mobile: updatedMobile }));
        setSuccess('Mobile number updated successfully!');
        setIsEditingMobile(false);
        
        if (onProfileUpdate) {
          onProfileUpdate({ ...user, mobile: updatedMobile });
        }
        
        setTimeout(() => setSuccess(''), 3000);
        console.log('Mobile update successful:', response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Mobile update');
      
      // Handle specific mobile errors
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('already registered')) {
        setErrors({ mobile: 'This mobile number is already registered. Please use a different number.' });
      } else if (errorMessage.toLowerCase().includes('invalid mobile')) {
        setErrors({ mobile: 'Please enter a valid mobile number' });
      } else {
        setErrors({ mobile: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (field) => {
    clearMessages();
    
    switch (field) {
      case 'password':
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setIsEditingPassword(false);
        break;
      case 'alias':
        setFormData(prev => ({ ...prev, aliasName: profileData.aliasName }));
        setIsEditingAlias(false);
        break;
      case 'email':
        setFormData(prev => ({ ...prev, email: profileData.email }));
        setIsEditingEmail(false);
        break;
      case 'mobile':
        setFormData(prev => ({ ...prev, mobile: profileData.mobile }));
        setIsEditingMobile(false);
        break;
    }
  };

  const handleLogoutClick = async () => {
    try {
      setLoading(true);
      
      // Call logout API endpoint
      try {
        await api.auth.logout();
      } catch (logoutError) {
        console.warn('Logout API call failed:', logoutError);
      }
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear auth service
      if (authService) {
        if (authService.logout) authService.logout();
        if (authService.clearUser) authService.clearUser();
        if (authService.clearToken) authService.clearToken();
      }
      
      // Log the logout event
      console.log({
        timestamp: new Date().toISOString(),
        event: 'LOGOUT',
        data: {
          reason: 'USER_INITIATED'
        },
        userAgent: navigator.userAgent,
        ip: 'client-side'
      });
      
      // Call parent logout callback
      if (onLogout) {
        onLogout();
      }
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      if (onLogout) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      const updatedProfileData = {
        companyName: getDisplayValue(user.companyName || user.company || user.organization),
        userName: getDisplayValue(user.name || user.userName || user.username),
        userId: getDisplayValue(user.userId || user.id || user.userIdAlias),
        email: getDisplayValue(user.email),
        mobile: getDisplayValue(user.mobile || user.phone),
        aliasName: getDisplayValue(user.aliasName || user.alias),
        blockBuilding: getDisplayValue(user.blockBuilding || user.building),
        floor: getDisplayValue(user.floor),
        address: getDisplayValue(user.address),
        location: getDisplayValue(user.location || user.city),
        pinCode: getDisplayValue(user.pinCode || user.zipCode || user.postalCode)
      };
      
      setProfileData(updatedProfileData);
      setFormData(prev => ({
        ...prev,
        aliasName: updatedProfileData.aliasName,
        email: updatedProfileData.email,
        mobile: updatedProfileData.mobile
      }));
    }
  }, [user]);

  // // Initialize authentication check and session validation
  // useEffect(() => {
  //   const initializeAuth = async () => {
  //     if (!checkAuth()) return;
      
  //     // Validate session with server
  //     const isValid = await validateSession();
  //     if (!isValid) {
  //       console.warn('Session validation failed');
  //     }
  //   };

  //   initializeAuth();

  //   // Set up periodic session validation (every 5 minutes)
  //   const sessionInterval = setInterval(async () => {
  //     if (isAuthenticated) {
  //       const isValid = await validateSession();
  //       if (!isValid) {
  //         clearInterval(sessionInterval);
  //       }
  //     }
  //   }, 5 * 60 * 1000); // 5 minutes

  //   return () => clearInterval(sessionInterval);
  // }, [checkAuth, validateSession, isAuthenticated]);

  // Get user's first initial for avatar
  const getUserInitial = () => {
    const name = profileData.userName || profileData.userId || 'U';
    return name.charAt(0).toUpperCase();
  };

  // Show loading screen while checking authentication
  if (isInitializing) {
    console.log(isInitializing)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen m-0 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center p-2">
          <User className="w-8 h-8 m-0 text-purple-800" />
          <h1 className="text-2xl font-semibold text-gray-800">Profile</h1>
        </div>
      </div>

      <div className="max-w-6xl p-6 mx-auto">
        {/* Session Warning */}
        {sessionWarning && (
          <div className="flex items-center p-4 mb-6 border border-orange-200 rounded-md bg-orange-50">
            <AlertCircle className="w-5 h-5 mr-3 text-orange-600" />
            <p className="font-medium text-orange-800">{sessionWarning}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-2 mb-6 border border-green-200 rounded-md bg-green-50">
            <p className="font-medium text-green-800">{success}</p>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="flex items-center p-4 mb-6 border border-red-200 rounded-md bg-red-50">
            <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
            <p className="font-medium text-red-800">{errors.general}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Profile Header with Background */}
              <div className="relative h-32 bg-gradient-to-t from-purple-800 to-purple-100">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute transform -translate-x-1/2 -bottom-12 left-1/2">
                  <div className="w-24 h-24 p-1 bg-white rounded-full shadow-lg">
                    <div className="flex items-center justify-center w-full h-full rounded-full bg-gradient-to-b from-purple-800 to-purple-100">
                      <span className="text-2xl font-bold text-white">
                        {getUserInitial()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pt-16 pb-6 text-center">
                <h2 className="mb-1 text-xl font-semibold text-gray-800">
                  {getFieldValue(profileData.userName, 'user name')}
                </h2>
                <p className="mb-4 text-sm text-gray-600">
                  {getFieldValue(profileData.companyName, 'company name')}
                </p>
              </div>

              {/* Security Section */}
              <div className="px-6 pb-6">
                <h3 className="mb-4 text-lg font-medium text-gray-800">Security</h3>
                
                {/* Change Password */}
                <div className="mb-4">
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    disabled={loading || !isAuthenticated}
                    className="flex items-center w-full p-3 text-left transition-colors bg-purple-100 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                  >
                    <Lock className="w-5 h-5 mr-3 text-purple-500" />
                    <div>
                      <p className="font-medium text-purple-700">Change Password</p>
                      <p className="text-sm text-purple-800">Password</p>
                    </div>
                  </button>
                </div>

                {/* Change Alias Name */}
                <div className="mb-4">
                  <button
                    onClick={() => setIsEditingAlias(true)}
                    disabled={loading || !isAuthenticated}
                    className="flex items-center w-full p-3 text-left transition-colors bg-purple-100 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                  >
                    <User className="w-5 h-5 mr-3 text-purple-500" />
                    <div>
                      <p className="font-medium text-purple-700">Change Aliasname</p>
                      <p className="text-sm text-purple-800">Aliasname</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="mb-6 text-xl font-semibold text-gray-800">Profile</h3>

              <div className="space-y-6">
                {/* Company Name */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <Building className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Company Name</p>
                    <p className="text-gray-900">{getFieldValue(profileData.companyName, 'company name')}</p>
                  </div>
                </div>

                {/* User Name */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <User className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">User Name</p>
                    <p className="text-gray-900">{getFieldValue(profileData.userName, 'user name')}</p>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <User className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">User ID</p>
                    <p className="text-gray-900">{getFieldValue(profileData.userId, 'user ID')}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <Mail className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    {isEditingEmail ? (
                      <div className="mt-2">
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter email address"
                          disabled={loading}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                        <div className="flex mt-2 space-x-2">
                          <button
                            onClick={handleEmailChange}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                            Save
                          </button>
                          <button
                            onClick={() => handleCancel('email')}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900">{getFieldValue(profileData.email, 'email')}</p>
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          disabled={loading || !isAuthenticated}
                          className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <Phone className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Mobile</p>
                    {isEditingMobile ? (
                      <div className="mt-2">
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter mobile number"
                          disabled={loading}
                        />
                        {errors.mobile && (
                          <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
                        )}
                        <div className="flex mt-2 space-x-2">
                          <button
                            onClick={handleMobileChange}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                            Save
                          </button>
                          <button
                            onClick={() => handleCancel('mobile')}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900">{getFieldValue(profileData.mobile, 'mobile number')}</p>
                        <button
                          onClick={() => setIsEditingMobile(true)}
                          disabled={loading || !isAuthenticated}
                          className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alias Name */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <User className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Alias Name</p>
                    {isEditingAlias ? (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={formData.aliasName}
                          onChange={(e) => setFormData(prev => ({ ...prev, aliasName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter alias name"
                          disabled={loading}
                        />
                        {errors.alias && (
                          <p className="mt-1 text-sm text-red-600">{errors.alias}</p>
                        )}
                        <div className="flex mt-2 space-x-2">
                          <button
                            onClick={handleAliasChange}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                            Save
                          </button>
                          <button
                            onClick={() => handleCancel('alias')}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900">{getFieldValue(profileData.aliasName, 'alias name')}</p>
                        <button
                          onClick={() => setIsEditingAlias(true)}
                          disabled={loading || !isAuthenticated}
                          className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Block/Building */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <Building className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Block/Building</p>
                    <p className="text-gray-900">{getFieldValue(profileData.blockBuilding, 'block/building')}</p>
                  </div>
                </div>

                {/* Floor */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <Building className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Floor</p>
                    <p className="text-gray-900">{getFieldValue(profileData.floor, 'floor')}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <MapPin className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-gray-900">{getFieldValue(profileData.address, 'address')}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <MapPin className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-gray-900">{getFieldValue(profileData.location, 'location')}</p>
                  </div>
                </div>

                {/* Pin Code */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                    <MapPin className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Pin Code</p>
                    <p className="text-gray-900">{getFieldValue(profileData.pinCode, 'pin code')}</p>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-6 mt-8 border-t border-gray-200">
                <button
                  onClick={handleLogoutClick}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-purple-800 bg-white border border-purple-800 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5 mr-2" />
                  )}
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isEditingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
                <button
                  onClick={() => handleCancel('password')}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter current password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      disabled={loading}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter new password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      disabled={loading}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Confirm new password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Error */}
                {errors.password && (
                  <div className="p-3 border border-red-200 rounded-md bg-red-50">
                    <p className="text-sm text-red-600">{errors.password}</p>
                  </div>
                )}

                {/* Password Requirements */}
                <div className="p-3 border border-blue-200 rounded-md bg-blue-50">
                  <p className="mb-1 text-sm font-medium text-blue-800">Password Requirements:</p>
                  <ul className="space-y-1 text-xs text-blue-700">
                    <li>• At least 6 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character</li>
                  </ul>
                </div>
              </div>

              <div className="flex mt-6 space-x-3">
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="flex items-center justify-center flex-1 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Update Password
                </button>
                <button
                  onClick={() => handleCancel('password')}
                  disabled={loading}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;