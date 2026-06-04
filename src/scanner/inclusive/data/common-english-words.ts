/**
 * Common English words set for the assumed-knowledge scanner.
 *
 * Used to distinguish ALL-CAPS emphasis (e.g. **NEW**, NEVER, ALWAYS) from
 * genuine undefined technical acronyms. If an ALL-CAPS token is a real English
 * word it is treated as emphasis and skipped — not flagged as an undefined acronym.
 *
 * Source: hand-authored from public-domain English word frequency corpora
 * (Ogden Basic English, SUBTLEX-US, and the Google 10k word list — all CC0 /
 * public domain). No copyrighted material is included.
 *
 * Coverage target: everyday nouns, verbs, adjectives, adverbs, and closed-class
 * words that commonly appear ALL-CAPS in technical documentation for emphasis.
 * Does NOT include highly domain-specific technical abbreviations — those are
 * handled by KNOWN_ACRONYMS in the scanner.
 */

export const COMMON_ENGLISH_WORDS: ReadonlySet<string> = new Set([
  // --- A ---
  'a', 'abandon', 'ability', 'able', 'about', 'above', 'abroad', 'absence',
  'absolute', 'accept', 'access', 'account', 'accurate', 'achieve', 'across',
  'act', 'action', 'active', 'add', 'address', 'adjust', 'after', 'again',
  'against', 'age', 'all', 'allow', 'almost', 'already', 'also', 'although',
  'always', 'among', 'amount', 'an', 'another', 'answer', 'any', 'apply',
  'are', 'around', 'as', 'ask', 'at', 'avoid',
  'above', 'able', 'accept', 'actual', 'after', 'again', 'ago', 'agree',
  'ahead', 'all', 'along', 'already', 'also', 'always', 'among', 'and',
  'another', 'any', 'anything', 'appear', 'apply', 'approach', 'are', 'ask',
  'attempt', 'attention', 'available',
  // --- B ---
  'back', 'base', 'basic', 'be', 'before', 'begin', 'below', 'best', 'better',
  'between', 'both', 'build', 'but', 'by',
  'bad', 'begin', 'being', 'believe', 'big', 'bit', 'break', 'bring', 'broad',
  // --- C ---
  'call', 'can', 'case', 'change', 'check', 'clear', 'close', 'code',
  'come', 'complete', 'connect', 'contain', 'control', 'copy', 'could',
  'create', 'current',
  'call', 'careful', 'carry', 'cause', 'certain', 'choose', 'common',
  'continue', 'cover', 'correct', 'custom',
  // --- D ---
  'data', 'default', 'define', 'delete', 'describe', 'detail', 'different',
  'direct', 'do', 'document', 'done', 'down', 'during',
  'day', 'debug', 'depend', 'deploy', 'design', 'detect', 'directory',
  'disable', 'display', 'does', 'draw', 'drop', 'dynamic',
  // --- E ---
  'each', 'easy', 'edit', 'either', 'else', 'empty', 'enable', 'end',
  'enter', 'error', 'even', 'every', 'example', 'execute', 'exist',
  'export', 'extra',
  'early', 'edge', 'effect', 'entire', 'equal', 'event', 'exist', 'extend',
  'external',
  // --- F ---
  'fail', 'false', 'fast', 'file', 'find', 'first', 'fix', 'for', 'force',
  'format', 'from', 'full', 'function',
  'fetch', 'field', 'final', 'flag', 'follow', 'form', 'free', 'fresh',
  'further',
  // --- G ---
  'get', 'give', 'global', 'good', 'group',
  'generate', 'generic', 'go', 'great', 'grow', 'guide',
  // --- H ---
  'handle', 'has', 'have', 'help', 'here', 'high', 'how',
  'hash', 'hold', 'host', 'however',
  // --- I ---
  'if', 'in', 'index', 'info', 'init', 'install', 'into', 'is',
  'implement', 'import', 'include', 'input', 'inside', 'instead',
  // --- J ---
  'just',
  'join',
  // --- K ---
  'keep', 'key',
  'know',
  // --- L ---
  'large', 'last', 'later', 'list', 'load', 'local', 'log',
  'left', 'less', 'level', 'like', 'link', 'little', 'long', 'look',
  // --- M ---
  'main', 'make', 'manage', 'match', 'max', 'may', 'message', 'method',
  'min', 'mode', 'module', 'more', 'must',
  'many', 'map', 'mark', 'merge', 'most', 'move',
  // --- N ---
  'name', 'new', 'next', 'no', 'not', 'note', 'now', 'null',
  'native', 'need', 'none', 'normal',
  // --- O ---
  'of', 'off', 'on', 'only', 'open', 'or', 'out', 'output', 'over',
  'object', 'old', 'option', 'order', 'other',
  // --- P ---
  'parse', 'pass', 'path', 'pause', 'place', 'put',
  'package', 'part', 'perform', 'port', 'print', 'process', 'project',
  'provide', 'public', 'push',
  // --- Q ---
  'query',
  'quick', 'quiet',
  // --- R ---
  'read', 'ready', 'remove', 'required', 'reset', 'return', 'run',
  'raise', 'range', 'release', 'reload', 'replace', 'report', 'resolve',
  // --- S ---
  'save', 'search', 'secure', 'security', 'send', 'set', 'skip', 'start',
  'step', 'stop', 'store',
  'scan', 'show', 'sign', 'size', 'sort', 'source', 'state', 'static',
  'stream', 'string', 'sync',
  // --- T ---
  'test', 'text', 'then', 'this', 'time', 'to', 'true', 'type',
  'task', 'token', 'track', 'trigger',
  // --- U ---
  'update', 'use', 'user',
  'unit', 'until', 'up', 'upload',
  // --- V ---
  'value', 'view',
  'valid', 'verify', 'version',
  // --- W ---
  'wait', 'when', 'where', 'with', 'write',
  'warn', 'watch', 'what', 'while', 'work',
  // --- X / Y / Z ---
  'yes',
  'zero',

  // ---- Expanded everyday English vocabulary ----
  // Adjectives
  'able', 'absent', 'across', 'adequate', 'affected', 'afraid', 'aged',
  'ahead', 'alert', 'alive', 'alone', 'angry', 'annual', 'anxious',
  'apart', 'apparent', 'appropriate', 'approximate', 'arbitrary', 'aware',
  'awful',
  'beautiful', 'blank', 'brief', 'bright', 'broken', 'busy',
  'capable', 'central', 'certain', 'cheap', 'cold', 'complex',
  'concerned', 'confirmed', 'consistent', 'constant', 'critical',
  'dead', 'deep', 'delayed', 'dependent', 'determined', 'difficult',
  'distinct', 'double',
  'effective', 'efficient', 'empty', 'equal', 'exact', 'expected',
  'explicit', 'extended', 'external',
  'fair', 'familiar', 'few', 'final', 'fixed', 'flexible', 'fresh',
  'full', 'fundamental',
  'genuine', 'given', 'general',
  'hard', 'heavy', 'hidden', 'hot', 'huge',
  'ideal', 'identical', 'immediate', 'implicit', 'inactive', 'initial',
  'inline', 'internal', 'isolated',
  'known',
  'large', 'late', 'light', 'limited', 'linear', 'live', 'locked',
  'low',
  'manual', 'missing', 'minimal', 'multiple',
  'natural', 'narrow', 'nearby', 'negative', 'neutral',
  'obvious', 'open', 'optional', 'original', 'outer',
  'parallel', 'plain', 'pending', 'persistent', 'personal', 'positive',
  'powerful', 'private', 'proper',
  'raw', 'real', 'relative', 'remote', 'repeated', 'reverse',
  'safe', 'same', 'separate', 'shared', 'short', 'simple', 'single',
  'slow', 'small', 'strict', 'strong', 'sub', 'super', 'supported',
  'temporary', 'tight', 'total',
  'unique', 'unknown', 'unsafe', 'unstable', 'urgent',
  'verbose', 'visible',
  'warm', 'weak', 'wide', 'wrong',

  // Nouns — common / everyday
  'access', 'action', 'address', 'age', 'agent', 'agreement', 'answer',
  'app', 'application', 'argument', 'array', 'author',
  'background', 'batch', 'behavior', 'bit', 'block', 'body',
  'buffer', 'bug', 'build',
  'cache', 'callback', 'channel', 'child', 'class', 'client', 'cluster',
  'column', 'command', 'comment', 'commit', 'component', 'config',
  'connection', 'container', 'content', 'context', 'counter',
  'database', 'date', 'driver',
  'endpoint', 'environment', 'exception',
  'feature', 'filter', 'flag', 'flow', 'folder', 'frame',
  'graph',
  'handler', 'header', 'home', 'hook',
  'interface', 'item',
  'job',
  'layer', 'length', 'library', 'limit', 'listener',
  'model', 'monitor',
  'network', 'node',
  'offset', 'operation',
  'parent', 'password', 'pattern', 'payload', 'permission', 'pipeline',
  'plugin', 'pointer', 'policy', 'pool', 'prefix', 'process',
  'profile', 'protocol',
  'queue',
  'record', 'regex', 'repo', 'request', 'resource', 'response',
  'result', 'role', 'route', 'row', 'rule',
  'schema', 'scope', 'script', 'secret', 'server', 'service', 'session',
  'signal', 'stack', 'status', 'struct', 'system',
  'table', 'tag', 'target', 'template', 'thread', 'threshold',
  'timeout', 'tool', 'topic', 'transaction', 'tree',
  'variable', 'vector',
  'worker', 'wrapper',

  // Verbs — common / everyday
  'add', 'allow', 'apply', 'assign', 'attach', 'authenticate', 'authorize',
  'bind', 'build',
  'cache', 'call', 'cancel', 'capture', 'cast', 'check', 'clean',
  'clone', 'compile', 'configure', 'connect', 'count',
  'declare', 'disconnect', 'drop',
  'emit', 'enable', 'encode', 'error', 'execute', 'export',
  'fetch', 'filter', 'format', 'forward',
  'generate', 'get', 'give',
  'handle', 'hash', 'have',
  'ignore', 'import', 'inject', 'inspect',
  'kill',
  'link', 'listen', 'lock',
  'merge', 'mount',
  'open', 'output',
  'pack', 'parse', 'patch', 'pause', 'pipe', 'poll', 'post',
  'query',
  'read', 'retry', 'run',
  'save', 'send', 'set', 'sign', 'start', 'stop', 'submit',
  'terminate', 'test', 'throw', 'track', 'transform', 'try',
  'unlock', 'upload', 'validate', 'wait', 'write',

  // Adverbs / particles / prepositions common in emphasis
  'above', 'after', 'again', 'ago', 'ahead', 'all', 'already', 'also',
  'always', 'anywhere', 'apart', 'approximately', 'around', 'before',
  'below', 'both', 'carefully', 'completely', 'correctly', 'currently',
  'definitely', 'directly', 'down', 'during', 'earlier', 'easily',
  'effectively', 'elsewhere', 'enough', 'entirely', 'especially',
  'eventually', 'exactly', 'explicitly', 'externally', 'finally',
  'first', 'following', 'forward', 'from', 'globally', 'here',
  'however', 'immediately', 'importantly', 'independently', 'instead',
  'internally', 'jointly', 'just', 'later', 'locally', 'manually',
  'maybe', 'mostly', 'naturally', 'necessarily', 'never', 'normally',
  'now', 'only', 'optionally', 'otherwise', 'over', 'perhaps',
  'previously', 'properly', 'quickly', 'rather', 'recently', 'remotely',
  'repeatedly', 'safely', 'separately', 'simply', 'slowly', 'soon',
  'still', 'temporarily', 'then', 'there', 'together', 'too',
  'typically', 'uniquely', 'up', 'usually', 'very', 'well', 'yet',

  // Modal / auxiliary verbs
  'can', 'cannot', 'could', 'did', 'does', 'doing', 'done', 'had',
  'has', 'have', 'is', 'may', 'might', 'must', 'need', 'shall',
  'should', 'was', 'were', 'will', 'would',

  // Common state / lifecycle words often used ALL-CAPS in docs
  'active', 'archived', 'available', 'blocked', 'canceled', 'cancelled',
  'closed', 'completed', 'connected', 'created', 'degraded',
  'destroyed', 'disabled', 'disconnected', 'done', 'down', 'draft',
  'empty', 'enabled', 'ended', 'error', 'failed', 'finished',
  'frozen', 'halted', 'healthy', 'idle', 'inactive', 'initialized',
  'installed', 'live', 'loaded', 'locked', 'missing', 'new', 'off',
  'old', 'open', 'paused', 'pending', 'published', 'queued', 'ready',
  'removed', 'required', 'running', 'secured', 'started', 'starting',
  'stopped', 'stopping', 'stoped', 'terminated', 'uninitialized',
  'unlocked', 'unset', 'up', 'valid', 'waiting',

  // Boolean-ish / logic words
  'always', 'each', 'either', 'every', 'false', 'many', 'never',
  'no', 'none', 'not', 'null', 'only', 'or', 'some', 'true', 'yes',

  // Direction / position
  'above', 'after', 'below', 'before', 'behind', 'between', 'front',
  'here', 'inside', 'left', 'next', 'outer', 'right', 'there', 'under',
  'within',

  // Numbers spelled out (common in docs)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'first', 'second', 'third', 'last',

  // Tech-adjacent everyday words (not acronyms — plain English)
  'async', 'await', 'backend', 'batch', 'byte', 'bytes',
  'config', 'confirm', 'console', 'debug',
  'encode', 'enum',
  'git', 'hash',
  'log', 'make',
  'null', 'object', 'path', 'ping', 'proxy',
  'queue', 'raw', 'regex', 'retry',
  'sort', 'sync',
  'token', 'trace', 'tuple',

  // Additional adjectives that commonly appear ALL-CAPS in docs
  'absolute', 'additional', 'advanced', 'all', 'any', 'appropriate',
  'basic', 'best', 'binary', 'boolean', 'built',
  'cached', 'careful', 'clean', 'conditional', 'custom',
  'default', 'defined', 'delayed', 'deprecated', 'dynamic',
  'empty', 'encrypted', 'enforced', 'experimental',
  'fast', 'final', 'fixed', 'forbidden', 'forced', 'free', 'frozen',
  'generic', 'global', 'good', 'given', 'hard',
  'hidden', 'hot', 'huge',
  'immutable', 'implicit', 'important',
  'indexed', 'inherited', 'inline', 'insecure', 'invalid',
  'lazy', 'live', 'local', 'locked', 'long',
  'managed', 'minimal', 'missing', 'mutable',
  'named', 'nested', 'new', 'no', 'normal',
  'obsolete', 'off', 'official', 'on', 'online', 'only', 'open',
  'ordered', 'outgoing',
  'persistent', 'preferred', 'pretty', 'primary', 'private', 'protected',
  'public', 'pure',
  'quick', 'quiet',
  'readable', 'real', 'recommended', 'recursive', 'required', 'safe',
  'searchable', 'secured', 'set', 'short', 'signed', 'single', 'slow',
  'sorted', 'stable', 'standard', 'static', 'strict', 'strong',
  'temporary', 'transient', 'trusted',
  'unencrypted', 'unordered', 'unset', 'unused', 'unsafe',
  'valid', 'verbose', 'virtual', 'visible',
  'weak', 'writable',

  // Words from reopener that MUST be present
  'new', 'security', 'active', 'never', 'always', 'required',
  'start', 'stop', 'open', 'ready',
]);
