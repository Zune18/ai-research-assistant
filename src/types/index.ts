/**
 * Unique identifier for a single research run.
 * map directly to LangGraph's `thread_id`
 */
export type RunId = string;

// Agent names in the system
export type AgentName =
  | "PlannerAgent"
  | "SearchAgent"
  | "BrowserAgent"
  | "ScraperAgent"
  | "ExtractionAgent"
  | "EmbeddingAgent"
  | "RetrievalAgent"
  | "RerankerAgent"
  | "VerificationAgent"
  | "ReflectionAgent"
  | "ReportAgent";

// Shape expected by createLogger() context
export interface LogContext {
  agent?: AgentName;
  runId?: RunId;
  [key: string]: unknown; // allows extra fields without breaking callers
}