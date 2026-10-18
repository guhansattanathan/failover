import { siPostgresql, siMysql, siMongodb, siRedis, siRabbitmq, siNginx, siCelery, siAndroid, siApple, siGooglechrome, siNodedotjs, siDjango, siSpringboot, siApachecassandra, siApachekafka, siSidekiq } from 'simple-icons';
import { brandPaths } from './brandPaths';
import memcached from './assets/memcached.svg';
import { technologies } from './technologies';

const logos: Record<string, { path: string }> = { postgresql: siPostgresql, mysql: siMysql, mongodb: siMongodb, redis: siRedis, rabbitmq: siRabbitmq, nginx: siNginx, celery: siCelery, android: siAndroid, ios: siApple, browser: siGooglechrome, nodejs: siNodedotjs, django: siDjango, spring: siSpringboot, cassandra: siApachecassandra, kafka: siApachekafka, sidekiq: siSidekiq };
export function BrandGlyph({ technology }: { technology: string }) {
  if (technology === 'memcached') return <image href={memcached} width="24" height="24"/>;
  const path = logos[technology]?.path || brandPaths[technology];
  if (path) return <path d={path}/>;
  const kind = technologies[technology]?.type;
  return <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'client' ? <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/></> : kind === 'load_balancer' ? <><rect x="8" y="2" width="8" height="6" rx="1"/><path d="M12 8v5H4v5m8-5v5m0-5h8v5M2 21h4m4 0h4m4 0h4"/></> : kind?.includes('database') ? <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>{kind === 'nonrelational_database' && <path d="m10 8-2 2 2 2m4-4 2 2-2 2"/>}</> : kind === 'queue' ? <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 6 10 7L22 6"/></> : kind === 'cache' ? <><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m14 0h4M1 15h4m14 0h4"/></> : <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></>}
  </g>;
}
export function TechnologyIcon({ technology }: { technology: string }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><BrandGlyph technology={technology}/></svg>;
}
