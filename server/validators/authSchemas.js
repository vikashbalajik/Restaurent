const { z } = require('zod');

const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;

const registerSchema = z
  .object({
    userId: z.string().optional(),
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email().optional().or(z.literal('')),
    mobile: z.string().trim().regex(phoneRegex, 'Invalid mobile').optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    ack: z.boolean()
  })
  .refine((d) => !!(d.email || d.mobile), {
    message: 'Provide a valid email or mobile number',
    path: ['email']
  })
  .refine((d) => d.ack === true, {
    message: 'You must acknowledge the SS Rewards rules',
    path: ['ack']
  });
  const loginSchema = z.object({
    identifier: z.string().trim().min(3, 'Enter your user id, email, or mobile'),
    password: z.string().min(8, 'Password is required')
  });

module.exports = { registerSchema, loginSchema };
