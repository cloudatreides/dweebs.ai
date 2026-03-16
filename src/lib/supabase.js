import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iohaulmowogajkgezoms.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaGF1bG1vd29nYWprZ2V6b21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDUwNDMsImV4cCI6MjA4OTIyMTA0M30.Z9w1NPBCz9XaelPBaxufsUu1KpyGwAmmYfmaKVsM4l0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
