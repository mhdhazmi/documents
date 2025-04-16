/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as config from "../config.js";
import type * as files_mutations from "../files/mutations.js";
import type * as files_queries from "../files/queries.js";
import type * as ocr_actions from "../ocr/actions.js";
import type * as ocr_gemini_actions from "../ocr/gemini/actions.js";
import type * as ocr_gemini_mutations from "../ocr/gemini/mutations.js";
import type * as ocr_gemini_queries from "../ocr/gemini/queries.js";
import type * as ocr_openai_actions from "../ocr/openai/actions.js";
import type * as ocr_openai_mutations from "../ocr/openai/mutations.js";
import type * as ocr_openai_queries from "../ocr/openai/queries.js";
import type * as ocr_replicate_actions from "../ocr/replicate/actions.js";
import type * as ocr_replicate_mutations from "../ocr/replicate/mutations.js";
import type * as ocr_replicate_queries from "../ocr/replicate/queries.js";
import type * as pdf_mutations from "../pdf/mutations.js";
import type * as pdf_queries from "../pdf/queries.js";
import type * as performOCR from "../performOCR.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  config: typeof config;
  "files/mutations": typeof files_mutations;
  "files/queries": typeof files_queries;
  "ocr/actions": typeof ocr_actions;
  "ocr/gemini/actions": typeof ocr_gemini_actions;
  "ocr/gemini/mutations": typeof ocr_gemini_mutations;
  "ocr/gemini/queries": typeof ocr_gemini_queries;
  "ocr/openai/actions": typeof ocr_openai_actions;
  "ocr/openai/mutations": typeof ocr_openai_mutations;
  "ocr/openai/queries": typeof ocr_openai_queries;
  "ocr/replicate/actions": typeof ocr_replicate_actions;
  "ocr/replicate/mutations": typeof ocr_replicate_mutations;
  "ocr/replicate/queries": typeof ocr_replicate_queries;
  "pdf/mutations": typeof pdf_mutations;
  "pdf/queries": typeof pdf_queries;
  performOCR: typeof performOCR;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
