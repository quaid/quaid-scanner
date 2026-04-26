export const DOMAIN_TAXONOMY: Record<string, string[]> = {
  // DevOps & Infrastructure
  'ci-cd': ['continuous integration', 'continuous deployment', 'pipeline', 'workflow automation'],
  'container-orchestration': ['kubernetes', 'docker', 'container', 'pod', 'helm'],
  'infrastructure-as-code': ['terraform', 'pulumi', 'cloudformation', 'ansible', 'chef', 'puppet'],
  'observability': ['monitoring', 'metrics', 'tracing', 'logging', 'alerting', 'telemetry', 'opentelemetry'],
  'service-mesh': ['istio', 'linkerd', 'envoy', 'service mesh', 'sidecar'],
  // Security
  'supply-chain-security': ['sbom', 'sigstore', 'cosign', 'provenance', 'vulnerability scanning', 'cve'],
  'secrets-management': ['vault', 'secret', 'key management', 'rotation', 'hsm'],
  'identity-access': ['iam', 'oauth', 'oidc', 'saml', 'rbac', 'zero trust'],
  'devsecops': ['sast', 'dast', 'security scanning', 'compliance', 'policy as code'],
  // AI & ML
  'ai-ml-framework': ['machine learning', 'deep learning', 'neural network', 'model training', 'inference'],
  'llm-tooling': ['llm', 'large language model', 'prompt', 'rag', 'fine-tuning', 'embedding'],
  'mlops': ['mlops', 'model registry', 'feature store', 'model serving', 'experiment tracking'],
  'ai-agents': ['agent', 'agentic', 'autonomous', 'tool use', 'function calling', 'mcp'],
  'data-pipeline': ['etl', 'elt', 'data pipeline', 'data ingestion', 'stream processing'],
  // OSS Health & Governance
  'oss-health': ['open source health', 'repo scoring', 'repository quality', 'project health', 'ossf'],
  'developer-experience': ['dx', 'developer experience', 'developer tooling', 'productivity', 'dev tools'],
  'project-governance': ['governance', 'coc', 'code of conduct', 'contribution', 'maintainer'],
  // Data & Analytics
  'data-warehouse': ['data warehouse', 'dbt', 'snowflake', 'bigquery', 'redshift'],
  'streaming': ['kafka', 'pulsar', 'flink', 'spark streaming', 'event streaming'],
  'analytics': ['analytics', 'business intelligence', 'dashboard', 'reporting', 'visualization'],
  // Frontend & Mobile
  'frontend-framework': ['react', 'vue', 'angular', 'svelte', 'web framework', 'ui framework'],
  'mobile': ['ios', 'android', 'react native', 'flutter', 'mobile app'],
  // Backend
  'api-gateway': ['api gateway', 'reverse proxy', 'rate limiting', 'load balancing'],
  'database': ['database', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite'],
  'serverless': ['serverless', 'function as a service', 'faas', 'lambda', 'cloud functions'],
  // Testing
  'testing-framework': ['unit test', 'integration test', 'e2e test', 'test framework', 'mocking'],
  'performance-testing': ['load testing', 'performance testing', 'benchmark', 'chaos engineering'],
  // Documentation
  'documentation': ['docs', 'documentation site', 'api docs', 'developer docs'],
  // Generic fallback
  'general': [],
};

export const DOMAIN_TO_FOUNDATIONS: Record<string, string[]> = {
  'ci-cd': ['Linux Foundation', 'CD Foundation'],
  'container-orchestration': ['Cloud Native Computing Foundation (CNCF)', 'Linux Foundation'],
  'infrastructure-as-code': ['Linux Foundation', 'CNCF'],
  'observability': ['CNCF', 'OpenTelemetry Project'],
  'service-mesh': ['CNCF'],
  'supply-chain-security': ['Linux Foundation', 'OpenSSF', 'CNCF'],
  'secrets-management': ['Linux Foundation', 'OpenSSF'],
  'identity-access': ['OpenID Foundation', 'Linux Foundation'],
  'devsecops': ['OpenSSF', 'Linux Foundation'],
  'ai-ml-framework': ['Linux Foundation', 'LF AI & Data'],
  'llm-tooling': ['LF AI & Data', 'Linux Foundation'],
  'mlops': ['LF AI & Data', 'Linux Foundation'],
  'ai-agents': ['LF AI & Data', 'Linux Foundation'],
  'data-pipeline': ['LF AI & Data', 'Apache Software Foundation'],
  'oss-health': ['OpenSSF', 'TODO Group', 'Linux Foundation'],
  'developer-experience': ['TODO Group', 'Linux Foundation'],
  'project-governance': ['TODO Group', 'Apache Software Foundation', 'OpenSSF'],
  'data-warehouse': ['Apache Software Foundation', 'LF AI & Data'],
  'streaming': ['Apache Software Foundation', 'Linux Foundation'],
  'analytics': ['Apache Software Foundation', 'LF AI & Data'],
  'frontend-framework': ['OpenJS Foundation'],
  'mobile': ['Linux Foundation'],
  'api-gateway': ['CNCF', 'Linux Foundation'],
  'database': ['Linux Foundation'],
  'serverless': ['CNCF', 'Linux Foundation'],
  'testing-framework': ['OpenJS Foundation', 'Linux Foundation'],
  'performance-testing': ['Linux Foundation', 'CNCF'],
  'documentation': ['Linux Foundation'],
  'general': ['Linux Foundation', 'Apache Software Foundation'],
};

export const DOMAIN_TO_STANDARDS: Record<string, string[]> = {
  'ci-cd': ['OpenTelemetry', 'SLSA'],
  'container-orchestration': ['OCI Image Spec', 'OCI Distribution Spec', 'OCI Runtime Spec'],
  'infrastructure-as-code': ['OpenTofu', 'SLSA'],
  'observability': ['OpenTelemetry', 'Prometheus exposition format', 'OTLP'],
  'supply-chain-security': ['SLSA', 'SBOM (SPDX/CycloneDX)', 'Sigstore'],
  'devsecops': ['OpenSSF Scorecard', 'SLSA', 'NIST SSDF'],
  'ai-ml-framework': ['ONNX', 'MLflow model format'],
  'llm-tooling': ['OpenAI API spec', 'MCP (Model Context Protocol)'],
  'ai-agents': ['MCP (Model Context Protocol)', 'OpenAI API spec'],
  'data-pipeline': ['Apache Arrow', 'Delta Lake protocol'],
  'oss-health': ['OpenSSF Scorecard', 'CHAOSS metrics', 'CII Best Practices'],
  'developer-experience': ['OpenAPI / Swagger', 'AsyncAPI'],
  'project-governance': ['CHAOSS metrics', 'CII Best Practices', 'TODO Group OSPO guides'],
  'streaming': ['CloudEvents', 'Apache Kafka protocol'],
  'api-gateway': ['OpenAPI / Swagger', 'AsyncAPI', 'gRPC'],
  'identity-access': ['OAuth 2.0', 'OpenID Connect', 'SCIM 2.0'],
  'general': [],
};

export const DOMAIN_TO_RIVALS: Record<string, Array<{ name: string; repoUrl: string | null; rationale: string; tags: string[] }>> = {
  'oss-health': [
    { name: 'OpenSSF Scorecard', repoUrl: 'https://github.com/ossf/scorecard', rationale: 'Industry-standard automated OSS security scoring', tags: ['security', 'scoring', 'cncf'] },
    { name: 'CHAOSS GrimoireLab', repoUrl: 'https://github.com/chaoss/grimoirelab', rationale: 'Comprehensive OSS metrics and analytics platform', tags: ['metrics', 'community', 'analytics'] },
    { name: 'CLOMonitor', repoUrl: 'https://github.com/cncf/clomonitor', rationale: 'CNCF project health monitoring and best practices scoring', tags: ['cncf', 'health', 'scoring'] },
    { name: 'Repo Linter', repoUrl: 'https://github.com/todogroup/repolinter', rationale: 'TODO Group linter for OSS project compliance', tags: ['governance', 'compliance', 'lint'] },
    { name: 'CII Best Practices Badge', repoUrl: 'https://github.com/coreinfrastructure/best-practices-badge', rationale: 'CII/OpenSSF certification for open source best practices', tags: ['security', 'certification', 'openssf'] },
  ],
  'ci-cd': [
    { name: 'Tekton', repoUrl: 'https://github.com/tektoncd/pipeline', rationale: 'Cloud-native CI/CD pipeline framework', tags: ['cncf', 'pipeline'] },
    { name: 'Argo Workflows', repoUrl: 'https://github.com/argoproj/argo-workflows', rationale: 'Container-native workflow engine for Kubernetes', tags: ['cncf', 'kubernetes'] },
  ],
  'container-orchestration': [
    { name: 'Kubernetes', repoUrl: 'https://github.com/kubernetes/kubernetes', rationale: 'Dominant container orchestration platform', tags: ['cncf', 'containers'] },
    { name: 'Nomad', repoUrl: 'https://github.com/hashicorp/nomad', rationale: 'HashiCorp workload orchestrator', tags: ['hashicorp', 'orchestration'] },
  ],
  'observability': [
    { name: 'OpenTelemetry Collector', repoUrl: 'https://github.com/open-telemetry/opentelemetry-collector', rationale: 'Vendor-neutral telemetry data collection standard', tags: ['cncf', 'otel'] },
    { name: 'Prometheus', repoUrl: 'https://github.com/prometheus/prometheus', rationale: 'De facto metrics standard in cloud-native ecosystems', tags: ['cncf', 'metrics'] },
    { name: 'Grafana', repoUrl: 'https://github.com/grafana/grafana', rationale: 'Leading observability visualization platform', tags: ['visualization', 'dashboards'] },
  ],
  'supply-chain-security': [
    { name: 'Sigstore', repoUrl: 'https://github.com/sigstore/sigstore', rationale: 'OpenSSF standard for artifact signing and verification', tags: ['openssf', 'signing'] },
    { name: 'Syft', repoUrl: 'https://github.com/anchore/syft', rationale: 'Popular SBOM generation tool', tags: ['sbom', 'anchore'] },
    { name: 'Grype', repoUrl: 'https://github.com/anchore/grype', rationale: 'Vulnerability scanner for container images and filesystems', tags: ['vulnerability', 'anchore'] },
  ],
  'llm-tooling': [
    { name: 'LangChain', repoUrl: 'https://github.com/langchain-ai/langchain', rationale: 'Most widely adopted LLM application framework', tags: ['llm', 'framework', 'rag'] },
    { name: 'LlamaIndex', repoUrl: 'https://github.com/run-llama/llama_index', rationale: 'Leading RAG and data indexing framework for LLMs', tags: ['rag', 'indexing'] },
    { name: 'Semantic Kernel', repoUrl: 'https://github.com/microsoft/semantic-kernel', rationale: 'Microsoft SDK for LLM orchestration and agents', tags: ['microsoft', 'agents'] },
  ],
  'ai-agents': [
    { name: 'AutoGen', repoUrl: 'https://github.com/microsoft/autogen', rationale: 'Microsoft framework for multi-agent conversations', tags: ['microsoft', 'multi-agent'] },
    { name: 'CrewAI', repoUrl: 'https://github.com/crewAIInc/crewAI', rationale: 'Role-based AI agent orchestration framework', tags: ['agents', 'orchestration'] },
    { name: 'LangGraph', repoUrl: 'https://github.com/langchain-ai/langgraph', rationale: 'Graph-based agent workflow framework from LangChain', tags: ['langchain', 'graph', 'agents'] },
  ],
  'developer-experience': [
    { name: 'Backstage', repoUrl: 'https://github.com/backstage/backstage', rationale: 'CNCF developer portal platform by Spotify', tags: ['cncf', 'portal', 'spotify'] },
    { name: 'Gitpod', repoUrl: 'https://github.com/gitpod-io/gitpod', rationale: 'Cloud development environment platform', tags: ['cde', 'cloud-ide'] },
  ],
  'general': [],
};

export const DOMAIN_TO_COMMUNITIES: Record<string, Array<{ name: string; url: string; type: string; relevance: string }>> = {
  'oss-health': [
    { name: 'CHAOSS Community', url: 'https://chaoss.community', type: 'forum', relevance: 'high' },
    { name: 'OpenSSF Slack', url: 'https://openssf.slack.com', type: 'slack', relevance: 'high' },
    { name: 'TODO Group Community', url: 'https://todogroup.org/community', type: 'forum', relevance: 'high' },
    { name: 'r/opensource', url: 'https://reddit.com/r/opensource', type: 'subreddit', relevance: 'medium' },
    { name: 'OSS Stack Overflow', url: 'https://stackoverflow.com/questions/tagged/open-source', type: 'stack-overflow', relevance: 'medium' },
  ],
  'ci-cd': [
    { name: 'CD Foundation Slack', url: 'https://cd.foundation/community', type: 'slack', relevance: 'high' },
    { name: 'r/devops', url: 'https://reddit.com/r/devops', type: 'subreddit', relevance: 'medium' },
  ],
  'container-orchestration': [
    { name: 'CNCF Slack (#kubernetes)', url: 'https://slack.cncf.io', type: 'slack', relevance: 'high' },
    { name: 'KubeCon', url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/', type: 'conference', relevance: 'high' },
    { name: 'r/kubernetes', url: 'https://reddit.com/r/kubernetes', type: 'subreddit', relevance: 'high' },
  ],
  'observability': [
    { name: 'CNCF Slack (#opentelemetry)', url: 'https://slack.cncf.io', type: 'slack', relevance: 'high' },
    { name: 'OpenTelemetry Community', url: 'https://opentelemetry.io/community', type: 'forum', relevance: 'high' },
  ],
  'llm-tooling': [
    { name: 'Hugging Face Discord', url: 'https://discord.gg/hugging-face', type: 'discord', relevance: 'high' },
    { name: 'LF AI & Data Slack', url: 'https://lfaifoundation.slack.com', type: 'slack', relevance: 'medium' },
    { name: 'r/LocalLLaMA', url: 'https://reddit.com/r/LocalLLaMA', type: 'subreddit', relevance: 'high' },
  ],
  'ai-agents': [
    { name: 'Hugging Face Discord', url: 'https://discord.gg/hugging-face', type: 'discord', relevance: 'high' },
    { name: 'LF AI & Data Slack', url: 'https://lfaifoundation.slack.com', type: 'slack', relevance: 'medium' },
  ],
  'developer-experience': [
    { name: 'CNCF Slack (#backstage)', url: 'https://slack.cncf.io', type: 'slack', relevance: 'high' },
    { name: 'DevRel Collective', url: 'https://devrelcollective.fun', type: 'slack', relevance: 'medium' },
  ],
  'supply-chain-security': [
    { name: 'OpenSSF Slack', url: 'https://openssf.slack.com', type: 'slack', relevance: 'high' },
    { name: 'SLSA Community', url: 'https://slsa.dev/community', type: 'forum', relevance: 'high' },
  ],
  'general': [
    { name: 'r/opensource', url: 'https://reddit.com/r/opensource', type: 'subreddit', relevance: 'medium' },
    { name: 'Linux Foundation Events', url: 'https://events.linuxfoundation.org', type: 'conference', relevance: 'medium' },
  ],
};
