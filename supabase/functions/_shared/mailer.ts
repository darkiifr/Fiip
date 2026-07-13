import { getEnv, getOptionalEnv } from './env.ts';
import { renderEmailTemplate } from './email-templates.ts';

interface SendTemplateEmailInput {
  supabaseAdmin: any;
  userId?: string | null;
  to: string;
  template: string;
  data?: Record<string, unknown>;
}

const LEGACY_MAIL_DOMAIN_RE = /@fiip\.app\b/i;

export function resolveMailIdentity(value: string, fallback: string) {
  const identity = String(value || '').trim();
  if (!identity || LEGACY_MAIL_DOMAIN_RE.test(identity)) {
    return fallback;
  }
  return identity;
}

export async function sendTemplateEmail({ supabaseAdmin, userId, to, template, data = {} }: SendTemplateEmailInput) {
  const apiKey = getEnv('RESEND_API_KEY');
  const from = resolveMailIdentity(getEnv('MAIL_FROM'), 'Fiip <licences@fiip.fr>');
  const replyTo = resolveMailIdentity(getOptionalEnv('MAIL_REPLY_TO'), 'support@fiip.fr');
  const rendered = renderEmailTemplate(template, data);

  const { data: event } = await supabaseAdmin
    .from('email_events')
    .insert({
      user_id: userId || null,
      template,
      recipient: to,
      status: 'queued',
      metadata: data,
    })
    .select('id')
    .single();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo || undefined,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || `Resend failed (${response.status})`);
    }

    await supabaseAdmin
      .from('email_events')
      .update({ status: 'sent', provider_message_id: payload.id || null, sent_at: new Date().toISOString() })
      .eq('id', event?.id);
    return payload;
  } catch (error) {
    await supabaseAdmin
      .from('email_events')
      .update({ status: 'failed', error: error instanceof Error ? error.message : String(error) })
      .eq('id', event?.id);
    throw error;
  }
}
