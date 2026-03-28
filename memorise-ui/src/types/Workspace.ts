import type { NerSpan } from "./NotationEditor";
import type { TagItem } from "./Tag";
import type { Segment } from "./Segment";

/**
 * Translation page within a workspace
 * Each translation represents the workspace text in a different language
 * Each translation has its own independent NER annotations
 */
export type Workspace = {
  id: string;
  name: string;
  isTemporary?: boolean;
  text?: string;               
  userSpans?: NerSpan[];       
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[]; 
  updatedAt?: number;
  owner?: string;
  
  tags?: TagItem[];            
  segments?: Segment[];        
  translations?: Translation[]; 
};

/**
 * Translation Page
 * Inherits structure from Workspace.segments. 
 * Only stores language-specific strings and language-specific NER spans.
 */
export type Translation = {
  language: string;        
  text: string;            
  sourceLang: string;      
  createdAt: number;       
  updatedAt: number;       
  
  userSpans?: NerSpan[];   
  apiSpans?: NerSpan[];    
  deletedApiKeys?: string[];
  
  segmentTranslations?: {
    [segmentId: string]: string;  
  };
  editedSegmentTranslations?: {
    [segmentId: string]: boolean;
  };
};