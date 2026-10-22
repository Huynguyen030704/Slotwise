// Deletes the signed-in user's account. All their rows go with it (on delete cascade).
// Needs the service role key, so it must run here and never in the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL');
  const authHeader = req.headers.get('Authorization') ?? '';

  // Identify the caller from their own token, never from the request body.
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) {
    return new Response(JSON.stringify({ error: 'delete_failed' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
