from typing import Dict, List, Any

# Structured 12-Concept DSA Syllabus with Prerequisite DAG and Graph Layout Coordinates
DSA_CONCEPTS: Dict[str, Dict[str, Any]] = {
    "arrays": {
        "id": "arrays",
        "name": "Arrays",
        "category": "Linear Data Structures",
        "prerequisites": [],
        "description": "Contiguous memory blocks offering O(1) random access by index, cache locality, and static/dynamic resizing tradeoffs.",
        "difficulty_tier": "novice",
        "graph_position": {"x": 120, "y": 80},
        "key_subtopics": [
            "Contiguous memory allocation",
            "Zero-indexed address arithmetic",
            "Dynamic array amortized insertion",
            "Prefix sums and two-pointer traversal"
        ]
    },
    "time_complexity": {
        "id": "time_complexity",
        "name": "Time Complexity",
        "category": "Algorithmic Analysis",
        "prerequisites": [],
        "description": "Asymptotic upper/tight bounds (Big O, Big Theta, Big Omega) measuring operation count growth relative to input size n.",
        "difficulty_tier": "novice",
        "graph_position": {"x": 380, "y": 80},
        "key_subtopics": [
            "Big O notation definition",
            "Loop iterations and polynomial growth",
            "Logarithmic division",
            "Best, average, and worst-case bounds"
        ]
    },
    "space_complexity": {
        "id": "space_complexity",
        "name": "Space Complexity",
        "category": "Algorithmic Analysis",
        "prerequisites": ["time_complexity"],
        "description": "Auxiliary working memory vs input space allocation during execution, including recursive stack frames.",
        "difficulty_tier": "novice",
        "graph_position": {"x": 640, "y": 80},
        "key_subtopics": [
            "Auxiliary space vs total space",
            "In-place modifications",
            "Call stack frame allocation in recursion"
        ]
    },
    "linked_lists": {
        "id": "linked_lists",
        "name": "Linked Lists",
        "category": "Linear Data Structures",
        "prerequisites": ["arrays"],
        "description": "Non-contiguous dynamic nodes connected via pointer references; efficient O(1) insertions/deletions given reference.",
        "difficulty_tier": "novice",
        "graph_position": {"x": 120, "y": 240},
        "key_subtopics": [
            "Singly and doubly linked nodes",
            "Pointer manipulation and sentinel nodes",
            "Fast and slow pointer cycle detection (Floyd's algorithm)",
            "Reverse linked list techniques"
        ]
    },
    "recursion": {
        "id": "recursion",
        "name": "Recursion",
        "category": "Algorithmic Paradigms",
        "prerequisites": ["time_complexity", "space_complexity"],
        "description": "Self-referential functions that decompose problems into self-similar subproblems with base and inductive steps.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 500, "y": 240},
        "key_subtopics": [
            "Base case and progress towards termination",
            "Call stack unwind semantics",
            "Divide and conquer decomposition",
            "Recurrence relations (Master Theorem)"
        ]
    },
    "stacks": {
        "id": "stacks",
        "name": "Stacks",
        "category": "Abstract Data Types",
        "prerequisites": ["arrays", "linked_lists"],
        "description": "LIFO (Last-In, First-Out) discipline with O(1) Push, Pop, and Peek primitives; essential for parsing, undo buffers, and DFS.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 60, "y": 400},
        "key_subtopics": [
            "LIFO ordering rules",
            "Stack overflow and underflow boundaries",
            "Monotonic stack patterns",
            "Bracket balancing and expression evaluation"
        ]
    },
    "queues": {
        "id": "queues",
        "name": "Queues",
        "category": "Abstract Data Types",
        "prerequisites": ["arrays", "linked_lists"],
        "description": "FIFO (First-In, First-Out) discipline with O(1) Enqueue and Dequeue; foundational for BFS and buffering.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 260, "y": 400},
        "key_subtopics": [
            "FIFO ordering rules",
            "Circular array buffer wrap-around with modulo",
            "Double-ended queues (Deques)",
            "Level-order traversal queue applications"
        ]
    },
    "searching": {
        "id": "searching",
        "name": "Searching",
        "category": "Core Algorithms",
        "prerequisites": ["arrays", "time_complexity"],
        "description": "Linear search O(n) and binary search O(log n) over ordered domains with lower/upper bound invariants.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 420, "y": 400},
        "key_subtopics": [
            "Linear scan vs Binary search invariants",
            "Midpoint calculation avoiding integer overflow",
            "Searching rotated sorted arrays",
            "Binary search on answer spaces"
        ]
    },
    "sorting": {
        "id": "sorting",
        "name": "Sorting",
        "category": "Core Algorithms",
        "prerequisites": ["arrays", "recursion", "time_complexity"],
        "description": "Comparison sorts (MergeSort, QuickSort, HeapSort) and non-comparison sorts (Counting, Radix); stability guarantees.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 650, "y": 400},
        "key_subtopics": [
            "Stability in sorting algorithms",
            "MergeSort O(n log n) divide and conquer",
            "QuickSort partitioning and worst-case pivot selection",
            "Comparison sort lower bound Omega(n log n)"
        ]
    },
    "trees": {
        "id": "trees",
        "name": "Trees",
        "category": "Hierarchical Data Structures",
        "prerequisites": ["linked_lists", "recursion"],
        "description": "Acyclic hierarchical graphs with a distinguished root and subtrees; fundamental for DOMs, filesystems, and hierarchies.",
        "difficulty_tier": "intermediate",
        "graph_position": {"x": 200, "y": 560},
        "key_subtopics": [
            "Tree terminology (root, height, depth, leaves)",
            "Depth-First Search traversals (Pre/In/Post order)",
            "Breadth-First Search level-order traversal",
            "Height calculation via post-order recursion"
        ]
    },
    "binary_trees": {
        "id": "binary_trees",
        "name": "Binary Trees",
        "category": "Hierarchical Data Structures",
        "prerequisites": ["trees"],
        "description": "Specialized trees where nodes have at most two children; includes Binary Search Trees (BST), AVL, and Heaps.",
        "difficulty_tier": "advanced",
        "graph_position": {"x": 420, "y": 560},
        "key_subtopics": [
            "BST ordering property (all left < root < all right)",
            "Tree validation and ancestor range passing",
            "Lowest Common Ancestor (LCA)",
            "Balanced vs skewed degeneration tradeoffs"
        ]
    },
    "graphs": {
        "id": "graphs",
        "name": "Graphs",
        "category": "Non-Linear Data Structures",
        "prerequisites": ["trees", "queues", "recursion"],
        "description": "Generalized networks of vertices and edges (directed/undirected, weighted/unweighted, cyclic/acyclic).",
        "difficulty_tier": "advanced",
        "graph_position": {"x": 650, "y": 560},
        "key_subtopics": [
            "Adjacency list vs adjacency matrix representations",
            "BFS shortest path on unweighted graphs",
            "DFS cycle detection with visited coloring",
            "Topological sorting on DAGs"
        ]
    }
}

# Graph edges (prerequisite connections)
PREREQUISITE_EDGES: List[Dict[str, str]] = [
    {"from": "time_complexity", "to": "space_complexity"},
    {"from": "time_complexity", "to": "recursion"},
    {"from": "space_complexity", "to": "recursion"},
    {"from": "arrays", "to": "linked_lists"},
    {"from": "arrays", "to": "searching"},
    {"from": "time_complexity", "to": "searching"},
    {"from": "arrays", "to": "stacks"},
    {"from": "linked_lists", "to": "stacks"},
    {"from": "arrays", "to": "queues"},
    {"from": "linked_lists", "to": "queues"},
    {"from": "arrays", "to": "sorting"},
    {"from": "recursion", "to": "sorting"},
    {"from": "time_complexity", "to": "sorting"},
    {"from": "linked_lists", "to": "trees"},
    {"from": "recursion", "to": "trees"},
    {"from": "trees", "to": "binary_trees"},
    {"from": "trees", "to": "graphs"},
    {"from": "queues", "to": "graphs"},
    {"from": "recursion", "to": "graphs"},
]

def get_all_concepts() -> List[Dict[str, Any]]:
    return list(DSA_CONCEPTS.values())

def get_concept(concept_id: str) -> Dict[str, Any]:
    return DSA_CONCEPTS.get(concept_id, {})
