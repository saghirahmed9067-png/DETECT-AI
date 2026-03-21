import { NextResponse } from 'next/server'
// Billing is not yet enabled. Aiscern is currently free.
export async function GET()  { return NextResponse.json({ message: 'Billing coming soon' }, { status: 404 }) }
export async function POST() { return NextResponse.json({ message: 'Billing coming soon' }, { status: 404 }) }
