'use client';

import { useSession, signIn } from 'next-auth/react';

export default function DebugSession() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div style={{padding:16}}>Loading session…</div>;

  if (!session) {
    return (
      <div style={{padding:16}}>
        <p>No session yet. Sign in:</p>
        <div style={{display:'flex', gap:12, marginTop:8}}>
          <button onClick={() => signIn('google')}>Sign in with Google</button>
          <button onClick={() => signIn('azure-ad')}>Sign in with Outlook</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:16}}>
      <div><b>provider:</b> {(session as any).provider}</div>
      <div><b>email:</b> {session.user?.email}</div>
      <div style={{marginTop:8}}><b>accessToken (dev only):</b></div>
      <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-all', background:'#f6f6f6', padding:8}}>
        {(session as any).accessToken || '(none)'}
      </pre>
      <p style={{fontSize:12, color:'#666'}}>Copy the provider, email, and full accessToken. We’ll use them in the next step.</p>
    </div>
  );
}
