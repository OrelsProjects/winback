import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "./logout-button";
import { Mail, Shield, RefreshCw, Globe } from "lucide-react";

export default function SettingsPage() {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "—";
  const replyTo = process.env.RESEND_REPLY_TO ?? "—";
  const dailyCap = process.env.DAILY_SEND_CAP ?? "100";
  const leadsUrl = process.env.WRITESTACK_LEADS_URL ?? "—";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Read-only view of environment configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Configuration
          </CardTitle>
          <CardDescription>Managed via environment variables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">From address</span>
            <span className="text-sm text-muted-foreground font-mono">{fromEmail}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Reply-to</span>
            <span className="text-sm text-muted-foreground font-mono">{replyTo}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium">Daily send cap</span>
            <Badge variant="secondary">{dailyCap} / day</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Sync Configuration
          </CardTitle>
          <CardDescription>WriteStack lead source</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Leads endpoint</span>
            <span className="text-sm text-muted-foreground font-mono truncate max-w-xs">{leadsUrl}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium">Cron schedule</span>
            <Badge variant="outline" className="font-mono">0 6 * * *</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Authentication
          </CardTitle>
          <CardDescription>Single-password gate via iron-session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Auth method</span>
            <Badge>Password gate</Badge>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium">Session duration</span>
            <span className="text-sm text-muted-foreground">30 days (httpOnly cookie)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Deliverability Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Set SPF/DKIM/DMARC on your from-domain in Resend</p>
          <p>✓ Verify domain in Resend dashboard</p>
          <p>✓ Check reply-to is a monitored inbox</p>
          <p>✓ Resend webhook configured for bounce/complaint auto-exclusion</p>
          <p>✓ Supabase PITR enabled (Pro plan)</p>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}
