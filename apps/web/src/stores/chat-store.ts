import { create } from "zustand";
import type {
  AiSection,
  ChatMessage,
  ChatArtifact,
  PlanName,
  PlanAutonomy,
  WorkflowArtifact,
} from "@nodelabz/shared-types";
import { PLAN_AUTONOMY } from "@nodelabz/shared-types";

interface WorkflowDraft {
  name: string;
  description?: string;
  nodes: WorkflowArtifact["payload"]["nodes"];
  edges: WorkflowArtifact["payload"]["edges"];
}

interface ChatState {
  // Messages
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingArtifacts: ChatArtifact[];
  streamingToolCalls: ChatMessage["toolCalls"];

  // Context
  activeSection: AiSection;
  conversationId: string | null;

  // Plan
  plan: PlanName;
  autonomy: PlanAutonomy;

  // Workflow
  workflowDraft: WorkflowDraft | null;

  // Actions
  setActiveSection: (section: AiSection) => void;
  setPlan: (plan: PlanName) => void;
  setConversationId: (id: string | null) => void;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendToken: (token: string) => void;
  addToolCall: (name: string, status: string, result?: string) => void;
  addArtifact: (artifact: ChatArtifact) => void;
  finishStreaming: (messageId: string, conversationId: string) => void;
  setStreamError: (error: string) => void;
  setWorkflowDraft: (draft: WorkflowDraft | null) => void;
  loadConversation: (messages: ChatMessage[], conversationId: string) => void;
  clearChat: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola! Soy tu asistente de datos con IA. Preguntame sobre tus metricas, campanas, leads, o cualquier dato de tu negocio.",
  timestamp: new Date(),
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  isStreaming: false,
  streamingContent: "",
  streamingArtifacts: [],
  streamingToolCalls: [],

  activeSection: "dashboard",
  conversationId: null,

  plan: "INICIO",
  autonomy: PLAN_AUTONOMY.INICIO,

  workflowDraft: null,

  setActiveSection: (section) => set({ activeSection: section }),

  setPlan: (plan) =>
    set({ plan, autonomy: PLAN_AUTONOMY[plan] }),

  setConversationId: (id) => set({ conversationId: id }),

  addUserMessage: (content) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  startStreaming: () =>
    set({
      isStreaming: true,
      streamingContent: "",
      streamingArtifacts: [],
      streamingToolCalls: [],
    }),

  appendToken: (token) =>
    set((state) => ({
      streamingContent: state.streamingContent + token,
    })),

  addToolCall: (name, status, result) =>
    set((state) => {
      const existing = state.streamingToolCalls?.find((tc) => tc.name === name);
      if (existing) {
        return {
          streamingToolCalls: state.streamingToolCalls?.map((tc) =>
            tc.name === name ? { ...tc, status, result } : tc
          ),
        };
      }
      return {
        streamingToolCalls: [
          ...(state.streamingToolCalls || []),
          { name, status, result },
        ],
      };
    }),

  addArtifact: (artifact) =>
    set((state) => ({
      streamingArtifacts: [...state.streamingArtifacts, artifact],
    })),

  finishStreaming: (messageId, conversationId) =>
    set((state) => {
      const assistantMsg: ChatMessage = {
        id: messageId,
        role: "assistant",
        content: state.streamingContent,
        timestamp: new Date(),
        artifacts:
          state.streamingArtifacts.length > 0
            ? state.streamingArtifacts
            : undefined,
        toolCalls:
          state.streamingToolCalls && state.streamingToolCalls.length > 0
            ? state.streamingToolCalls
            : undefined,
      };
      return {
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingContent: "",
        streamingArtifacts: [],
        streamingToolCalls: [],
        conversationId,
      };
    }),

  setStreamError: (error) =>
    set((state) => {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error,
        timestamp: new Date(),
      };
      return {
        messages: [...state.messages, errorMsg],
        isStreaming: false,
        streamingContent: "",
        streamingArtifacts: [],
        streamingToolCalls: [],
      };
    }),

  setWorkflowDraft: (draft) => set({ workflowDraft: draft }),

  loadConversation: (messages, conversationId) =>
    set({ messages: [WELCOME_MESSAGE, ...messages], conversationId }),

  clearChat: () =>
    set({
      messages: [WELCOME_MESSAGE],
      conversationId: null,
      streamingContent: "",
      streamingArtifacts: [],
      streamingToolCalls: [],
      isStreaming: false,
      workflowDraft: null,
    }),
}));
