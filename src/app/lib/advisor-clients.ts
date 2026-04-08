/**
 * Advisor Client Management Service
 * Manage clients linked to advisors with analysis tracking
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export interface AdvisorClient {
  id: string
  advisor_id: string
  client_name: string
  client_email: string
  age?: number
  income?: number
  traditional_ira?: number
  roth_balance?: number
  created_at: string
  last_analysis_at?: string
  status: 'new' | 'analyzed' | 'conversion_recommended' | 'conversion_completed'
  recommended_conversion?: number
  estimated_tax_savings?: number
}

export interface ClientAnalysis {
  id: string
  client_id: string
  analysis_state: Record<string, unknown>
  analysis_result: Record<string, unknown>
  tax_savings_estimate: number
  recommended_conversion: number
  created_at: string
}

/**
 * Get all clients for an advisor
 */
export async function getAdvisorClients(advisorId: string): Promise<AdvisorClient[]> {
  try {
    const { data, error } = await supabase
      .from('advisor_clients')
      .select('*')
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Exception fetching clients:', err)
    return []
  }
}

/**
 * Add new client to advisor
 */
export async function addClientToAdvisor(
  advisorId: string,
  clientData: {
    name: string
    email: string
    age?: number
    income?: number
    traditionalIra?: number
    rothBalance?: number
  }
): Promise<{ success: boolean; message: string; clientId?: string }> {
  try {
    const { data, error } = await supabase
      .from('advisor_clients')
      .insert({
        advisor_id: advisorId,
        client_name: clientData.name.trim(),
        client_email: clientData.email.toLowerCase(),
        age: clientData.age || null,
        income: clientData.income || null,
        traditional_ira: clientData.traditionalIra || null,
        roth_balance: clientData.rothBalance || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error adding client:', error)
      return { success: false, message: 'Failed to add client' }
    }

    return {
      success: true,
      message: 'Client added successfully',
      clientId: data?.id,
    }
  } catch (err) {
    console.error('Exception adding client:', err)
    return { success: false, message: 'An error occurred' }
  }
}

/**
 * Save analysis for a client
 */
export async function saveClientAnalysis(
  clientId: string,
  analysisState: Record<string, unknown>,
  analysisResult: Record<string, unknown>,
  taxSavings: number,
  recommendedConversion: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Update client with latest analysis info
    const { error: updateError } = await supabase
      .from('advisor_clients')
      .update({
        last_analysis_at: new Date().toISOString(),
        status: 'analyzed',
        recommended_conversion: recommendedConversion,
        estimated_tax_savings: taxSavings,
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('Error updating client:', updateError)
      return { success: false, message: 'Failed to update client' }
    }

    // Save analysis record
    const { error: analysisError } = await supabase
      .from('client_analyses')
      .insert({
        client_id: clientId,
        analysis_state: analysisState,
        analysis_result: analysisResult,
        tax_savings_estimate: taxSavings,
        recommended_conversion: recommendedConversion,
      })

    if (analysisError) {
      console.error('Error saving analysis:', analysisError)
      return { success: false, message: 'Failed to save analysis' }
    }

    return { success: true, message: 'Analysis saved' }
  } catch (err) {
    console.error('Exception saving analysis:', err)
    return { success: false, message: 'An error occurred' }
  }
}

/**
 * Get analysis history for a client
 */
export async function getClientAnalysisHistory(clientId: string): Promise<ClientAnalysis[]> {
  try {
    const { data, error } = await supabase
      .from('client_analyses')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analysis history:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Exception fetching analysis history:', err)
    return []
  }
}

/**
 * Get advisor dashboard metrics
 */
export async function getAdvisorMetrics(advisorId: string): Promise<{
  totalClients: number
  totalTaxSavings: number
  avgConversionAmount: number
  conversionsCompleted: number
}> {
  try {
    const { data, error } = await supabase
      .from('advisor_clients')
      .select('estimated_tax_savings, recommended_conversion, status')
      .eq('advisor_id', advisorId)

    if (error) {
      console.error('Error fetching metrics:', error)
      return {
        totalClients: 0,
        totalTaxSavings: 0,
        avgConversionAmount: 0,
        conversionsCompleted: 0,
      }
    }

    const clients = data || []
    const totalTaxSavings = clients.reduce((sum, c) => sum + (c.estimated_tax_savings || 0), 0)
    const totalConversions = clients.reduce((sum, c) => sum + (c.recommended_conversion || 0), 0)
    const conversionsCompleted = clients.filter((c) => c.status === 'conversion_completed').length

    return {
      totalClients: clients.length,
      totalTaxSavings,
      avgConversionAmount: clients.length > 0 ? totalConversions / clients.length : 0,
      conversionsCompleted,
    }
  } catch (err) {
    console.error('Exception fetching metrics:', err)
    return {
      totalClients: 0,
      totalTaxSavings: 0,
      avgConversionAmount: 0,
      conversionsCompleted: 0,
    }
  }
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: 'new' | 'analyzed' | 'conversion_recommended' | 'conversion_completed'
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('advisor_clients')
      .update({ status })
      .eq('id', clientId)

    if (error) {
      console.error('Error updating client status:', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception updating status:', err)
    return { success: false }
  }
}
