"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useTeamSettings,
  useUpdateTeamSettings,
  useTestSlackWebhook,
} from "@/hooks/use-team-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Bell,
  Slack,
  Loader2,
  Check,
  AlertCircle,
  Send,
  RefreshCw,
  Rocket,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationsSettingsPage() {
  const { data: settings, isLoading, error } = useTeamSettings();
  const updateSettings = useUpdateTeamSettings();
  const testWebhook = useTestSlackWebhook();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  const handleSaveWebhook = async () => {
    try {
      await updateSettings.mutateAsync({
        slackWebhookUrl: webhookUrl || null,
        slackChannel: channel || null,
      });
      setShowWebhookForm(false);
      setWebhookUrl("");
      toast.success("Slack webhook saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save webhook"
      );
    }
  };

  const handleRemoveWebhook = async () => {
    try {
      await updateSettings.mutateAsync({
        slackWebhookUrl: null,
        slackChannel: null,
      });
      toast.success("Slack webhook removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove webhook"
      );
    }
  };

  const handleTestWebhook = async () => {
    try {
      await testWebhook.mutateAsync();
      toast.success("Test message sent! Check your Slack channel.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test message"
      );
    }
  };

  const handleToggle = async (
    setting: "notifyOnStatusChange" | "notifyOnBlocked" | "notifyOnReadyToDeploy",
    value: boolean
  ) => {
    try {
      await updateSettings.mutateAsync({ [setting]: value });
      toast.success("Setting updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update setting"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load notification settings. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground">
          Configure how your team receives notifications
        </p>
      </div>

      {/* Slack Integration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Slack className="h-5 w-5" />
            Slack Integration
          </CardTitle>
          <CardDescription>
            Connect Slack to receive release notifications in your channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.hasSlackWebhook && !showWebhookForm ? (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Slack webhook is configured
                  {settings.slackChannel && (
                    <span className="block mt-1">
                      Channel: <code>{settings.slackChannel}</code>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={testWebhook.isPending}
                >
                  {testWebhook.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Test Message
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWebhookForm(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Webhook
                </Button>
                <Button variant="destructive" onClick={handleRemoveWebhook}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!settings?.hasSlackWebhook && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Not Connected</AlertTitle>
                  <AlertDescription>
                    Add a Slack webhook URL to receive notifications
                  </AlertDescription>
                </Alert>
              )}

              {(showWebhookForm || !settings?.hasSlackWebhook) && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create an{" "}
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Incoming Webhook
                      </a>{" "}
                      in your Slack workspace
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channel">
                      Channel Override (optional)
                    </Label>
                    <Input
                      id="channel"
                      placeholder="#releases"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use the webhook&apos;s default channel
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveWebhook}
                      disabled={!webhookUrl || updateSettings.isPending}
                    >
                      {updateSettings.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save Webhook
                    </Button>
                    {showWebhookForm && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowWebhookForm(false);
                          setWebhookUrl("");
                          setChannel("");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which events trigger Slack notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="statusChange" className="font-medium">
                  Status Changes
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when a release moves to a new status
              </p>
            </div>
            <Switch
              id="statusChange"
              checked={settings?.notifyOnStatusChange ?? true}
              onCheckedChange={(checked) =>
                handleToggle("notifyOnStatusChange", checked)
              }
              disabled={!settings?.hasSlackWebhook}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="readyToDeploy" className="font-medium">
                  Ready to Deploy
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when a release is ready for staging or production
              </p>
            </div>
            <Switch
              id="readyToDeploy"
              checked={settings?.notifyOnReadyToDeploy ?? true}
              onCheckedChange={(checked) =>
                handleToggle("notifyOnReadyToDeploy", checked)
              }
              disabled={!settings?.hasSlackWebhook}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="blocked" className="font-medium">
                  Blocked Releases
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when a release becomes blocked or unblocked
              </p>
            </div>
            <Switch
              id="blocked"
              checked={settings?.notifyOnBlocked ?? true}
              onCheckedChange={(checked) =>
                handleToggle("notifyOnBlocked", checked)
              }
              disabled={!settings?.hasSlackWebhook}
            />
          </div>
        </CardContent>
        {!settings?.hasSlackWebhook && (
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Connect Slack above to enable notification preferences
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
