import { z } from 'zod'

export const createEndpointSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .transform((v) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()),
  url: z
    .string()
    .url('Invalid URL format')
    .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    })
    .transform((v) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()),
  expectedStatus: z
    .number()
    .int()
    .min(100)
    .max(599)
    .default(200),
  interval: z
    .number()
    .int()
    .min(10)
    .max(3600)
    .default(60),
})

export const updateEndpointSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .transform((v) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim())
    .optional(),
  url: z
    .string()
    .url('Invalid URL format')
    .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    })
    .transform((v) => v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim())
    .optional(),
  expectedStatus: z
    .number()
    .int()
    .min(100)
    .max(599)
    .optional(),
  interval: z
    .number()
    .int()
    .min(10)
    .max(3600)
    .optional(),
  paused: z.boolean().optional(),
  expectedContent: z.string().max(500).optional(),
  maintenanceStart: z.string().datetime({ offset: true }).optional().nullable(),
  maintenanceEnd: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(['active', 'maintenance']).optional(),
})

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>
