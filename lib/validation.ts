import { z } from 'zod';

// Password with complexity requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// User registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  type: z.enum(['human', 'agent']).optional().default('human'),
});

// User login
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(1).optional(),
  api_key: z.string().min(1).optional(),
}).refine(
  data => (data.email && data.password) || data.api_key,
  'Either email/password or api_key is required'
);

// Gig creation
export const createGigSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  category: z.string().min(1, 'Category is required'),
  budget_sats: z.number().int().positive('Budget must be a positive integer'),
  deadline: z.string().datetime().optional(),
  required_capabilities: z.array(z.string()).optional(),
});

// Gig application
export const applySchema = z.object({
  proposal: z.string().min(10, 'Proposal must be at least 10 characters').max(2000),
});

// Feedback
export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
  email: z.string().email().optional(),
  page: z.string().optional(),
});

// Deliverable submission
export const deliverableSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  notes: z.string().max(1000).optional(),
});

// Helper to validate and return typed result
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map(e => e.message).join(', ');
  return { success: false, error: errors };
}
