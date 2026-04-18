export type RoundStatus = 'draft' | 'active' | 'archived';
export type VoteValue = 'cash' | 'trash';

export interface Round {
  id: number;
  name: string;
  brief: string | null;
  status: RoundStatus;
  created_at: string;
}

export interface Pin {
  id: number;
  round_id: number;
  concept_text: string;
  prompt_used: string;
  image_url: string;
  blob_key: string;
  is_winner: boolean;
  tags: string[];
  created_at: string;
}

export interface Player {
  id: number;
  name: string;
  session_token: string;
  created_at: string;
}

export interface Vote {
  id: number;
  player_id: number;
  pin_id: number;
  value: VoteValue;
  voted_at: string;
}

export interface PinResult extends Pin {
  cash_count: number;
  trash_count: number;
  total_votes: number;
  score: number;
}

export interface ElementScore {
  tag: string;
  cash_count: number;
  trash_count: number;
  score: number;
  confidence: number;
}

export interface ConceptDraft {
  concept: string;
  dalle_prompt: string;
  tags: {
    color_palette: string[];
    mascot: string[];
    style: string[];
    theme: string[];
    composition: string[];
  };
}

export interface SuggestedPrompt {
  theme: string;
  prompt_fragment: string;
  rationale: string;
}

export interface PreferenceSnapshot {
  id: number;
  round_id: number;
  element_scores: Record<string, { cash: number; trash: number; score: number }>;
  claude_analysis: string;
  suggested_prompts: SuggestedPrompt[];
  created_at: string;
}
