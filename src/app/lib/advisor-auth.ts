/**
 * Advisor Authentication & Profile Management
 * For CPAs, tax professionals, and financial advisors
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export interface AdvisorProfile {
  id: string
  email: string
  company_name: string
  full_name: string
  phone?: string
  credentials?: string // CPA, CFP, etc.
  created_at: string
  client_count: number
  is_verified: boolean
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length < 254
}

/**
 * Register new advisor
 */
export async function registerAdvisor(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
  credentials?: string
): Promise<{ success: boolean; message: string; advisorId?: string }> {
  // Validate inputs
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email format' }
  }

  if (password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters' }
  }

  if (!fullName || fullName.trim().length < 2) {
    return { success: false, message: 'Full name is required' }
  }

  if (!companyName || companyName.trim().length < 2) {
    return { success: false, message: 'Company name is required' }
  }

  try {
    // Check if advisor already exists
    const { data: existingAdvisor } = await supabase
      .from('advisors')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAdvisor) {
      return { success: false, message: 'Email already registered' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create advisor record
    const { data: newAdvisor, error } = await supabase
      .from('advisors')
      .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        credentials: credentials?.trim() || null,
        is_verified: false,
        client_count: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Advisor registration error:', error)
      return { success: false, message: 'Failed to register. Please try again.' }
    }

    return {
      success: true,
      message: 'Registration successful! Check your email to verify.',
      advisorId: newAdvisor?.id,
    }
  } catch (err) {
    console.error('Registration exception:', err)
    return { success: false, message: 'An error occurred. Please try again.' }
  }
}

/**
 * Authenticate advisor login
 */
export async function authenticateAdvisor(
  email: string,
  password: string
): Promise<{
  success: boolean
  message: string
  advisor?: AdvisorProfile
  token?: string
}> {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email format' }
  }

  try {
    // Get advisor
    const { data: advisor, error } = await supabase
      .from('advisors')
      .select('id, email, password_hash, full_name, company_name, phone, credentials, created_at, client_count, is_verified')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !advisor) {
      return { success: false, message: 'Invalid email or password' }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, advisor.password_hash)
    if (!passwordMatch) {
      return { success: false, message: 'Invalid email or password' }
    }

    // Check if verified
    if (!advisor.is_verified) {
      return {
        success: false,
        message: 'Please verify your email before logging in',
      }
    }

    // Return profile (without password hash)
    const profile: AdvisorProfile = {
      id: advisor.id,
      email: advisor.email,
      full_name: advisor.full_name,
      company_name: advisor.company_name,
      phone: advisor.phone,
      credentials: advisor.credentials,
      created_at: advisor.created_at,
      client_count: advisor.client_count,
      is_verified: advisor.is_verified,
    }

    // In production, generate JWT token here
    const token = btoa(JSON.stringify({ advisorId: advisor.id, email: advisor.email }))

    return {
      success: true,
      message: 'Login successful',
      advisor: profile,
      token,
    }
  } catch (err) {
    console.error('Authentication exception:', err)
    return { success: false, message: 'Authentication failed. Please try again.' }
  }
}

/**
 * Get advisor profile by ID
 */
export async function getAdvisorProfile(advisorId: string): Promise<AdvisorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('advisors')
      .select('id, email, full_name, company_name, phone, credentials, created_at, client_count, is_verified')
      .eq('id', advisorId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      company_name: data.company_name,
      phone: data.phone,
      credentials: data.credentials,
      created_at: data.created_at,
      client_count: data.client_count,
      is_verified: data.is_verified,
    }
  } catch (err) {
    console.error('Error fetching advisor profile:', err)
    return null
  }
}

/**
 * Update advisor profile
 */
export async function updateAdvisorProfile(
  advisorId: string,
  updates: Partial<{
    full_name: string
    phone: string
    credentials: string
  }>
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('advisors')
      .update({
        ...(updates.full_name && { full_name: updates.full_name.trim() }),
        ...(updates.phone && { phone: updates.phone.trim() }),
        ...(updates.credentials && { credentials: updates.credentials.trim() }),
      })
      .eq('id', advisorId)

    if (error) {
      return { success: false, message: 'Failed to update profile' }
    }

    return { success: true, message: 'Profile updated successfully' }
  } catch (err) {
    console.error('Profile update error:', err)
    return { success: false, message: 'An error occurred' }
  }
}
