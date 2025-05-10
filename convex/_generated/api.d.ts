/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as api_ from "../api.js";
import type * as concatenate_actions from "../concatenate/actions.js";
import type * as concatenate_mutations from "../concatenate/mutations.js";
import type * as concatenate_queries from "../concatenate/queries.js";
import type * as config from "../config.js";
import type * as files_mutations from "../files/mutations.js";
import type * as files_queries from "../files/queries.js";
import type * as http from "../http.js";
import type * as ingest_ingest from "../ingest/ingest.js";
import type * as ocr_gemini_actions from "../ocr/gemini/actions.js";
import type * as ocr_gemini_mutations from "../ocr/gemini/mutations.js";
import type * as ocr_gemini_queries from "../ocr/gemini/queries.js";
import type * as ocr_openai_actions from "../ocr/openai/actions.js";
import type * as ocr_openai_mutations from "../ocr/openai/mutations.js";
import type * as ocr_openai_queries from "../ocr/openai/queries.js";
import type * as ocr_replicate_actions from "../ocr/replicate/actions.js";
import type * as ocr_replicate_mutations from "../ocr/replicate/mutations.js";
import type * as ocr_replicate_queries from "../ocr/replicate/queries.js";
import type * as pdf_actions from "../pdf/actions.js";
import type * as pdf_mutations from "../pdf/mutations.js";
import type * as pdf_queries from "../pdf/queries.js";
import type * as performOCR from "../performOCR.js";
import type * as serve_serve from "../serve/serve.js";
import type * as utils_cleaner from "../utils/cleaner.js";
import type * as utils_geminiOcr from "../utils/geminiOcr.js";
import type * as utils_pdfSplitter from "../utils/pdfSplitter.js";
import type * as utils_retry from "../utils/retry.js";
import type * as utils_stream from "../utils/stream.js";
import type * as workflow_concatenateWorkflow from "../workflow/concatenateWorkflow.js";
import type * as workflow_index from "../workflow/index.js";
import type * as workflow_ocrWorkflow from "../workflow/ocrWorkflow.js";
import type * as workflow_providerWorkflow from "../workflow/providerWorkflow.js";
import type * as workflow_startWorkflow from "../workflow/startWorkflow.js";
import type * as workflowOrch from "../workflowOrch.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  api: typeof api_;
  "concatenate/actions": typeof concatenate_actions;
  "concatenate/mutations": typeof concatenate_mutations;
  "concatenate/queries": typeof concatenate_queries;
  config: typeof config;
  "files/mutations": typeof files_mutations;
  "files/queries": typeof files_queries;
  http: typeof http;
  "ingest/ingest": typeof ingest_ingest;
  "ocr/gemini/actions": typeof ocr_gemini_actions;
  "ocr/gemini/mutations": typeof ocr_gemini_mutations;
  "ocr/gemini/queries": typeof ocr_gemini_queries;
  "ocr/openai/actions": typeof ocr_openai_actions;
  "ocr/openai/mutations": typeof ocr_openai_mutations;
  "ocr/openai/queries": typeof ocr_openai_queries;
  "ocr/replicate/actions": typeof ocr_replicate_actions;
  "ocr/replicate/mutations": typeof ocr_replicate_mutations;
  "ocr/replicate/queries": typeof ocr_replicate_queries;
  "pdf/actions": typeof pdf_actions;
  "pdf/mutations": typeof pdf_mutations;
  "pdf/queries": typeof pdf_queries;
  performOCR: typeof performOCR;
  "serve/serve": typeof serve_serve;
  "utils/cleaner": typeof utils_cleaner;
  "utils/geminiOcr": typeof utils_geminiOcr;
  "utils/pdfSplitter": typeof utils_pdfSplitter;
  "utils/retry": typeof utils_retry;
  "utils/stream": typeof utils_stream;
  "workflow/concatenateWorkflow": typeof workflow_concatenateWorkflow;
  "workflow/index": typeof workflow_index;
  "workflow/ocrWorkflow": typeof workflow_ocrWorkflow;
  "workflow/providerWorkflow": typeof workflow_providerWorkflow;
  "workflow/startWorkflow": typeof workflow_startWorkflow;
  workflowOrch: typeof workflowOrch;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: {
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startStep: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          name: string;
          retry?:
            | boolean
            | { base: number; initialBackoffMs: number; maxAttempts: number };
          schedulerOptions?: { runAt?: number } | { runAfter?: number };
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        {
          _creationTime: number;
          _id: string;
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          stepNumber: number;
          workflowId: string;
        }
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          now: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          validateAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
    };
  };
};
