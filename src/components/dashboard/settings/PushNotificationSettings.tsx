import { usePushNotification } from "@/store/PushNotificationContext";
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";

const PushNotificationSettings: React.FC = () => {
  const { permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotification();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);

  // iOS detection helpers
  const isIOS = () =>
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const isStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const showPushControls = !isIOS() || (isIOS() && isStandalone());

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await subscribe();
      addToast({
        type: "success",
        title: "Notifications enabled",
        description:
          "You will now receive push notifications for planned transactions.",
      });
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Failed to enable notifications",
        description:
          e?.message ||
          "Unable to enable push notifications. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribe();
      addToast({
        type: "info",
        title: "Notifications disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Failed to disable notifications",
        description:
          e?.message ||
          "Unable to disable push notifications. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Granted
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive" className="bg-red-600 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-slate-600 text-white">
            <Info className="w-3 h-3 mr-1" />
            Not Set
          </Badge>
        );
    }
  };

  const getStatusBadge = () => {
    if (isSubscribed) {
      return (
        <Badge variant="default" className="bg-green-600 text-white">
          <Bell className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-slate-600 text-white">
          <BellOff className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-3">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-base">
            <Bell className="w-4 h-4" />
            <span>Push Notifications</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Manage your notification preferences for planned transactions and
            reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-2 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">
                  Permission Status
                </span>
                {getPermissionBadge()}
              </div>
            </div>
            <div className="p-2 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">
                  Subscription Status
                </span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* iOS Instructions */}
          {isIOS() && !isStandalone() && (
            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-blue-300 font-medium">
                    iOS Setup Required
                  </h4>
                  <p className="text-sm text-blue-200">
                    To enable push notifications on iOS devices, you need to add
                    this app to your home screen:
                  </p>
                  <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Tap the Share button in Safari</li>
                    <li>Select "Add to Home Screen"</li>
                    <li>Open the app from your home screen</li>
                    <li>
                      Return to this settings page to enable notifications
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          {showPushControls && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">
                Notification Controls
              </h3>

              {permission === "granted" ? (
                <div className="space-y-2">
                  {isSubscribed ? (
                    <Button
                      onClick={handleUnsubscribe}
                      disabled={loading}
                      variant="outline"
                      className="w-full bg-slate-800 hover:border-slate-500 hover:text-white border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Disabling...
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4 mr-2" />
                          Disable Notifications
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubscribe}
                      disabled={loading}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Enabling...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          Enable Notifications
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Requesting Permission...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Request Notification Permission
                    </>
                  )}
                </Button>
              )}

              {/* Information */}
              <div className="p-3 bg-slate-700 rounded-lg">
                <h4 className="text-white font-medium mb-2 text-sm">
                  About Notifications
                </h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Get reminded when planned transactions are due</li>
                  <li>
                    • Receive notifications for budget alerts and insights
                  </li>
                  <li>• Stay updated on important account activities</li>
                  <li>• Notifications work even when the app is closed</li>
                </ul>
              </div>

              {permission === "denied" && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-red-300 font-medium text-sm">
                        Notifications Blocked
                      </h4>
                      <p className="text-sm text-red-200 mt-1">
                        Notifications have been blocked for this site. To enable
                        them, please:
                      </p>
                      <ol className="text-sm text-red-200 mt-2 space-y-1 list-decimal list-inside">
                        <li>
                          Click the lock icon in your browser's address bar
                        </li>
                        <li>Change notification permissions to "Allow"</li>
                        <li>Refresh the page and try again</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PushNotificationSettings;
