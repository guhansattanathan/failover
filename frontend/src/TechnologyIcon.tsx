import { Monitor, Server } from 'lucide-react';
import { siPostgresql, siMysql, siMongodb, siRedis, siRabbitmq, siNginx, siCelery } from 'simple-icons';

const logos = { postgresql: siPostgresql, mysql: siMysql, mongodb: siMongodb, redis: siRedis, rabbitmq: siRabbitmq, nginx: siNginx, celery: siCelery };
export function TechnologyIcon({ technology }: { technology: string }) {
  if (technology === 'browser') return <Monitor size={18} aria-hidden="true" />;
  if (technology === 'service') return <Server size={18} aria-hidden="true" />;
  const logo = logos[technology as keyof typeof logos];
  return logo ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={logo.path} /></svg> : <Server size={18} aria-hidden="true" />;
}
