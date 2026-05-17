import { object, string } from 'yup';

export const signupSchema = object({
  first_name: string().required('First name is required').max(50, 'First name cannot exceed 50 characters'),
  last_name: string().required('Last name is required').max(50, 'Last name cannot exceed 50 characters'),
  email: string().email('Invalid email address').required('Email is required'),
  password: string().min(8, 'Password must be at least 8 characters')
    .required('Password is required').matches(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'New password must contain at least one lowercase letter')
    .matches(/\d/, 'New password must contain at least one number')
    .matches(/[@$!%*?&]/, 'New password must contain at least one special character'),
  agreed: string().oneOf(['true'], 'You must agree to the terms and conditions').required('You must agree to the terms and conditions'),
});

export const signinSchema = object({
  email: string().email('Invalid email address').required('Email is required'),
  password: string().required('Password is required'),
});
