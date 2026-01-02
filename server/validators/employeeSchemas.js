const { z } = require('zod');

const registerEmployeeSchema = z.object({
  employeeId: z.string().min(3),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  mobile: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/),
  address: z.string().min(1),
  date: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  aadharNo: z.string().regex(/^\d{12}$/),
  section: z.enum(['Front of House','Back of House']),
  role: z.string().min(1),
  duties: z.string().optional(),
  status: z.enum(['Pending','Accepted','Rejected']).optional()
});

const employeeLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(8)
});

module.exports = { registerEmployeeSchema, employeeLoginSchema };
