import React, { useState } from 'react';
import { Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const VOICEAGENT_API_URL = 'http://localhost:3000/api/call';

export const RequestCallButton = ({ className }) => {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [callSid, setCallSid] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestCall = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${VOICEAGENT_API_URL}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Optional: phoneNumber can be passed from user settings
          // phoneNumber: '+917058513631'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setCallSid(data.callSid);
        console.log('✅ Call initiated:', data);

        // Reset to idle after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setCallSid(null);
        }, 5000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to initiate call');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('❌ Request call error:', error);
      setStatus('error');
      setErrorMessage('Network error. Is VoiceAgent server running?');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <Button
      onClick={handleRequestCall}
      disabled={status === 'loading' || status === 'success'}
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        status === 'idle' &&
          'border-sky-400/40 bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg hover:shadow-sky-500/50',
        status === 'loading' && 'bg-slate-400 cursor-wait',
        status === 'success' &&
          'bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/50',
        status === 'error' && 'bg-gradient-to-r from-rose-500 to-red-500 shadow-lg shadow-rose-500/50',
        className
      )}
    >
      {status === 'idle' && (
        <>
          <Phone className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
          Request AI Call
        </>
      )}
      {status === 'loading' && (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Call Incoming!
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="mr-2 h-4 w-4" />
          {errorMessage || 'Failed'}
        </>
      )}
    </Button>
  );
};

export default RequestCallButton;
