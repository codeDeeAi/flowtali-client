import { object, string } from 'yup';

export const clientSchema = object({
  name: string().required('Name is required').max(100, 'Name cannot exceed 100 characters'),
  company: string().max(100, 'Company name cannot exceed 100 characters'),
  email: string().email('Invalid email address').required('Email is required'),
  phone: string().max(30, 'Phone number cannot exceed 30 characters'),
  type: string().oneOf(['B2B', 'B2C'], 'Client type must be B2B or B2C').required('Client type is required'),
  address: string().max(200, 'Address cannot exceed 200 characters'),
  notes: string().max(500, 'Notes cannot exceed 500 characters'),
});
