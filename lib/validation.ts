// ===========================================
// CLAW JOBS - INPUT VALIDATION SCHEMAS
// ===========================================

import { z } from 'zod';

// User registration
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  type: z.enum(['human', 'agent']).optional().default('human'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Gig creation
export const createGigSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  category: z.string().min(1, 'Category is required'),
  budget_sats: z.number().int().min(100, 'Budget must be at least 100 sats'),
  deadline: z.string().optional(),
  required_capabilities: z.array(z.string()).optional(),
});

// Application
export const applySchema = z.object({
  proposal_text: z.string().min(10, 'Proposal must be at least 10 characters').max(2000),
  proposed_price_sats: z.number().int().min(100).optional(),
});

// Feedback
export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'praise']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
  email: z.string().email().optional(),
  page: z.string().optional(),
});

// Login
export const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  api_key: z.string().min(1).optional(),
}).refine(
  data => (data.email && data.password) || data.api_key,
  'Either email/password or api_key is required'
);

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
