import { array, object, string } from 'yup'
import type { ClientType } from '@/types/client.types'

const CLIENT_TYPES: ClientType[] = ['organization', 'individual', 'freelancer', 'agency', 'other']

export const clientSchema = object({
  full_name: string().required('Full name is required').max(150, 'Full name cannot exceed 150 characters'),
  company: string().nullable().max(150, 'Company name cannot exceed 150 characters'),
  client_type: string()
    .oneOf(CLIENT_TYPES, 'Invalid client type')
    .required('Client type is required'),
  email: string().nullable().email('Invalid email address').max(255),
  phone: string().nullable().max(30, 'Phone number cannot exceed 30 characters'),
  address: string().nullable().max(300, 'Address cannot exceed 300 characters'),
  notes: string().nullable().max(5000, 'Notes cannot exceed 5000 characters'),
})
