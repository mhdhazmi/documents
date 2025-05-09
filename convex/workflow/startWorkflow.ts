import { v } from "convex/values";
import { workflow } from "./index";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";


const s = internal.pdf.actions;


// This is a workflow definition, not a mutation
export const ocrWorkflow = workflow.define({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (step, { pdfId }): Promise<{ success: boolean; pageIds: Id<"pages">[] }> => {
    try {
      // 1. Split the PDF into pages
      const pageIds: Id<"pages">[] = await step.runAction(
        s.splitPdfIntoPages,
        { pdfId }
      );
      
      // Rest of workflow implementation...
      
      return { success: true, pageIds };
    } catch (error) {
      console.error(`Error in OCRWorkflow for PDF ${pdfId}:`, error);
      throw error;
    }
  },
});