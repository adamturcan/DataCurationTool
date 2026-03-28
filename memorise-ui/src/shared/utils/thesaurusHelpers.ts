/**
 * Helper functions for working with the thesaurus
 * 
 * These utilities help map tags to their thesaurus entries and
 * build hierarchical data structures for display.
 */

import type { ThesaurusIndexItem } from '../../types';
import type { TagRow } from '../../presentation/components/rightPanel/RightPanel';

/**
 * Hierarchy node for tree structure
 */
export type HierarchyNode = {
  label: string;
  tags: TagRow[];                        // Tags at this level
  children: Map<string, HierarchyNode>;  // Child categories
  depth: number;
  fullPath: string[];
  rootCategory: string;
};

/**
 * In-memory cache of the thesaurus index
 * Loaded once and reused for mapping tags
 */
let thesaurusCache: ThesaurusIndexItem[] | null = null;

/**
 * Load thesaurus index into memory (called once)
 */
export async function loadThesaurusIndex(): Promise<ThesaurusIndexItem[]> {
  if (thesaurusCache) return thesaurusCache;
  
  // Try multiple paths
  const paths = ['/NPRG045/thesaurus-index.json', '/thesaurus-index.json'];
  
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const data: ThesaurusIndexItem[] = await response.json();
        thesaurusCache = data;
        return data;
      }
    } catch {
      continue;
    }
  }
  
  throw new Error('Could not load thesaurus index');
}

/**
 * Find a tag in the thesaurus
 * 
 * Matching priority:
 * 1. By KeywordID + ParentID (if both provided) - most accurate, disambiguates duplicates
 * 2. By KeywordID only (if provided) - accurate for unique IDs
 * 3. By exact label match (case-insensitive) - prefer preferred terms over aliases
 */
export function findInThesaurus(
  tag: { name: string; keywordId?: number; parentId?: number },
  index: ThesaurusIndexItem[]
): ThesaurusIndexItem | null {
  // Priority 1: Match by KeywordID + ParentID (most accurate, handles duplicates)
  if (tag.keywordId !== undefined && tag.parentId !== undefined) {
    const exact = index.find(
      item => item.id === tag.keywordId && item.parentId === tag.parentId
    );
    if (exact) return exact;
  }
  
  // Priority 2: Match by KeywordID only (fallback for tags without parentId)
  if (tag.keywordId !== undefined) {
    const matches = index.filter(item => item.id === tag.keywordId);
    
    // If multiple matches and we don't have parentId, prefer the preferred term
    if (matches.length > 1) {
      const preferred = matches.find(item => item.isPreferred);
      if (preferred) return preferred;
    }
    
    if (matches.length > 0) return matches[0];
  }
  
  // Priority 3: Fallback to label match (for user tags without IDs)
  const lower = tag.name.toLowerCase().trim();
  const matches = index.filter(item => item.labelLower === lower);
  
  if (matches.length === 0) return null;
  
  // If multiple matches, prefer preferred terms over aliases
  if (matches.length > 1) {
    const preferred = matches.find(item => item.isPreferred);
    if (preferred) return preferred;
  }
  
  // Return the first match (or the only match)
  return matches[0];
}


/**
 * Build hierarchy tree from tags using thesaurus index
 */
export function buildTagHierarchy(
  tags: TagRow[],
  thesaurusIndex: ThesaurusIndexItem[]
): Map<string, HierarchyNode> {
  const rootMap = new Map<string, HierarchyNode>();
  
  for (const tag of tags) {
    // Only look up in thesaurus if:
    // 1. Tag has keywordId/parentId (explicitly from thesaurus input), OR
    // 2. Tag is from API (source: "api")
    // User tags without IDs should go to "Other" without thesaurus lookup
    const shouldLookupThesaurus = 
      tag.source === "api" || 
      (tag.keywordId !== undefined);
    
    let thesaurusEntry: ThesaurusIndexItem | null = null;
    
    if (shouldLookupThesaurus) {
      thesaurusEntry = findInThesaurus(tag, thesaurusIndex);
    }
    
    if (!thesaurusEntry) {
      // Tag not in thesaurus or shouldn't be looked up - put in "Other" category
      if (!rootMap.has('Other')) {
        rootMap.set('Other', {
          label: 'Other',
          tags: [],
          children: new Map(),
          depth: 0,
          fullPath: ['Other'],
          rootCategory: 'Other',
        });
      }
      rootMap.get('Other')!.tags.push(tag);
      continue;
    }
    
    // Build path through hierarchy
    const path = thesaurusEntry.path;
    const rootCategory = path[0]; // Use first path element as root, not rootCategory field
    
    // Get or create root node
    if (!rootMap.has(rootCategory)) {
      rootMap.set(rootCategory, {
        label: rootCategory,
        tags: [],
        children: new Map(),
        depth: 0,
        fullPath: [rootCategory],
        rootCategory: thesaurusEntry.rootCategory, // Keep original for reference
      });
    }
    
    // Navigate/create path through tree
    let current = rootMap.get(rootCategory)!;
    
    for (let i = 1; i < path.length - 1; i++) {
      const segment = path[i];
      
      if (!current.children.has(segment)) {
        current.children.set(segment, {
          label: segment,
          tags: [],
          children: new Map(),
          depth: i,
          fullPath: path.slice(0, i + 1),
          rootCategory,
        });
      }
      
      current = current.children.get(segment)!;
    }
    
    // Add tag to the leaf node
    current.tags.push(tag);
  }
  
  return rootMap;
}

/**
 * Flatten hierarchy tree for simple rendering
 * Returns array of [groupKey, tags, metadata] for display
 */
export type FlatGroup = {
  key: string;
  label: string;
  tags: TagRow[];
  depth: number;
  fullPath: string[];
  hasChildren: boolean;
  parentKey: string | null;
};

/**
 * Check if a node or any of its descendants have tags
 */
function hasAnyTags(node: HierarchyNode): boolean {
  if (node.tags.length > 0) return true;
  
  for (const child of node.children.values()) {
    if (hasAnyTags(child)) return true;
  }
  
  return false;
}

/**
 * Count all tags in a node and its descendants (recursive)
 */
export function countAllTags(node: HierarchyNode): number {
  let count = node.tags.length;
  
  for (const child of node.children.values()) {
    count += countAllTags(child);
  }
  
  return count;
}

/**
 * Simple approach: Just add the new tag and let the hierarchy building handle the rest
 * The buildTagHierarchy function already creates the proper structure
 */
export function restructureTagsForHierarchy(
  tags: TagRow[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _thesaurusIndex: ThesaurusIndexItem[]
): TagRow[] {
  // Just return the tags as-is, the hierarchy building in TagTable will handle the structure
  return tags;
}

/**
 * Create intermediate categories for tags that need to be nested
 * This function ensures that when a tag should be nested under a path,
 * all intermediate categories are created as virtual tags
 */
export function createIntermediateCategories(
  tags: TagRow[],
  thesaurusIndex: ThesaurusIndexItem[]
): TagRow[] {
  const result: TagRow[] = [...tags];
  const addedCategories = new Set<string>(); // Track what we've added to prevent duplicates
  
  // For each tag that has a thesaurus entry with a path
  for (const tag of tags) {
    if (!tag.keywordId) continue;
    
    const thesaurusEntry = thesaurusIndex.find(item => item.id === tag.keywordId);
    if (!thesaurusEntry || !thesaurusEntry.path || thesaurusEntry.path.length <= 1) continue;
    
    const path = thesaurusEntry.path;
    
    // Create intermediate categories for each path segment (except the last one which is the tag itself)
    for (let i = 0; i < path.length - 1; i++) {
      const categoryName = path[i];
      const categoryPath = path.slice(0, i + 1);
      const parentPath = categoryPath.slice(0, -1);
      
      // Create a unique key for this category
      const categoryKey = `${categoryName}::${JSON.stringify(parentPath)}`;
      
      // Skip if we already added this category in this run
      if (addedCategories.has(categoryKey)) continue;
      
      // Check if this intermediate category already exists as a tag with the same path
      const existingCategory = result.find(t => 
        t.name === categoryName && 
        t.hierarchicalPath && 
        JSON.stringify(t.hierarchicalPath) === JSON.stringify(parentPath)
      );
      
      // If it already exists, mark it as added and continue
      if (existingCategory) {
        addedCategories.add(categoryKey);
        continue;
      }
      
      // Find the thesaurus entry for this exact category path
      const categoryThesaurusEntry = thesaurusIndex.find(item => 
        item.labelLower === categoryName.toLowerCase() && 
        JSON.stringify(item.path) === JSON.stringify(categoryPath)
      );
      
      // Only create the category if we found it in the thesaurus
      if (categoryThesaurusEntry) {
        result.push({
          name: categoryName,
          source: "user", // Mark as user-created category
          keywordId: categoryThesaurusEntry.id,
          hierarchicalPath: parentPath, // Parent path
          isCategory: true // Flag to indicate this is a category, not a regular tag
        });
        
        addedCategories.add(categoryKey);
      }
    }
  }
  
  return result;
}

export function flattenHierarchy(
  hierarchy: Map<string, HierarchyNode>
): FlatGroup[] {
  const result: FlatGroup[] = [];
  
  function traverse(
    node: HierarchyNode,
    parentKey: string | null = null
  ) {
    // Skip nodes with no tags and no children with tags
    if (!hasAnyTags(node)) return;
    
    const key = node.fullPath.join(' › ');
    
    // Add current node only if it has tags OR has children with tags
    result.push({
      key,
      label: node.label,
      tags: node.tags,
      depth: node.depth,
      fullPath: node.fullPath,
      hasChildren: node.children.size > 0,
      parentKey,
    });
    
    // Recursively add children (only non-empty ones)
    for (const child of node.children.values()) {
      traverse(child, key);
    }
  }
  
  // Traverse all root nodes
  for (const root of hierarchy.values()) {
    traverse(root);
  }
  
  return result;
}

