export { getDb } from "./db/connection";
export type { EngineConfig } from "./db/engines";
export {
  deleteEngineConfig,
  getAllEngineConfigs,
  getEngineConfig,
  upsertEngineConfig,
} from "./db/engines";
export type { CacheEntry } from "./db/cache";
export {
  clearCache,
  getCachedTranslation,
  getCacheStats,
  setCachedTranslation,
} from "./db/cache";
export type {
  Task,
  TaskListItem,
  TaskParagraph,
  TaskWithParagraphs,
} from "./db/tasks";
export {
  createTask,
  createTaskParagraph,
  deleteTask,
  deleteTasks,
  getTask,
  getTaskWithParagraphs,
  listTaskParagraphs,
  listTasks,
  syncTaskParagraphResult,
  updateTaskProgress,
} from "./db/tasks";
export type {
  BulkCreateGlossaryTermsResult,
  GlossaryListFilters,
  GlossaryTerm,
  GlossaryTermInput,
} from "./db/glossary";
export {
  bulkCreateGlossaryTerms,
  createGlossaryTerm,
  deleteGlossaryTerm,
  getGlossaryTerm,
  listGlossaryLanguages,
  listGlossaryTerms,
  updateGlossaryTerm,
} from "./db/glossary";
export { getAppSettings, upsertAppSettings } from "./db/settings";