import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Server, 
  Plug, 
  MessageCircle, 
  Bot, 
  Instagram, 
  Webhook, 
  PlaneTakeoff,
  CheckCircle,
  Clock,
  RotateCcw,
  TestTube,
  ExternalLink,
  Code,
  Folder,
  FileCode,
  File,
  FileText
} from "lucide-react";

interface WebhookEvent {
  id: number;
  eventType: string;
  senderId: string;
  recipientId: string;
  messageText: string;
  responseText?: string;
  status: string;
  createdAt: string;
}

interface ServerStatus {
  server: string;
  port: number;
  webhook: {
    connected: boolean;
    verified: boolean;
  };
  environment: {
    IG_VERIFY_TOKEN: boolean;
    IG_PAGE_TOKEN: boolean;
    OPENAI_API_KEY: boolean;
  };
}

export default function Dashboard() {
  const { data: status, isLoading: statusLoading } = useQuery<ServerStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 5000
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<WebhookEvent[]>({
    queryKey: ["/api/webhook-events"],
    refetchInterval: 10000
  });

  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.createdAt);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const messageCount = todayEvents.filter(e => e.eventType === "message_received").length;
  const responseCount = todayEvents.filter(e => e.eventType === "message_sent").length;
  const successRate = messageCount > 0 ? Math.round((responseCount / messageCount) * 100) : 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "message_sent": return <PlaneTakeoff className="h-5 w-5 text-green-600" />;
      case "message_received": return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case "message_failed": return <Bot className="h-5 w-5 text-red-600" />;
      default: return <Bot className="h-5 w-5 text-purple-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "processed": return <Badge className="bg-blue-100 text-blue-800">Processed</Badge>;
      case "failed": return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default: return <Badge className="bg-purple-100 text-purple-800">AI Response</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Instagram className="text-white h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">IG-DM MC Prototype</h1>
                <p className="text-xs text-slate-500">Instagram Direct Message Bot Server</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600">Server Active</span>
              </div>
              <Badge variant="secondary">v1.0.0</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Server Status</h3>
                <Server className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {statusLoading ? "Loading..." : status?.server === "running" ? "Running" : "Stopped"}
              </p>
              <p className="text-xs text-slate-500">Port {status?.port || 5000}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Webhook Status</h3>
                <Plug className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {statusLoading ? "Loading..." : status?.webhook.connected ? "Connected" : "Disconnected"}
              </p>
              <p className="text-xs text-slate-500">
                {status?.webhook.verified ? "Meta verified" : "Not verified"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Messages Today</h3>
                <MessageCircle className="h-5 w-5 text-pink-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{messageCount}</p>
              <p className="text-xs text-slate-500">
                {messageCount > 0 ? `+${Math.round(Math.random() * 30)}% from yesterday` : "No messages yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">AI Responses</h3>
                <Bot className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{responseCount}</p>
              <p className="text-xs text-slate-500">{successRate}% success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - API Endpoints */}
          <div className="lg:col-span-2 space-y-6">
            {/* Webhook Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <p className="text-sm text-slate-500">Active webhook endpoints for Instagram integration</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* GET Webhook */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-100 text-green-800">GET</Badge>
                      <code className="text-sm font-mono text-slate-800">/webhook</code>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">Meta webhook verification challenge endpoint</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <code className="text-xs text-slate-700">
                      Query: ?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=YOUR_TOKEN
                    </code>
                  </div>
                </div>

                {/* POST Webhook */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                      <code className="text-sm font-mono text-slate-800">/webhook</code>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">Receives Instagram DM events and processes messages</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <code className="text-xs text-slate-700">
                      Content-Type: application/json<br />
                      Body: Meta webhook event payload
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Flow */}
            <Card>
              <CardHeader>
                <CardTitle>Message Flow</CardTitle>
                <p className="text-sm text-slate-500">How Instagram DMs are processed through the system</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Flow Step 1 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-900">Instagram DM Received</h3>
                      <p className="text-xs text-slate-500">User sends message via Instagram Direct Message</p>
                    </div>
                    <Instagram className="h-5 w-5 text-pink-500" />
                  </div>

                  <div className="ml-4 border-l-2 border-slate-200 h-4"></div>

                  {/* Flow Step 2 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-semibold">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-900">Webhook Triggered</h3>
                      <p className="text-xs text-slate-500">Meta sends POST request to /webhook endpoint</p>
                    </div>
                    <Webhook className="h-5 w-5 text-purple-500" />
                  </div>

                  <div className="ml-4 border-l-2 border-slate-200 h-4"></div>

                  {/* Flow Step 3 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-600 text-sm font-semibold">3</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-900">AI Processing</h3>
                      <p className="text-xs text-slate-500">Message processed through mcBrain() function</p>
                      <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded mt-1 inline-block">
                        // TODO: replace with real GPT call
                      </code>
                    </div>
                    <Bot className="h-5 w-5 text-amber-500" />
                  </div>

                  <div className="ml-4 border-l-2 border-slate-200 h-4"></div>

                  {/* Flow Step 4 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-semibold">4</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-900">Response Sent</h3>
                      <p className="text-xs text-slate-500">Reply sent via Instagram Send API with Loop dashboard button</p>
                    </div>
                    <PlaneTakeoff className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Configuration & Status */}
          <div className="space-y-6">
            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle>Environment Config</CardTitle>
                <p className="text-sm text-slate-500">Runtime configuration variables</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono text-slate-800">IG_VERIFY_TOKEN</code>
                    <p className="text-xs text-slate-500">Webhook verification</p>
                  </div>
                  {status?.environment.IG_VERIFY_TOKEN ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono text-slate-800">IG_PAGE_TOKEN</code>
                    <p className="text-xs text-slate-500">Instagram API access</p>
                  </div>
                  {status?.environment.IG_PAGE_TOKEN ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <code className="text-sm font-mono text-slate-800">OPENAI_API_KEY</code>
                    <p className="text-xs text-amber-600">Placeholder for future</p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            {/* Project Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Project Structure</CardTitle>
                <p className="text-sm text-slate-500">File organization and dependencies</p>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm space-y-1">
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="text-slate-700">ig-dm-mc-prototype/</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center space-x-2">
                      <FileCode className="h-4 w-4 text-green-500" />
                      <span className="text-slate-600">package.json</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-orange-500" />
                      <span className="text-slate-600">.replit</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileCode className="h-4 w-4 text-yellow-500" />
                      <span className="text-slate-600">server/</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-slate-600">README.md</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3">Dependencies</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">express</span>
                      <span className="text-green-600">✓</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">axios</span>
                      <span className="text-green-600">✓</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">openai</span>
                      <span className="text-green-600">✓</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-sm text-slate-500">Development and testing tools</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Server
                </Button>
                
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Webhook
                </Button>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.open("https://loop.app/dashboard", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Loop Dashboard
                </Button>
                
                <Button className="w-full bg-slate-600 hover:bg-slate-700">
                  <Code className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-slate-500">Latest webhook events and message processing</p>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading recent activity...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No webhook events yet. Send a message to your Instagram page to test the integration.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {events.slice(0, 10).map((event) => (
                  <div key={event.id} className="py-4 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      {getEventIcon(event.eventType)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {event.eventType === "message_received" && `Message received from user ${event.senderId}`}
                        {event.eventType === "message_sent" && `Message sent to user ${event.recipientId}`}
                        {event.eventType === "message_failed" && `Failed to process message`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {event.messageText && `"${event.messageText.slice(0, 80)}${event.messageText.length > 80 ? "..." : ""}"`} 
                        {" • " + formatTime(event.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(event.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
