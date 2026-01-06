import { NextRequest, NextResponse } from 'next/server';
import { getClients } from '@/lib/notion/clients';
import { getContent } from '@/lib/notion/content';
import { getPackage } from '@/lib/notion/packages';
import {
  checkPipelineHealth,
  checkDeliverables,
  formatAlertMessage,
  getOverallSeverity,
  PipelineAlert,
  PipelineHealthCheck,
  DeliverablesSummary,
} from '@/lib/pipeline';
import {
  sendSlackMessage,
} from '@/lib/slack';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export interface PipelineCheckResult {
  clientId: string;
  clientName: string;
  pipelineHealth: PipelineHealthCheck;
  deliverables: DeliverablesSummary;
  overallStatus: 'healthy' | 'warning' | 'critical';
  allAlerts: PipelineAlert[];
}

// GET - Run pipeline health check (called by cron)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active clients
    const activeClients = await getClients('Active');

    // Get all content
    const allContent = await getContent();

    const results: PipelineCheckResult[] = [];
    const allAlerts: PipelineAlert[] = [];

    for (const client of activeClients) {
      // Get client's package for deliverables quotas
      let packageQuotas = {
        shortFormPerMonth: 0,
        youtubePerMonth: 0,
        podcastPerMonth: 0,
      };

      if (client.packageId) {
        try {
          const pkg = await getPackage(client.packageId);
          if (pkg) {
            packageQuotas = {
              shortFormPerMonth: pkg.shortFormPerMonth,
              youtubePerMonth: pkg.youtubePerMonth,
              podcastPerMonth: pkg.podcastPerMonth,
            };
          }
        } catch (error) {
          console.warn(`Could not fetch package for client ${client.name}`);
        }
      }

      // Check pipeline health (scheduled content, at-risk items)
      const pipelineHealth = checkPipelineHealth(client.id, client.name, allContent);

      // Check deliverables against quotas
      const deliverables = checkDeliverables(
        client.id,
        client.name,
        allContent,
        packageQuotas
      );

      // Combine all alerts
      const clientAlerts = [...pipelineHealth.alerts, ...deliverables.alerts];
      allAlerts.push(...clientAlerts);

      // Determine overall status
      const overallStatus = clientAlerts.some((a) => a.severity === 'critical')
        ? 'critical'
        : clientAlerts.some((a) => a.severity === 'warning')
        ? 'warning'
        : 'healthy';

      results.push({
        clientId: client.id,
        clientName: client.name,
        pipelineHealth,
        deliverables,
        overallStatus,
        allAlerts: clientAlerts,
      });
    }

    // Summary stats
    const criticalCount = allAlerts.filter((a) => a.severity === 'critical').length;
    const warningCount = allAlerts.filter((a) => a.severity === 'warning').length;
    const healthyClients = results.filter((r) => r.overallStatus === 'healthy').length;

    // Format alerts for notification (if webhook is configured)
    const formattedAlerts = allAlerts.map(formatAlertMessage);

    // Send to Slack if configured and there are alerts
    if (process.env.SLACK_BOT_TOKEN && allAlerts.length > 0) {
      await sendSlackAlerts(allAlerts, results);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalClients: activeClients.length,
        healthyClients,
        criticalAlerts: criticalCount,
        warningAlerts: warningCount,
      },
      results,
      alerts: formattedAlerts,
    });
  } catch (error) {
    console.error('Pipeline check cron error:', error);
    return NextResponse.json({ error: 'Failed to run pipeline check' }, { status: 500 });
  }
}

// POST - Manual trigger for specific client
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Get the specific client
    const clients = await getClients();
    const client = clients.find((c) => c.id === clientId);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get content for this client
    const allContent = await getContent({ clientId });

    // Get package quotas
    let packageQuotas = {
      shortFormPerMonth: 0,
      youtubePerMonth: 0,
      podcastPerMonth: 0,
    };

    if (client.packageId) {
      try {
        const pkg = await getPackage(client.packageId);
        if (pkg) {
          packageQuotas = {
            shortFormPerMonth: pkg.shortFormPerMonth,
            youtubePerMonth: pkg.youtubePerMonth,
            podcastPerMonth: pkg.podcastPerMonth,
          };
        }
      } catch (error) {
        console.warn(`Could not fetch package for client ${client.name}`);
      }
    }

    const pipelineHealth = checkPipelineHealth(client.id, client.name, allContent);
    const deliverables = checkDeliverables(client.id, client.name, allContent, packageQuotas);

    const clientAlerts = [...pipelineHealth.alerts, ...deliverables.alerts];
    const overallStatus = getOverallSeverity(pipelineHealth);

    return NextResponse.json({
      success: true,
      client: client.name,
      pipelineHealth,
      deliverables,
      overallStatus,
      alerts: clientAlerts.map(formatAlertMessage),
    });
  } catch (error) {
    console.error('Manual pipeline check error:', error);
    return NextResponse.json({ error: 'Failed to check pipeline' }, { status: 500 });
  }
}

// Send notification to Slack using the new library
async function sendSlackAlerts(
  alerts: PipelineAlert[],
  results: PipelineCheckResult[]
): Promise<void> {
  // Group alerts by client for cleaner notifications
  const alertsByClient = new Map<string, PipelineAlert[]>();

  for (const alert of alerts) {
    const existing = alertsByClient.get(alert.clientId) || [];
    existing.push(alert);
    alertsByClient.set(alert.clientId, existing);
  }

  // Send to main pipeline alerts channel
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  if (alerts.length > 0) {
    const emoji = criticalCount > 0 ? '🚨' : '⚠️';
    const summaryText = criticalCount > 0
      ? `${emoji} Pipeline Alert: ${criticalCount} critical, ${warningCount} warning issues`
      : `${emoji} Pipeline Warning: ${warningCount} issues found`;

    // Build summary message
    await sendSlackMessage({
      text: summaryText,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: summaryText,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alerts
              .slice(0, 10)
              .map((a) => `• *${a.clientName}* - ${a.contentType}: ${a.message}`)
              .join('\n'),
          },
        },
        ...(alerts.length > 10
          ? [
              {
                type: 'context' as const,
                elements: [
                  {
                    type: 'mrkdwn' as const,
                    text: `_...and ${alerts.length - 10} more alerts_`,
                  },
                ],
              },
            ]
          : []),
      ],
    });
  }

  // NOTE: Client channels are READ-ONLY - all alerts go to #pivotal-alerts only
  // Do not send any notifications to client-specific Slack channels
}
