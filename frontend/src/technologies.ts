export const technologies: Record<string, { type: string; name: string }> = {
  "generic-client": {
    "type": "client",
    "name": "Generic client"
  },
  "browser": {
    "type": "client",
    "name": "Web browser"
  },
  "android": {
    "type": "client",
    "name": "Android"
  },
  "ios": {
    "type": "client",
    "name": "iOS"
  },
  "generic-balancer": {
    "type": "load_balancer",
    "name": "Generic load balancer"
  },
  "nginx": {
    "type": "load_balancer",
    "name": "NGINX"
  },
  "service": {
    "type": "application",
    "name": "Generic application"
  },
  "nodejs": {
    "type": "application",
    "name": "Node.js"
  },
  "django": {
    "type": "application",
    "name": "Django"
  },
  "spring": {
    "type": "application",
    "name": "Spring Boot"
  },
  "generic-cache": {
    "type": "cache",
    "name": "Generic cache"
  },
  "redis": {
    "type": "cache",
    "name": "Redis"
  },
  "memcached": {
    "type": "cache",
    "name": "Memcached"
  },
  "elasticache": {
    "type": "cache",
    "name": "Amazon ElastiCache"
  },
  "generic-sql": {
    "type": "relational_database",
    "name": "Generic relational database"
  },
  "postgresql": {
    "type": "relational_database",
    "name": "PostgreSQL"
  },
  "mysql": {
    "type": "relational_database",
    "name": "MySQL"
  },
  "oracle": {
    "type": "relational_database",
    "name": "Oracle Database"
  },
  "rds": {
    "type": "relational_database",
    "name": "Amazon RDS"
  },
  "generic-nosql": {
    "type": "nonrelational_database",
    "name": "Generic NoSQL database"
  },
  "mongodb": {
    "type": "nonrelational_database",
    "name": "MongoDB"
  },
  "dynamodb": {
    "type": "nonrelational_database",
    "name": "Amazon DynamoDB"
  },
  "cassandra": {
    "type": "nonrelational_database",
    "name": "Apache Cassandra"
  },
  "generic-queue": {
    "type": "queue",
    "name": "Generic message queue"
  },
  "rabbitmq": {
    "type": "queue",
    "name": "RabbitMQ"
  },
  "kafka": {
    "type": "queue",
    "name": "Apache Kafka"
  },
  "sqs": {
    "type": "queue",
    "name": "Amazon SQS"
  },
  "generic-worker": {
    "type": "worker",
    "name": "Generic background worker"
  },
  "celery": {
    "type": "worker",
    "name": "Celery"
  },
  "sidekiq": {
    "type": "worker",
    "name": "Sidekiq"
  },
  "lambda": {
    "type": "worker",
    "name": "AWS Lambda"
  }
};
export const technologyName = (tech: string) => technologies[tech]?.name || tech;
