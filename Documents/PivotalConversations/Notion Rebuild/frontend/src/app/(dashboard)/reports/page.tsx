'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw, BarChart3, Users, Podcast, Calendar, FileText, Download, X, ExternalLink, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import PersonalBrandDashboard from '@/components/report-dashboard/PersonalBrandDashboard';
import PodcastDashboard from '@/components/report-dashboard/PodcastDashboard';
import { PersonalBrandDashboardData, PodcastDashboardData } from '@/lib/report-dashboard/dashboard-types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ReportClient {
  id: string;
  name: string;
  type: 'personal_brand' | 'podcast';
  platforms: string[];
  hasGoogleSheets: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const [clients, setClients] = useState<ReportClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<PersonalBrandDashboardData | PodcastDashboardData | null>(null);
  const [clientType, setClientType] = useState<'personal_brand' | 'podcast' | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Strategy Brief state
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefStrategistName, setBriefStrategistName] = useState('');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<{
    html: string;
    filename: string;
    planMonth: string;
    planYear: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch clients on mount
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/report-dashboard/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  // Fetch dashboard data when client or date changes
  useEffect(() => {
    if (selectedClientId) {
      fetchDashboardData();
    }
  }, [selectedClientId, selectedMonth, selectedYear]);

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh || !selectedClientId) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedClientId, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    if (!selectedClientId) return;

    setLoadingDashboard(true);
    try {
      const res = await fetch(
        `/api/report-dashboard/${selectedClientId}?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await res.json();
      setDashboardData(data.data);
      setClientType(data.clientType);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard');
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Generate Strategy Brief
  const generateStrategyBrief = async () => {
    if (!selectedClientId || !briefStrategistName.trim()) {
      toast.error('Please enter a strategist name');
      return;
    }

    setGeneratingBrief(true);
    try {
      const res = await fetch(`/api/report-dashboard/${selectedClientId}/strategy-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          strategistName: briefStrategistName.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate strategy brief');
      }

      const data = await res.json();
      setGeneratedBrief({
        html: data.html,
        filename: data.filename,
        planMonth: data.planMonth,
        planYear: data.planYear,
      });
      setBriefDialogOpen(false);
      setPreviewOpen(true);
      // Reset chat for new brief
      setChatMessages([]);
      setChatInput('');
      setShowChat(true);
      toast.success('Strategy brief generated successfully!');
    } catch (error) {
      console.error('Error generating brief:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate strategy brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  // Download as PDF - opens in new window with print dialog
  const downloadAsPdf = () => {
    if (!generatedBrief || !selectedClient) return;

    // Add print-specific CSS and auto-print script to the HTML
    const printStyles = `
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 0.5in; size: A4; }
        }
      </style>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    `;

    // Inject print styles before closing head tag
    let htmlWithPrintStyles = generatedBrief.html;
    if (htmlWithPrintStyles.includes('</head>')) {
      htmlWithPrintStyles = htmlWithPrintStyles.replace('</head>', `${printStyles}</head>`);
    } else if (htmlWithPrintStyles.includes('<body')) {
      htmlWithPrintStyles = htmlWithPrintStyles.replace('<body', `${printStyles}<body`);
    } else {
      htmlWithPrintStyles = `${printStyles}${htmlWithPrintStyles}`;
    }

    // Open in new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlWithPrintStyles);
      printWindow.document.close();
    } else {
      toast.error('Pop-up blocked. Please allow pop-ups and try again.');
    }
  };

  // Open brief in new tab for viewing
  const openBriefInNewTab = () => {
    if (!generatedBrief) return;

    const blob = new Blob([generatedBrief.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !generatedBrief || !selectedClientId) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setSendingMessage(true);

    // Add user message to chat
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);

    try {
      const res = await fetch(`/api/report-dashboard/${selectedClientId}/strategy-brief/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          currentHtml: generatedBrief.html,
          clientName: selectedClient?.name,
          planMonth: generatedBrief.planMonth,
          planYear: generatedBrief.planYear,
          dashboardData: dashboardData, // Include source data for context
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await res.json();

      // Add assistant response to chat
      setChatMessages([...newMessages, { role: 'assistant', content: data.message }]);

      // If there's updated HTML, update the brief
      if (data.updatedHtml) {
        setGeneratedBrief({
          ...generatedBrief,
          html: data.updatedHtml,
        });
        toast.success('Brief updated!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      // Remove the failed user message
      setChatMessages(chatMessages);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle enter key in chat
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-zinc-400">Loading report clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Reports</h1>
          <p className="text-zinc-400">
            View performance dashboards for personal brand and podcast clients
          </p>
        </div>
      </div>

      {/* Client & Date Selection */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Client Selector */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm text-zinc-400 mb-2 block">Select Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {clients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No clients configured
                    </SelectItem>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          {client.type === 'podcast' ? (
                            <Podcast className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-400" />
                          )}
                          <span>{client.name}</span>
                          {!client.hasGoogleSheets && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                              No data
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector */}
            <div className="w-[180px]">
              <label className="text-sm text-zinc-400 mb-2 block">Month</label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div className="w-[120px]">
              <label className="text-sm text-zinc-400 mb-2 block">Year</label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={!selectedClientId || loadingDashboard}
                className="border-zinc-700 text-zinc-300 hover:text-white"
              >
                {loadingDashboard ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? '' : 'border-zinc-700 text-zinc-300'}
              >
                Auto-refresh {autoRefresh ? 'On' : 'Off'}
              </Button>
              {/* Generate Strategy Brief - Only for personal brand clients */}
              {selectedClient && clientType === 'personal_brand' && dashboardData && (
                <Button
                  size="sm"
                  onClick={() => setBriefDialogOpen(true)}
                  className="bg-[#FF0022] hover:bg-[#CC001B] text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Brief
                </Button>
              )}
            </div>
          </div>

          {/* Selected Client Info */}
          {selectedClient && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  Viewing: {MONTHS[selectedMonth]} {selectedYear}
                </span>
              </div>
              <Badge
                variant="outline"
                className={
                  selectedClient.type === 'podcast'
                    ? 'border-purple-500/30 text-purple-400'
                    : 'border-blue-500/30 text-blue-400'
                }
              >
                {selectedClient.type === 'podcast' ? 'Podcast' : 'Personal Brand'}
              </Badge>
              <div className="flex gap-1">
                {selectedClient.platforms.map((platform) => (
                  <Badge
                    key={platform}
                    variant="outline"
                    className="text-xs border-zinc-700 text-zinc-400"
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      {!selectedClientId ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Select a Client</h3>
            <p className="text-zinc-500">
              Choose a client from the dropdown above to view their performance dashboard
            </p>
          </CardContent>
        </Card>
      ) : loadingDashboard ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400">Loading dashboard data...</p>
          </CardContent>
        </Card>
      ) : dashboardData && clientType === 'personal_brand' ? (
        <PersonalBrandDashboard data={dashboardData as PersonalBrandDashboardData} />
      ) : dashboardData && clientType === 'podcast' ? (
        <PodcastDashboard data={dashboardData as PodcastDashboardData} />
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
            <p className="text-zinc-500">
              This client doesn&apos;t have data configured for {MONTHS[selectedMonth]} {selectedYear}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generate Brief Dialog */}
      <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Strategy Brief</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a one-page Monthly Content Strategy Plan for {selectedClient?.name} based on {MONTHS[selectedMonth]} {selectedYear} data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="strategist" className="text-zinc-300">Strategist Name</Label>
              <Input
                id="strategist"
                placeholder="Enter strategist name..."
                value={briefStrategistName}
                onChange={(e) => setBriefStrategistName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500">
                This will appear in the brief header as &quot;Prepared by [Name]&quot;
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setBriefDialogOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                onClick={generateStrategyBrief}
                disabled={generatingBrief || !briefStrategistName.trim()}
                className="bg-[#FF0022] hover:bg-[#CC001B] text-white"
              >
                {generatingBrief ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Brief Dialog with Chat */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Strategy Brief Preview</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {selectedClient?.name} · {generatedBrief?.planMonth} {generatedBrief?.planYear} Strategy Plan
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                  className={`border-zinc-700 ${showChat ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:text-white'}`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {showChat ? 'Hide Chat' : 'Show Chat'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openBriefInNewTab}
                  className="border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Tab
                </Button>
                <Button
                  size="sm"
                  onClick={downloadAsPdf}
                  className="bg-[#FF0022] hover:bg-[#CC001B] text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex gap-4 mt-4 overflow-hidden">
            {/* Brief Preview */}
            <div className={`${showChat ? 'w-3/5' : 'w-full'} bg-white rounded-lg overflow-hidden transition-all duration-300`}>
              {generatedBrief && (
                <iframe
                  ref={iframeRef}
                  srcDoc={generatedBrief.html}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Strategy Brief Preview"
                />
              )}
            </div>

            {/* Chat Panel */}
            {showChat && (
              <div className="w-2/5 flex flex-col bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                {/* Chat Header */}
                <div className="p-3 border-b border-zinc-700 flex-shrink-0">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#FF0022]" />
                    Brief Assistant
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ask questions about the brief or request edits
                  </p>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm text-zinc-400">
                        Start a conversation to discuss or edit the brief
                      </p>
                      <div className="mt-4 space-y-2 text-xs text-zinc-500">
                        <p>Try asking:</p>
                        <p className="italic">&quot;Change the virality target to 500K views&quot;</p>
                        <p className="italic">&quot;What were the top performing posts?&quot;</p>
                        <p className="italic">&quot;Add another experiment to test&quot;</p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'bg-[#FF0022] text-white'
                              : 'bg-zinc-700 text-zinc-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {sendingMessage && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-zinc-700 flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Ask a question or request changes..."
                      className="flex-1 bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500 resize-none min-h-[60px] max-h-[120px]"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || sendingMessage}
                      className="bg-[#FF0022] hover:bg-[#CC001B] text-white self-end"
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
