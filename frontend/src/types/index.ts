export interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
  block_index: number;
}

export interface Page {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  blocks: Block[];
}

export interface PageSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface BacklinkPage {
  id: string;
  title: string;
}
