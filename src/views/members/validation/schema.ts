import { object, string } from 'yup';

export const inviteSchema = object({
  email: string().email('Invalid email address').required('Email address is required'),
  role: string()
    .oneOf(['Member', 'Editor', 'Admin'], 'Please select a valid role')
    .required('Role is required'),
});
