import type { Challenge, GraphNode } from './types';

export type Metric = { label: string; value: string };
export const technologyName = (tech: string) => ({ browser: 'Web / mobile client', service: 'Application service', nginx: 'NGINX', redis: 'Redis', postgresql: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', rabbitmq: 'RabbitMQ', celery: 'Celery worker' }[tech] || tech);

/** Values come from the frozen lesson parameters, never an invented benchmark. */
export function componentMetrics(node: GraphNode, lesson: Challenge | null): Metric[] {
  const config = node.configuration;
  const p = lesson?.parameters || {};
  const rows: Metric[] = [];
  const add = (label: string, value: string) => rows.push({ label, value });
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if ('instances' in config) add('Instances', String(config.instances));
  if (node.type === 'application') {
    if (typeof p.appCapacity === 'number') {
      add('Per instance', `${fmt(p.appCapacity)} requests/s`);
      add('Tier capacity', `${fmt(Number(config.instances) * p.appCapacity)} requests/s`);
      if (typeof p.failedInstances === 'number') add('After one failure', `${fmt(Math.max(0, Number(config.instances) - p.failedInstances) * p.appCapacity)} requests/s`);
    } else add('Throughput', 'Not modeled in this lesson');
  }
  if (node.type === 'cache') {
    add('Memory', `${config.memoryMB} MB`);
    const ratios = p.hitRatios as Record<string, number> | undefined;
    add('Assumed hit ratio', ratios ? `${Math.round(ratios[String(config.memoryMB)] * 100)}%` : 'Not modeled in this lesson');
  }
  if ('persistent' in config) {
    add('Persistent storage', config.persistent ? 'Enabled' : 'Disabled');
    add('Operation capacity', typeof p.dbCapacity === 'number' ? `${fmt(p.dbCapacity)} operations/s` : 'Not modeled in this lesson');
  }
  if (node.type === 'queue') {
    add('Durable queue', config.durable ? 'Enabled' : 'Disabled');
    if (typeof p.burstRate === 'number') add('Lesson burst', `${fmt(p.burstRate)} jobs/s for ${p.burstSeconds}s`);
    add('Queue storage', lesson?.slug === 'notification-service' ? 'Assumed sufficient' : 'Not modeled in this lesson');
  }
  if (node.type === 'worker') {
    add('Acknowledge after success', config.ackAfterProcessing ? 'Enabled' : 'Disabled');
    if (typeof p.workerCapacity === 'number') {
      const capacity = Number(config.instances) * p.workerCapacity;
      const backlog = Math.max(0, (Number(p.burstRate) - capacity) * Number(p.burstSeconds));
      add('Worker capacity', `${fmt(capacity)} jobs/s`);
      add('Modeled backlog', `${fmt(backlog)} jobs`);
      add('Modeled drain time', capacity > 0 ? `${fmt(backlog / capacity)} seconds` : 'Invalid instance count');
    } else add('Throughput', 'Not modeled in this lesson');
  }
  if (node.type === 'client') {
    add('Role', 'Starts application requests');
    if (typeof p.requiredRps === 'number') add('Lesson demand', `${fmt(p.requiredRps)} requests/s`);
    if (typeof p.reads === 'number') add('Lesson demand', `${fmt(p.reads)} reads/s + ${p.writes} writes/s`);
    if (typeof p.burstRate === 'number') add('Lesson demand', `${fmt(p.burstRate)} jobs/s`);
  }
  if (node.type === 'load_balancer') {
    add('Role', 'Distributes request traffic');
    add('Throughput / failure', 'Not modeled in this lesson');
  }
  return rows;
}
