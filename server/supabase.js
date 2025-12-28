const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pvhntshaadmbmpskwqmg.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aG50c2hhYWRtYm1wc2t3cW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3MzQ0MzUsImV4cCI6MjA1NDMxMDQzNX0.Bxi5dVLrb_t_Y7NdT34If3A0FigTopUWSuT9rdcHzYw';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;




