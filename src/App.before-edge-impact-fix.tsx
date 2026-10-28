import { useMemo, useState } from 'react';
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

export default function App() {
  const [selected, setSelected] = useState('payment');
  const [failure, setFailure] = useState('');
  const [backup, setBackup] = useState(false);

  const statuses = useMemo(() => {
    const result: Record<string, Status> = {};
    originalNodes.forEach((node) => {
      result[node.id] = 'healthy';
    });

    if (failure) {
      result[failure] = 'failed';
      const queue: string[] = [failure];
      const visited = new Set<string>(queue);

      while (queue.length > 0) {
        const current = queue.shift()!;
        originalEdges.forEach((edge) => {
          if (edge.target === current && !visited.has(edge.source)) {
            visited.add(edge.source);
            queue.push(edge.source);
            result[edge.source] = 'affected';
          }
        });
      }

      // Simplified demo: the payment backup restores the payment path.
      if (failure === 'payment' && backup) {
        result.payment = 'healthy';
        result.api = 'healthy';
        result.web = 'healthy';
      }
    }
    return result;
  }, [failure, backup]);

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
              status === 'failed' ? '#451a1a' :
              status === 'affected' ? '#422006' : '#132a2a',
            color: '#f8fafc',
            border: `2px solid ${
              status === 'failed' ? '#ef4444' :
              status === 'affected' ? '#f59e0b' :
              isSelected ? '#2dd4bf' : '#315451'
            }`,
            borderRadius: 12,
            padding: 14,
            width: 190,
            fontWeight: 600,
            boxShadow: isSelected ? '0 0 18px #2dd4bf33' : 'none',
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
            statuses[edge.target] === 'failed' ? '#ef4444' :
            statuses[edge.source] === 'affected' ? '#f59e0b' : '#537c77',
          strokeWidth: 2,
        },
      })),
    [statuses]
  );

  const affectedCount = Object.values(statuses).filter(
    (status) => status !== 'healthy'
  ).length;

  const resilienceScore = Math.round(
    ((originalNodes.length - affectedCount) / originalNodes.length) * 100
  );

  const baselineScore = useMemo(() => {
    if (!failure) return 100;
    const visited = new Set<string>([failure]);
    const queue: string[] = [failure];

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
  const failedServiceName = String(
    originalNodes.find((node) => node.id === failure)?.data.label ?? 'Selected service'
  );

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <h1>Dependency Doomsday</h1>
            <p>BREAK IT BEFORE IT BREAKS YOU</p>
          </div>
        </div>
        <div className="live-badge"><span /> SIMULATION MODE</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">INFRASTRUCTURE LAB / 001</p>
          <h2>Every failure has a <span>ripple effect.</span></h2>
          <p className="description">
            Crash a service. Trace the damage. Find out if your system can survive.
          </p>
        </div>
        <div className="metric">
          <span>SERVICES AT RISK</span>
          <strong>{affectedCount}<small> / {originalNodes.length}</small></strong>
        </div>
      </section>

      <section className="score-grid">
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
        <div className="score-card recovery-card">
          <span className="eyebrow">RECOVERY IMPROVEMENT</span>
          <strong>+{recoveryGain}%</strong>
          <p>{recoveryGain > 0 ? 'Resilience restored by recovery' : 'Run an incident to compare recovery'}</p>
        </div>
      </section>

      <section className="workspace">
        <div className="map-heading">
          <div>
            <h3>System topology</h3>
            <p>Select a node, then simulate an outage.</p>
          </div>
          <span className={`status-pill ${failure ? 'warning' : ''}`}>
            {failure ? '● INCIDENT ACTIVE' : '● ALL SYSTEMS READY'}
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
            <Background color="#29413f" gap={22} />
            <Controls />
            <MiniMap
              nodeColor={(node) =>
                statuses[node.id] === 'failed' ? '#ef4444' :
                statuses[node.id] === 'affected' ? '#f59e0b' : '#2dd4bf'
              }
            />
          </ReactFlow>
        </div>

        <div className="control-panel">
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
            <button className="danger-button" onClick={() => {
              setFailure(selected);
              setBackup(false);
            }}>
              ⚡ Simulate failure
            </button>
            <button className="secondary-button" disabled={failure !== 'payment'} onClick={() => setBackup(true)}>
              ⛑ Enable payment backup
            </button>
            <button className="reset-button" onClick={() => {
              setFailure('');
              setBackup(false);
            }}>
              ↺ Reset
            </button>
          </div>
        </div>

        <div className="incident-report">
          <div className="report-icon">{failure ? '!' : '✓'}</div>
          <div>
            <h4>{failure ? 'Incident analysis' : 'System standing by'}</h4>
            <p>
              {!failure
                ? 'Your infrastructure is healthy. Select a service and trigger a failure to see the ripple effect.'
                : backup && failure === 'payment'
                  ? 'Payment backup enabled. The simulation marks the payment path as recovered. This is a simplified demonstration.'
                  : `${failedServiceName} failed. ${Math.max(0, affectedCount - 1)} other service${affectedCount - 1 === 1 ? '' : 's'} may be affected by dependency propagation.`}
            </p>
          </div>
        </div>
      </section>

      <footer>
        <span>DEPENDENCY DOOMSDAY <span className="footer-dot">●</span> BUILD 001</span>
        <span>VIRTUAL ENVIRONMENT · NO REAL SERVICES AFFECTED</span>
      </footer>
    </main>
  );
}
