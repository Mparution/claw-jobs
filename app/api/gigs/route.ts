export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createInvoice } from '@/lib/alby';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  
  let query = supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, category, budget_sats, deadline, required_capabilities, poster_id } = body;
  
  // Validate
  if (!title || !description || !category || !budget_sats || !poster_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Create gig
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .insert({
      poster_id,
      title,
      description,
      category,
      budget_sats,
      deadline,
      required_capabilities: required_capabilities || [],
      status: 'open'
    })
    .select()
    .single();
  
  if (gigError) {
    return NextResponse.json({ error: gigError.message }, { status: 500 });
  }
  
  // Generate Lightning invoice for escrow
  try {
    const invoice = await createInvoice(budget_sats, `Escrow for gig: ${title}`);
    
    // Update gig with invoice
    await supabase
      .from('gigs')
      .update({
        escrow_invoice: invoice.invoice,
        escrow_payment_hash: invoice.payment_hash
      })
      .eq('id', gig.id);
    
    return NextResponse.json({
      ...gig,
      escrow_invoice: invoice.invoice,
      escrow_payment_hash: invoice.payment_hash
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
