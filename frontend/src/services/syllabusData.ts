import { ConceptNode, ConceptEdge, LearnerProfile, ConceptMastery } from '../types';

export const FALLBACK_CONCEPTS: ConceptNode[] = [
  {
    id: 'arrays',
    name: 'Arrays & Basic Operations',
    category: 'Linear Data Structures',
    prerequisites: [],
    description: 'Contiguous memory blocks offering O(1) random access by index, cache locality, and static/dynamic resizing tradeoffs.',
    difficulty_tier: 'novice',
    graph_position: { x: 40, y: 60 },
    key_subtopics: [
      'Contiguous memory allocation',
      'Zero-indexed address arithmetic',
      'Dynamic array amortized insertion',
      'Prefix sums and two-pointer traversal'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'time_complexity',
    name: 'Time Complexity & Big-O',
    category: 'Algorithmic Analysis',
    prerequisites: [],
    description: 'Asymptotic upper/tight bounds (Big O, Big Theta, Big Omega) measuring operation count growth relative to input size n.',
    difficulty_tier: 'novice',
    graph_position: { x: 260, y: 60 },
    key_subtopics: [
      'Big O notation definition',
      'Loop iterations and polynomial growth',
      'Logarithmic division',
      'Best, average, and worst-case bounds'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'space_complexity',
    name: 'Space Complexity',
    category: 'Algorithmic Analysis',
    prerequisites: ['time_complexity'],
    description: 'Auxiliary working memory vs input space allocation during execution, including recursive stack frames.',
    difficulty_tier: 'novice',
    graph_position: { x: 480, y: 60 },
    key_subtopics: [
      'Auxiliary space vs total space',
      'In-place modifications',
      'Call stack frame allocation in recursion'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'recursion',
    name: 'Recursion Fundamentals',
    category: 'Algorithmic Paradigms',
    prerequisites: ['time_complexity', 'space_complexity'],
    description: 'Self-referential function dispatch resolving subproblems via base-case termination and call-stack frame unwind.',
    difficulty_tier: 'novice',
    graph_position: { x: 700, y: 60 },
    key_subtopics: [
      'Base case identification and prevention of stack overflow',
      'Call stack frame lifecycles',
      'Divide and conquer recurrence relations'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'linked_lists',
    name: 'Linked Lists & Pointers',
    category: 'Linear Data Structures',
    prerequisites: ['arrays'],
    description: 'Non-contiguous dynamic nodes connected via pointer references; efficient O(1) insertions/deletions given reference.',
    difficulty_tier: 'novice',
    graph_position: { x: 40, y: 220 },
    key_subtopics: [
      'Singly and doubly linked nodes',
      'Pointer manipulation and sentinel nodes',
      'Fast and slow pointer cycle detection'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'stacks',
    name: 'Stacks & LIFO',
    category: 'Abstract Data Types',
    prerequisites: ['arrays', 'linked_lists'],
    description: 'Last-In-First-Out (LIFO) protocol constrained to top-element push, pop, and peek operations.',
    difficulty_tier: 'novice',
    graph_position: { x: 260, y: 220 },
    key_subtopics: [
      'LIFO invariant and plate stack mental model',
      'Parentheses matching and expression evaluation',
      'Monotonic stack optimization'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'queues',
    name: 'Queues & FIFO',
    category: 'Abstract Data Types',
    prerequisites: ['arrays', 'linked_lists'],
    description: 'First-In-First-Out (FIFO) buffer protocol supporting front dequeue and rear enqueue operations.',
    difficulty_tier: 'novice',
    graph_position: { x: 480, y: 220 },
    key_subtopics: [
      'FIFO invariant and queue buffer mechanics',
      'Circular queue implementation with modulo arithmetic',
      'Breadth-first search queue dispatch'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'searching',
    name: 'Linear & Binary Search',
    category: 'Core Algorithms',
    prerequisites: ['arrays', 'time_complexity'],
    description: 'Linear scan vs logarithmic Binary Search exploiting sorted order invariants in random-access data.',
    difficulty_tier: 'novice',
    graph_position: { x: 700, y: 220 },
    key_subtopics: [
      'Linear search O(n) bounds',
      'Binary search mid computation avoiding integer overflow',
      'Lower and upper bound binary search templates'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'novice'
  },
  {
    id: 'sorting',
    name: 'Sorting Algorithms',
    category: 'Core Algorithms',
    prerequisites: ['arrays', 'recursion', 'time_complexity'],
    description: 'Quadratic comparison sorts vs O(n log n) Divide & Conquer algorithms (MergeSort, QuickSort).',
    difficulty_tier: 'intermediate',
    graph_position: { x: 150, y: 380 },
    key_subtopics: [
      'Stability in sorting algorithms',
      'MergeSort divide-and-conquer auxiliary buffer',
      'QuickSort partition strategies and worst-case O(n^2) degradation'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'intermediate'
  },
  {
    id: 'trees',
    name: 'Tree Structures',
    category: 'Hierarchical Data Structures',
    prerequisites: ['linked_lists', 'recursion'],
    description: 'Acyclic connected hierarchical graphs composed of root, parent, child, and leaf nodes.',
    difficulty_tier: 'intermediate',
    graph_position: { x: 370, y: 380 },
    key_subtopics: [
      'Tree terminology: root, height, depth, subtree',
      'Pre-order, in-order, post-order depth-first traversals',
      'Level-order breadth-first traversal'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'intermediate'
  },
  {
    id: 'binary_trees',
    name: 'Binary Trees & BSTs',
    category: 'Hierarchical Data Structures',
    prerequisites: ['trees'],
    description: 'Hierarchical trees where every node has at most two children; includes Binary Search Tree ordering invariants.',
    difficulty_tier: 'intermediate',
    graph_position: { x: 590, y: 380 },
    key_subtopics: [
      'Binary Search Tree (BST) ancestor constraint invariants',
      'Search, insert, and delete in BST',
      'Tree balancing concepts'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'intermediate'
  },
  {
    id: 'graphs',
    name: 'Graph Representations',
    category: 'Non-Linear Data Structures',
    prerequisites: ['trees', 'queues', 'recursion'],
    description: 'Networks of vertices connected by directed or undirected edges, represented via adjacency matrices or lists.',
    difficulty_tier: 'advanced',
    graph_position: { x: 370, y: 540 },
    key_subtopics: [
      'Adjacency lists vs adjacency matrix tradeoffs',
      'Breadth-first search (BFS) queue shortest path discovery',
      'Depth-first search (DFS) recursion and cycle detection with visited sets'
    ],
    mastery_percentage: 0,
    questions_attempted: 0,
    current_difficulty: 'advanced'
  }
];

export const FALLBACK_EDGES: ConceptEdge[] = [
  { from: 'time_complexity', to: 'space_complexity' },
  { from: 'arrays', to: 'linked_lists' },
  { from: 'time_complexity', to: 'recursion' },
  { from: 'space_complexity', to: 'recursion' },
  { from: 'arrays', to: 'stacks' },
  { from: 'linked_lists', to: 'stacks' },
  { from: 'arrays', to: 'queues' },
  { from: 'linked_lists', to: 'queues' },
  { from: 'arrays', to: 'searching' },
  { from: 'time_complexity', to: 'searching' },
  { from: 'arrays', to: 'sorting' },
  { from: 'recursion', to: 'sorting' },
  { from: 'time_complexity', to: 'sorting' },
  { from: 'linked_lists', to: 'trees' },
  { from: 'recursion', to: 'trees' },
  { from: 'trees', to: 'binary_trees' },
  { from: 'trees', to: 'graphs' },
  { from: 'queues', to: 'graphs' },
  { from: 'recursion', to: 'graphs' }
];

export function createDefaultProfile(): LearnerProfile {
  const conceptsMap: Record<string, ConceptMastery> = {};
  for (const c of FALLBACK_CONCEPTS) {
    conceptsMap[c.id] = {
      concept_id: c.id,
      concept_name: c.name,
      category: c.category,
      mastery_percentage: 0.0,
      questions_attempted: 0,
      correct_answers: 0,
      incorrect_answers: 0,
      current_difficulty: (c.difficulty_tier === 'intermediate' || c.difficulty_tier === 'advanced') ? c.difficulty_tier : 'novice',
      last_misconception: null,
      last_misconception_name: null,
      last_practiced_at: null,
      next_revision_at: null,
      consecutive_correct: 0
    };
  }

  return {
    student_id: 'student_default',
    name: 'Alex Chen',
    target_exam: 'Data Structures & Algorithms Exam',
    overall_mastery: 0.0,
    diagnostic_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    concepts: conceptsMap
  };
}
