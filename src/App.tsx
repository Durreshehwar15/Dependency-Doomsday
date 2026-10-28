
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

const originalNodes: Node[] = [
  { id: 'web', position: { x: 300, y: 20 }, data: { label: 'Web App' }, type: 'input' },
  { id: 'api', position: { x: 300, y: 150 }, data: { label: 'API Gateway' } },
  { id: 'payment', position: { x: 70, y: 300 }, data: { label: 'Payment Service' } },
  { id: 'inventory', position: { x: 300, y: 300 }, data: { label: 'Inventory Service' } },
  { id: 'database', position: { x: 530, y: 300 }, data: { label: 'Orders Database' }, type: 'output' },
];

const originalEdges: Edge[] = [
  { id: 'e1', source: 'web', target: 'api', animated: true },
  { id: 'e2', source: 'api', target: 'payment', animated: true },
  { id: 'e3', source: 'api', target: 'inventory', animated: true },
  { id: 'e4', source: 'api', target: 'database', animated: true },
];

type Status = 'healthy' | 'failed' | 'affected';
type Health = 'healthy' | 'failed';
type IncidentEvent = {
  id: number;
  service: string;
  event: 'FAILED' | 'RECOVERED';
  time: string;
};

const serviceNames: Record<string, string> = {
  api: 'API Gateway',
  payment: 'Payment Service',
  inventory: 'Inventory Service',
  database: 'Orders Database',
};

export default function App() {
  const [selected, setSelected] = useState('payment');
  const [failure, setFailure] = useState('');
  const [backup, setBackup] = useState(false);

  const [paymentHealth, setPaymentHealth] = useState<Health>('healthy');
  const [apiHealth, setApiHealth] = useState<Health>('healthy');
  const [inventoryHealth, setInventoryHealth] = useState<Health>('healthy');
  const [databaseHealth, setDatabaseHealth] = useState<Health>('healthy');

  const [incidentHistory, setIncidentHistory] = useState<IncidentEvent[]>([]);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);

const helpContent: Record<string, { title: string; description: string; tips: string[] }> = {
  scores: {
    title: 'Understanding System Scores',
    description: 'These cards summarize the current condition of your simulated system.',
    tips: [
      'Failed: services currently reporting a failure.',
      'At risk: services affected by another service failing.',
      'Healthy: services not currently marked as failed or affected.',
      'Resilience: the percentage of services not marked as impacted.',
      'Recovery improvement compares current resilience with the estimated baseline.',
    ],
  },
  topology: {
    title: 'System Topology',
    description: 'This map shows how your services depend on one another.',
    tips: [
      'Click a box to select a service.',
      'Lines represent dependencies between services.',
      'Red means failed; amber means at risk.',
      'Try failing the API Gateway and watch the impact spread.',
    ],
  },
  controls: {
    title: 'Failure and Recovery Controls',
    description: 'Use these buttons to experiment with service failures.',
    tips: [
      'Simulate failure: mark a service as failed in the simulation.',
      'Restore Selected Service: ask the backend to restore that service.',
      'Payment backup: demonstrate a simplified backup scenario.',
      'Reset: clear the locally simulated failure.',
      'Quick breakers let you test specific services quickly.',
    ],
  },
  health: {
    title: 'Health Server',
    description: 'These controls interact with your backend server.',
    tips: [
      'Simulate Payment Failure asks the backend to fail the payment service.',
      'Restore Payment Service asks the backend to restore it.',
      'The app also checks service health periodically.',
      'These backend actions are different from local simulation buttons.',
    ],
  },
  monitor: {
    title: 'Live HTTP Check',
    description: 'Check whether an external website or API responds to an HTTP request.',
    tips: [
      'Enter an HTTPS endpoint URL.',
      'HTTP status shows the response code, such as 200.',
      'Response time shows how long the request took.',
      'Healthy means the monitor considers the response successful.',
      'A failed check can indicate an error or a connection problem.',
    ],
  },
  history: {
    title: 'Incident History',
    description: 'Review the failures and recoveries recorded during your session.',
    tips: [
      'FAILED means a failure event was recorded.',
      'RECOVERED means a recovery event was recorded.',
      'The service column identifies the affected service.',
      'The time column shows when the event was recorded.',
      'The latest entries appear first. The current version keeps history in memory, so refreshing clears it.',
    ],
  },
};
const HelpButton = ({ topic }: { topic: string }) => (
  <button
    type="button"
    className="help-button"
    onClick={() => setHelpTopic(topic)}
    aria-label={`Help about ${helpContent[topic]?.title ?? topic}`}
  >
    ⓘ What is this?
  </button>
  
);
useEffect(() => {
  if (!helpTopic) return;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setHelpTopic(null);
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [helpTopic]);
  const previousHealth = useRef<Record<string, Health>>({
    payment: 'healthy',
    api: 'healthy',
    inventory: 'healthy',
    database: 'healthy',
  });

  const [monitorUrl, setMonitorUrl] = useState('https://httpbin.org/status/200');
  const [monitorResult, setMonitorResult] = useState<{
    ok: boolean;
    statusCode: number | null;
    responseTimeMs: number | null;
    checkedAt: string;
    finalUrl?: string;
    error?: string;
  } | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);

  // Add an incident to the history.
  const recordIncident = (service: string, event: IncidentEvent['event']) => {
    setIncidentHistory((history) =>
      [
        {
          id: Date.now() + Math.random(),
          service: serviceNames[service] ?? service,
          event,
          time: new Date().toLocaleTimeString(),
        },
        ...history,
      ].slice(0, 20)
    );
  };

  // Watch health-server changes and record failures/recoveries.
  useEffect(() => {
    const currentHealth: Record<string, Health> = {
      payment: paymentHealth,
      api: apiHealth,
      inventory: inventoryHealth,
      database: databaseHealth,
    };

    const newEvents: IncidentEvent[] = [];

    Object.entries(currentHealth).forEach(([service, current]) => {
      const previous = previousHealth.current[service];

      if (current !== previous) {
        newEvents.push({
          id: Date.now() + Math.random(),
          service: serviceNames[service],
          event: current === 'failed' ? 'FAILED' : 'RECOVERED',
          time: new Date().toLocaleTimeString(),
        });
      }
    });

    previousHealth.current = currentHealth;

    if (newEvents.length > 0) {
      setIncidentHistory((history) => [...newEvents, ...history].slice(0, 20));
    }
  }, [paymentHealth, apiHealth, inventoryHealth, databaseHealth]);

  // Check all four services every three seconds.
  useEffect(() => {
    let active = true;

    const checkService = async (service: string): Promise<Health> => {
      try {
        const response = await fetch(`/api/health/${service}`);
        const data = await response.json();

        return response.ok && data.status === 'healthy'
          ? 'healthy'
          : 'failed';
      } catch {
        return 'failed';
      }
    };

    const checkAllServices = async () => {
      const [payment, api, inventory, database] = await Promise.all([
        checkService('payment'),
        checkService('api'),
        checkService('inventory'),
        checkService('database'),
      ]);

      if (active) {
        setPaymentHealth(payment);
        setApiHealth(api);
        setInventoryHealth(inventory);
        setDatabaseHealth(database);
      }
    };

    void checkAllServices();
    const interval = setInterval(() => void checkAllServices(), 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const statuses = useMemo(() => {
    const result: Record<string, Status> = {};

    originalNodes.forEach((node) => {
      result[node.id] = 'healthy';
    });

    const failedServices = new Set<string>();

    if (paymentHealth === 'failed') failedServices.add('payment');
    if (apiHealth === 'failed') failedServices.add('api');
    if (inventoryHealth === 'failed') failedServices.add('inventory');
    if (databaseHealth === 'failed') failedServices.add('database');
    if (failure) failedServices.add(failure);

    failedServices.forEach((service) => {
      result[service] = 'failed';

      const queue = [service];
      const visited = new Set([service]);

      while (queue.length > 0) {
        const current = queue.shift()!;

        originalEdges.forEach((edge) => {
          if (edge.target === current && !visited.has(edge.source)) {
            visited.add(edge.source);
            queue.push(edge.source);

            if (!failedServices.has(edge.source)) {
              result[edge.source] = 'affected';
            }
          }
        });
      }
    });

    if (backup && failedServices.has('payment')) {
      result.payment = 'healthy';
      result.api = 'healthy';
      result.web = 'healthy';
    }

    return result;
  }, [failure, backup, paymentHealth, apiHealth, inventoryHealth, databaseHealth]);

  const nodes = useMemo(
    () =>
      originalNodes.map((node) => {
        const status = statuses[node.id];
        const isSelected = selected === node.id;
        const serviceLabel = String(node.data.label ?? node.id);

        const label =
          status === 'failed'
            ? `${serviceLabel} — FAILED`
            : status === 'affected'
              ? `${serviceLabel} — AT RISK`
              : serviceLabel;

        return {
          ...node,
          data: { label },
          style: {
            background:
              status === 'failed' ? '#FEF2F2'
                : status === 'affected' ? '#FFFBEB' : '#FFFFFF',
            color:
              status === 'failed' ? '#991B1B'
                : status === 'affected' ? '#92400E' : '#0F172A',
            border: `1.5px solid ${
              status === 'failed' ? '#DC2626'
                : status === 'affected' ? '#D97706'
                  : isSelected ? '#0F172A' : '#CBD2DC'
            }`,
            borderRadius: 10,
            padding: 14,
            width: 190,
            fontWeight: 600,
            fontSize: 13,
            textAlign: 'center' as const,
            boxShadow: isSelected
              ? '0 0 0 4px rgba(15, 23, 42, 0.12)'
              : '0 1px 2px rgba(15, 23, 42, 0.08)',
          },
        };
      }),
    [selected, statuses]
  );

  const edges = useMemo(
    () =>
      originalEdges.map((edge) => ({
        ...edge,
        style: {
          stroke:
            statuses[edge.target] === 'failed' ? '#DC2626'
              : statuses[edge.target] === 'affected' ? '#D97706' : '#94A3B8',
          strokeWidth: 2,
        },
      })),
    [statuses]
  );

  const affectedCount = Object.values(statuses).filter((s) => s !== 'healthy').length;
  const failedCount = Object.values(statuses).filter((s) => s === 'failed').length;
  const atRiskCount = Object.values(statuses).filter((s) => s === 'affected').length;
  const healthyCount = Object.values(statuses).filter((s) => s === 'healthy').length;

  const resilienceScore = Math.round(
    ((originalNodes.length - affectedCount) / originalNodes.length) * 100
  );

  const baselineScore = useMemo(() => {
    if (!failure) return 100;

    const visited = new Set<string>([failure]);
    const queue = [failure];

    while (queue.length > 0) {
      const current = queue.shift()!;

      originalEdges.forEach((edge) => {
        if (edge.target === current && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
        }
      });
    }

    return Math.round(
      ((originalNodes.length - visited.size) / originalNodes.length) * 100
    );
  }, [failure]);

  const recoveryGain = Math.max(0, resilienceScore - baselineScore);
  const selectedServiceName = String(
    originalNodes.find((node) => node.id === selected)?.data.label ?? selected
  );

  const restoreService = async (service: string) => {
    try {
      const response = await fetch(`/api/restore/${service}`, { method: 'POST' });

      if (!response.ok) throw new Error('Restore request failed');

      if (failure === service) {
        recordIncident(service, 'RECOVERED');
        setFailure('');
      }

      setBackup(false);
    } catch (error) {
      console.error('Could not restore service:', error);
      alert('Could not restore the service. Check that the health server is running.');
    }
  };

  const resetSimulation = () => {
    if (failure) recordIncident(failure, 'RECOVERED');
    setFailure('');
    setBackup(false);
  };

  const simulateFailure = (service: string) => {
    recordIncident(service, 'FAILED');
    setFailure(service);
    setBackup(false);
  };

  const checkExternalEndpoint = async () => {
    setMonitorLoading(true);

    try {
      const response = await fetch('/api/monitor-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: monitorUrl }),
      });

      const data = await response.json();

      if (!response.ok && !data.checkedAt) {
        throw new Error(data.message || 'The monitor request failed.');
      }

      setMonitorResult({
        ok: data.ok,
        statusCode: data.statusCode ?? data.httpStatus ?? null,
        responseTimeMs: data.responseTimeMs ?? data.responseTime ?? null,
        checkedAt: data.checkedAt ?? new Date().toLocaleString(),
        finalUrl: data.finalUrl ?? data.endpoint,
        error: data.error,
      });
    } catch (error) {
      setMonitorResult({
        ok: false,
        statusCode: null,
        responseTimeMs: null,
        checkedAt: new Date().toLocaleString(),
        error: error instanceof Error
          ? error.message
          : 'Could not reach the monitoring server.',
      });
    } finally {
      setMonitorLoading(false);
    }
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
  <img src="icon-512.png" />
</div>
          <div className="brand-text">
            <h1>Dependency Doomsday</h1>
            <p>BREAK IT BEFORE IT BREAKS YOU</p>
          </div>
        </div>
        <div className="live-badge"><span /> SIMULATION MODE</div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow">DEPENDENCY RISK SIMULATORs</p>
          <h2>Every failure has a <span>ripple effect.</span></h2>
          <p className="description">
            Crash a service. Trace the damage. Find out if your system can survive.
          </p>
        </div>
        <div className="metric">
          <span className="eyebrow">SERVICES AT RISK</span>
          <strong>{affectedCount}<small> / {originalNodes.length}</small></strong>
          <div className="meter" aria-hidden="true">
            <i style={{ width: `${(affectedCount / originalNodes.length) * 100}%` }} />
          </div>
        </div>
      </section>

      <section className="score-grid" aria-label="System scores">
        
  <div className="heading-with-help">
    <h3>System Scores</h3>
    <HelpButton topic="scores" />
  </div>

  <div className="score-grid"></div>
        <div className="score-card tone-failed">
          <span className="eyebrow">FAILED SERVICES</span>
          <strong>{failedCount}</strong>
          <p>Services reporting failures</p>
        </div>
        <div className="score-card tone-atrisk">
          <span className="eyebrow">AT-RISK SERVICES</span>
          <strong>{atRiskCount}</strong>
          <p>Services potentially affected</p>
        </div>
        <div className="score-card tone-healthy">
          <span className="eyebrow">HEALTHY SERVICES</span>
          <strong>{healthyCount}</strong>
          <p>Services currently operational</p>
        </div>
        <div className="score-card">
          <span className="eyebrow">CURRENT RESILIENCE</span>
          <strong>{resilienceScore}%</strong>
          <p>{failure ? 'Health after the simulated incident' : 'All services operational'}</p>
        </div>
        <div className="score-card">
          <span className="eyebrow">BEFORE RECOVERY</span>
          <strong>{baselineScore}%</strong>
          <p>{failure ? 'Estimated health without a backup' : 'No active incident'}</p>
        </div>
        <div className="score-card recovery-card tone-healthy">
          <span className="eyebrow">RECOVERY IMPROVEMENT</span>
          <strong>+{recoveryGain}%</strong>
          <p>{recoveryGain > 0 ? 'Resilience restored by recovery' : 'Run an incident to compare recovery'}</p>
        </div>
      </section>

      <section className={`incident-report ${failedCount > 0 ? 'is-alert' : ''}`}>
        <div className="report-icon">{failure ? '!' : '✓'}</div>
        <div>
          <h4>{failedCount > 0 ? 'Incident analysis' : 'System standing by'}</h4>
          <p>
            {failedCount === 0
              ? 'All monitored services are healthy. No active failures detected.'
              : `${failedCount} service${failedCount === 1 ? '' : 's'} failed, and ${atRiskCount} service${atRiskCount === 1 ? '' : 's'} at risk. Total impacted: ${affectedCount} of ${originalNodes.length} services.`}
          </p>
        </div>
      </section>

      <section className="workspace">
        <div className="map-card">
          <div className="map-heading">
            <div>
             <div className="heading-with-help">
  <h3>System topology</h3>
  <HelpButton topic="topology" />
</div>
              <p>Select a node, then simulate an outage.</p>
            </div>
            <span className={`status-pill ${failedCount > 0 ? 'warning' : ''}`}>
              <i /> {failedCount > 0 ? 'INCIDENT ACTIVE' : 'ALL SYSTEMS READY'}
            </span>
          </div>
          <div className="flow-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={(_, node) => setSelected(node.id)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={1.5}
            >
              <Background color="#CBD2DC" gap={22} />
              <Controls />
              <MiniMap
                nodeColor={(node) =>
                  statuses[node.id] === 'failed' ? '#DC2626'
                    : statuses[node.id] === 'affected' ? '#D97706' : '#059669'
                }
              />
            </ReactFlow>
          </div>
        </div>

        <aside className="control-panel">
          <div className="selected-service">
            <span className="eyebrow">SELECTED SERVICE</span>
            <strong>{selectedServiceName}</strong>
            <span className="service-hint">
              {statuses[selected] === 'failed'
                ? 'This service has crashed.'
                : statuses[selected] === 'affected'
                  ? 'This service is affected by the outage.'
                  : 'This service is currently operational.'}
            </span>
          </div>

          <div className="actions">
            <div className="action-group">
              <div className="heading-with-help">
  <p className="group-title">Selected service</p>
  <HelpButton topic="controls" />
</div>
              <div className="btn-grid two">
                <button className="danger-button" onClick={() => simulateFailure(selected)}>
                  ⚡ Simulate failure
                </button>
                <button className="reset-button" onClick={() => void restoreService(selected)}>
                  ↺ Restore Selected Service
                </button>
                <button
                  className="secondary-button"
                  disabled={failure !== 'payment'}
                  onClick={() => setBackup(true)}
                >
                  ⛑ Enable payment backup
                </button>
                <button className="reset-button" onClick={resetSimulation}>
                  ↺ Reset
                </button>
              </div>
            </div>

            <div className="action-group">
              <div className="heading-with-help">
  <p className="group-title">Health server</p>
  <HelpButton topic="health" />
</div>
              <div className="btn-grid two">
                <button
                  className="danger-button"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/simulate-failure', {
                        method: 'POST',
                      });
                      if (!response.ok) throw new Error('Failure request failed');

                      recordIncident('payment', 'FAILED');
                      setFailure('');
                      setBackup(false);
                    } catch (error) {
                      console.error(error);
                      alert('Could not reach the health server. Check that it is running.');
                    }
                  }}
                >
                  ⚡ Simulate Payment Failure
                </button>
                <button
                  className="reset-button"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/restore', { method: 'POST' });
                      if (!response.ok) throw new Error('Restore request failed');

                      recordIncident('payment', 'RECOVERED');
                      setPaymentHealth('healthy');
                      setFailure('');
                      setBackup(false);
                    } catch (error) {
                      console.error(error);
                      alert('Could not reach the health server. Check that it is running.');
                    }
                  }}
                >
                  ↺ Restore Payment Service
                </button>
              </div>
            </div>

            <div className="action-group">
              <p className="group-title">Quick breakers</p>
              <div className="btn-grid">
                <button className="danger-button" onClick={() => simulateFailure('api')}>
                  Simulate API Gateway Failure
                </button>
                <button className="danger-button" onClick={() => simulateFailure('inventory')}>
                  Simulate Inventory Failure
                </button>
                <button className="danger-button" onClick={() => simulateFailure('database')}>
                  Simulate Database Failure
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="external-monitor" aria-label="External endpoint monitor">
        <div className="external-monitor-heading">
          <div>
            <p className="eyebrow">LIVE HTTP CHECK</p>
            <div className="heading-with-help">
  <h3>Monitor an external website or API</h3>
  <HelpButton topic="monitor" />
</div>
            <p>Send a real HTTPS request from the backend and inspect its response status and latency.</p>
          </div>
          <span className={`monitor-status ${monitorResult ? (monitorResult.ok ? 'monitor-ok' : 'monitor-failed') : 'monitor-idle'}`}>
            <i />
            {monitorResult ? (monitorResult.ok ? 'ENDPOINT HEALTHY' : 'ENDPOINT UNHEALTHY') : 'NOT CHECKED'}
          </span>
        </div>

        <form
          className="monitor-form"
          onSubmit={(event) => {
            event.preventDefault();
            void checkExternalEndpoint();
          }}
        >
          <label htmlFor="monitor-url">HTTPS endpoint URL</label>
          <div className="monitor-input-row">
            <input
              id="monitor-url"
              type="url"
              value={monitorUrl}
              onChange={(event) => setMonitorUrl(event.target.value)}
              placeholder="https://httpbin.org/status/200"
              required
            />
            <button type="submit" className="secondary-button" disabled={monitorLoading}>
              {monitorLoading ? 'Checking…' : 'Check now'}
            </button>
          </div>
          <p className="monitor-note">Try the default endpoint: https://httpbin.org/status/200</p>
        </form>

        {monitorResult && (
          <div className={`monitor-result ${monitorResult.ok ? 'result-ok' : 'result-failed'}`} aria-live="polite">
            <div className="monitor-result-grid">
              <div>
                <span className="eyebrow">HTTP STATUS</span>
                <strong>{monitorResult.statusCode ?? '—'}</strong>
              </div>
              <div>
                <span className="eyebrow">RESPONSE TIME</span>
                <strong>{monitorResult.responseTimeMs == null ? '—' : `${monitorResult.responseTimeMs} ms`}</strong>
              </div>
              <div>
                <span className="eyebrow">RESULT</span>
                <strong>{monitorResult.ok ? 'Healthy' : 'Unhealthy'}</strong>
              </div>
            </div>
            {monitorResult.error && <p className="monitor-error">{monitorResult.error}</p>}
            <p className="monitor-checked">Last checked: {monitorResult.checkedAt}</p>
          </div>
        )}
      </section>

      <section className="incident-history">
        <div className="heading-with-help">
  <h3>Incident History</h3>
  <HelpButton topic="history" />
</div>
        {incidentHistory.length === 0 ? (
          <p className="history-empty">No incidents recorded yet. Simulate a failure to get started.</p>
        ) : (
          <div className="history-list">
            <div className="history-head" aria-hidden="true">
              <span>Event</span>
              <span>Service</span>
              <span>Time</span>
            </div>
            {incidentHistory.map((incident) => (
              <div className="history-item" key={incident.id}>
                <span className={incident.event === 'FAILED' ? 'history-failed' : 'history-recovered'}>
                  {incident.event}
                </span>
                <strong>{incident.service}</strong>
                <time>{incident.time}</time>
              </div>
            ))}
          </div>
        )}
      </section>
{helpTopic && helpContent[helpTopic] && (
  <div
    className="help-overlay"
    onClick={() => setHelpTopic(null)}
  >
    <div
      className="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="help-close"
        onClick={() => setHelpTopic(null)}
        aria-label="Close help"
      >
        ×
      </button>

      <span className="eyebrow">QUICK GUIDE</span>
      <h2 id="help-modal-title">
        {helpContent[helpTopic].title}
      </h2>

      <p>{helpContent[helpTopic].description}</p>

      <ul>
        {helpContent[helpTopic].tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <button
        type="button"
        className="secondary-button"
        onClick={() => setHelpTopic(null)}
      >
        Got it
      </button>
    </div>
  </div>
)}{helpTopic && helpContent[helpTopic] && (
  <div
    className="help-overlay"
    onClick={() => setHelpTopic(null)}
  >
    <div
      className="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="help-close"
        onClick={() => setHelpTopic(null)}
        aria-label="Close help"
      >
        ×
      </button>

      <span className="eyebrow">QUICK GUIDE</span>
      <h2 id="help-modal-title">
        {helpContent[helpTopic].title}
      </h2>

      <p>{helpContent[helpTopic].description}</p>

      <ul>
        {helpContent[helpTopic].tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <button
        type="button"
        className="secondary-button"
        onClick={() => setHelpTopic(null)}
      >
        Got it
      </button>
    </div>
  </div>
)}
     <footer>
  <span>DEPENDENCY DOOMSDAY <span className="footer-dot">●</span> BUILD 001</span>
  <span>VIRTUAL ENVIRONMENT · NO REAL SERVICES AFFECTED</span>
  <span>BUILT BY <strong>Durre Shehwar</strong></span>
</footer>
    </main>
  );
}
