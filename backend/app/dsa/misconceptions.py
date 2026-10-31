from typing import Dict, List, Any

# Fine-grained conceptual flaw catalog for each of the 12 DSA concepts
MISCONCEPTION_CATALOG: Dict[str, Dict[str, Any]] = {
    # --- STACKS ---
    "stack_fifo_confusion": {
        "id": "stack_fifo_confusion",
        "concept_id": "stacks",
        "name": "LIFO vs FIFO Inversion",
        "description": "Student treated the stack as First-In-First-Out (Queue behavior) rather than Last-In-First-Out.",
        "trigger_keywords": ["first in", "dequeue", "front element", "served first", "first added first out"],
        "remediation_tip": "Visualize a stack of cafeteria trays or plates: you can only add to or take from the top (LIFO).",
        "prerequisite_to_review": "queues"
    },
    "stack_overflow_underflow": {
        "id": "stack_overflow_underflow",
        "concept_id": "stacks",
        "name": "Stack Overflow/Underflow Boundary Ignored",
        "description": "Student failed to check if stack is empty before popping (underflow) or full before pushing (overflow).",
        "trigger_keywords": ["empty check", "boundary", "pop without checking", "overflow", "underflow", "stack full", "crash on empty"],
        "remediation_tip": "Always verify isEmpty() before calling pop() or peek(), and isFull() before bounded push().",
        "prerequisite_to_review": "arrays"
    },
    "stack_push_pop_pointer": {
        "id": "stack_push_pop_pointer",
        "concept_id": "stacks",
        "name": "Top Pointer Indexing & Direction Error",
        "description": "Student miscalculated the top pointer index after push or pop operations.",
        "trigger_keywords": ["top++", "top--", "index off by one", "pointer moved wrong way", "pre-increment"],
        "remediation_tip": "In 0-indexed array stacks, top starts at -1. Push increments before write; pop decrements after read.",
        "prerequisite_to_review": "arrays"
    },

    # --- QUEUES ---
    "queue_circular_wrap": {
        "id": "queue_circular_wrap",
        "concept_id": "queues",
        "name": "Circular Queue Modulo Wraparound Omission",
        "description": "Student assumed queue is full when rear reaches array end, forgetting (rear + 1) % size reuse.",
        "trigger_keywords": ["modulo", "wraparound", "end of array", "stuck at end", "unused space at front"],
        "remediation_tip": "Circular queues reuse dequeued front slots via index arithmetic: next_rear = (rear + 1) % capacity.",
        "prerequisite_to_review": "arrays"
    },
    "queue_dequeue_end": {
        "id": "queue_dequeue_end",
        "concept_id": "queues",
        "name": "Queue Enqueue/Dequeue Endpoint Confusion",
        "description": "Student enqueued or dequeued from the incorrect end of the queue.",
        "trigger_keywords": ["removed from rear", "added to front", "wrong end", "enqueue at front"],
        "remediation_tip": "Standard queues enqueue at the REAR and dequeue from the FRONT.",
        "prerequisite_to_review": "stacks"
    },

    # --- ARRAYS ---
    "array_bounds_zero_index": {
        "id": "array_bounds_zero_index",
        "concept_id": "arrays",
        "name": "Zero-Indexing & Bounds Off-By-One",
        "description": "Student accessed arr[n] instead of arr[n-1] or confused length with maximum valid index.",
        "trigger_keywords": ["arr[n]", "off by one", "last index n", "out of bounds", "index equals length"],
        "remediation_tip": "An array of size n has valid indices from 0 to n-1. Accessing index n triggers an IndexOutOfBounds exception.",
        "prerequisite_to_review": "arrays"
    },
    "array_insertion_cost": {
        "id": "array_insertion_cost",
        "concept_id": "arrays",
        "name": "Static Array Insertion Cost Misunderstanding",
        "description": "Student assumed inserting at the beginning of an array is O(1) instead of requiring O(n) element shifts.",
        "trigger_keywords": ["o(1) insert", "shift elements", "insert at index 0", "instant insert"],
        "remediation_tip": "Inserting at index 0 requires shifting all n existing elements right by one position, costing O(n) time.",
        "prerequisite_to_review": "time_complexity"
    },

    # --- LINKED LISTS ---
    "linked_list_pointer_loss": {
        "id": "linked_list_pointer_loss",
        "concept_id": "linked_lists",
        "name": "Orphaned Node via Premature Pointer Overwrite",
        "description": "Student reassigned curr.next before saving next node reference, severing the rest of the list.",
        "trigger_keywords": ["lost reference", "orphaned", "overwrote next", "garbage collected", "lost the tail"],
        "remediation_tip": "Always cache temp = curr.next before updating curr.next, preserving the remaining chain.",
        "prerequisite_to_review": "linked_lists"
    },
    "linked_list_random_access": {
        "id": "linked_list_random_access",
        "concept_id": "linked_lists",
        "name": "Linked List Random Access Assumption",
        "description": "Student assumed linked lists support O(1) random indexing like arrays.",
        "trigger_keywords": ["o(1) index", "direct access", "node[i]", "jump to index"],
        "remediation_tip": "Linked list nodes are non-contiguous in memory. Accessing the k-th node requires sequential traversal in O(k) time.",
        "prerequisite_to_review": "arrays"
    },

    # --- TIME COMPLEXITY ---
    "complexity_worst_vs_average": {
        "id": "complexity_worst_vs_average",
        "concept_id": "time_complexity",
        "name": "Worst-Case vs Average-Case Equivalence Flaw",
        "description": "Student assumed average case complexity (e.g. QuickSort O(n log n)) always holds in worst-case scenarios.",
        "trigger_keywords": ["always n log n", "worst case same", "guaranteed time", "quicksort always fast"],
        "remediation_tip": "Algorithms like QuickSort or Hash Table lookups can degenerate to O(n^2) or O(n) under worst-case inputs.",
        "prerequisite_to_review": "time_complexity"
    },
    "complexity_loop_nesting": {
        "id": "complexity_loop_nesting",
        "concept_id": "time_complexity",
        "name": "Logarithmic vs Linear Loop Growth Flaw",
        "description": "Student assumed loops multiplying/dividing iterator (i *= 2) execute in O(n) rather than O(log n).",
        "trigger_keywords": ["loop is o(n)", "nested loop always n^2", "i *= 2 linear", "forgot log"],
        "remediation_tip": "When a loop variable multiplies or divides by a constant (e.g., i *= 2), the iterations scale logarithmically: O(log n).",
        "prerequisite_to_review": "time_complexity"
    },

    # --- SPACE COMPLEXITY ---
    "space_auxiliary_vs_input": {
        "id": "space_auxiliary_vs_input",
        "concept_id": "space_complexity",
        "name": "Confusing Input Size with Auxiliary Memory",
        "description": "Student counted the read-only input array memory towards the algorithm's auxiliary space complexity.",
        "trigger_keywords": ["input counts as space", "array takes space so o(n)", "auxiliary includes input"],
        "remediation_tip": "Auxiliary space measures only EXTRA working memory allocated by the algorithm, excluding the input data itself.",
        "prerequisite_to_review": "space_complexity"
    },
    "space_recursion_stack_ignored": {
        "id": "space_recursion_stack_ignored",
        "concept_id": "space_complexity",
        "name": "Recursion Call Stack Memory Ignored",
        "description": "Student claimed a recursive function uses O(1) space because no new collections were allocated.",
        "trigger_keywords": ["o(1) space recursive", "no array allocated", "ignored call stack", "stack frames free"],
        "remediation_tip": "Each active recursive call allocates a stack frame in memory. A recursion depth of d requires O(d) auxiliary stack space.",
        "prerequisite_to_review": "recursion"
    },

    # --- RECURSION ---
    "recursion_missing_base": {
        "id": "recursion_missing_base",
        "concept_id": "recursion",
        "name": "Missing or Ineffective Base Case",
        "description": "Student failed to define a terminating base case, causing indefinite recursive calls and stack overflow.",
        "trigger_keywords": ["infinite recursion", "stack overflow", "no stopping condition", "never reaches base case"],
        "remediation_tip": "Every recursive function MUST have at least one base case that returns without calling itself, and inputs must strictly shrink towards it.",
        "prerequisite_to_review": "recursion"
    },
    "recursion_unreturned_value": {
        "id": "recursion_unreturned_value",
        "concept_id": "recursion",
        "name": "Unconsumed Recursive Return Value",
        "description": "Student called the recursive function helper without returning its evaluated value back up the call stack.",
        "trigger_keywords": ["forgot return", "called without returning", "lost return value", "returns undefined"],
        "remediation_tip": "Remember to return recursive_call(subproblem) so the evaluated base value bubbles back to the caller.",
        "prerequisite_to_review": "recursion"
    },

    # --- SEARCHING ---
    "binary_search_unsorted": {
        "id": "binary_search_unsorted",
        "concept_id": "searching",
        "name": "Applying Binary Search to Unordered Array",
        "description": "Student attempted binary search on an unsorted array without prerequisite sorting.",
        "trigger_keywords": ["binary search unsorted", "divide and conquer any array", "works on unsorted"],
        "remediation_tip": "Binary search strictly requires monotonicity (sorted order) to reliably discard half the search space.",
        "prerequisite_to_review": "sorting"
    },
    "binary_search_mid_overflow": {
        "id": "binary_search_mid_overflow",
        "concept_id": "searching",
        "name": "Midpoint Calculation Integer Overflow",
        "description": "Student used (low + high) // 2 instead of low + (high - low) // 2.",
        "trigger_keywords": ["low + high / 2", "integer overflow", "mid formula"],
        "remediation_tip": "Use mid = low + (high - low) // 2 to prevent 32-bit integer overflow when low + high exceeds 2^31 - 1.",
        "prerequisite_to_review": "searching"
    },

    # --- SORTING ---
    "sorting_stability_confusion": {
        "id": "sorting_stability_confusion",
        "concept_id": "sorting",
        "name": "Sorting Stability Misunderstanding",
        "description": "Student assumed stable sorting means fast/efficient rather than preserving duplicate key relative order.",
        "trigger_keywords": ["stable means no crash", "stable is fast", "duplicates reordered"],
        "remediation_tip": "A sort is STABLE if elements with equal keys maintain their original relative order after sorting (e.g. MergeSort is stable; standard QuickSort is not).",
        "prerequisite_to_review": "sorting"
    },

    # --- TREES & BINARY TREES ---
    "bst_ancestor_constraint_violation": {
        "id": "bst_ancestor_constraint_violation",
        "concept_id": "binary_trees",
        "name": "BST Local Child vs Global Ancestor Flaw",
        "description": "Student only checked if node.left < node < node.right locally, ignoring ancestor range boundaries (e.g. node in right subtree smaller than root).",
        "trigger_keywords": ["only checked parent", "local check only", "valid left and right", "ancestor bounds"],
        "remediation_tip": "In a BST, ALL nodes in the left subtree must be less than root, and ALL in right subtree must be greater. Pass min/max ranges down during recursion.",
        "prerequisite_to_review": "binary_trees"
    },
    "tree_traversal_order_swap": {
        "id": "tree_traversal_order_swap",
        "concept_id": "trees",
        "name": "In-Order vs Pre-Order vs Post-Order Swap",
        "description": "Student confused the placement of the root visit relative to its subtrees.",
        "trigger_keywords": ["inorder root first", "preorder root last", "postorder middle", "traversal swap"],
        "remediation_tip": "Pre-order: Root -> Left -> Right. In-order: Left -> Root -> Right. Post-order: Left -> Right -> Root.",
        "prerequisite_to_review": "trees"
    },

    # --- GRAPHS ---
    "graph_cycle_visited_omission": {
        "id": "graph_cycle_visited_omission",
        "concept_id": "graphs",
        "name": "Graph Visited Set Omission (Infinite Loop)",
        "description": "Student implemented graph traversal without a visited set, leading to infinite cycles.",
        "trigger_keywords": ["no visited set", "infinite loop in graph", "revisiting node", "cyclic crash"],
        "remediation_tip": "Unlike trees, graphs may contain cycles. Always mark visited nodes in a set or boolean array upon discovery.",
        "prerequisite_to_review": "graphs"
    },
    "graph_bfs_weighted_shortest_path": {
        "id": "graph_bfs_weighted_shortest_path",
        "concept_id": "graphs",
        "name": "Using BFS for Weighted Shortest Path",
        "description": "Student assumed BFS finds the shortest path on graphs with varying edge weights.",
        "trigger_keywords": ["bfs for weighted", "bfs minimum cost", "dijkstra not needed"],
        "remediation_tip": "Standard BFS only guarantees the shortest path on UNWEIGHTED graphs. For weighted graphs, use Dijkstra's algorithm with a priority queue.",
        "prerequisite_to_review": "graphs"
    }
}

def get_misconceptions_for_concept(concept_id: str) -> List[Dict[str, Any]]:
    return [m for m in MISCONCEPTION_CATALOG.values() if m["concept_id"] == concept_id]

def get_all_misconceptions() -> List[Dict[str, Any]]:
    return list(MISCONCEPTION_CATALOG.values())
