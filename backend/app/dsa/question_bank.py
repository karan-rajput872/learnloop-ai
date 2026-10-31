from typing import List, Dict, Any

# Question Bank spanning all 12 DSA concepts across Novice, Intermediate, and Advanced tiers
QUESTION_BANK: List[Dict[str, Any]] = [
    # --- 1. ARRAYS ---
    {
        "id": "q_arr_01",
        "concept_id": "arrays",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "An array of 10 integers is declared starting at memory address 1000. In a system where each integer occupies 4 bytes, what is the memory address of the element at index 3?",
        "options": [
            {"id": "A", "text": "1012"},
            {"id": "B", "text": "1016"},
            {"id": "C", "text": "1003"},
            {"id": "D", "text": "1004"}
        ],
        "correct_option": "A",
        "explanation": "In 0-indexed arrays, address = Base + (Index * ElementSize) = 1000 + (3 * 4) = 1012. Choosing 1016 comes from 1-based indexing confusion.",
        "option_misconceptions": {
            "B": "array_bounds_zero_index",
            "C": "array_bounds_zero_index"
        }
    },
    {
        "id": "q_arr_02",
        "concept_id": "arrays",
        "difficulty": "intermediate",
        "is_diagnostic": False,
        "question_text": "Why does inserting an element at index 0 of a static array containing n elements require O(n) operations?",
        "options": [
            {"id": "A", "text": "Because all n existing elements must be shifted right by one position to make room at index 0"},
            {"id": "B", "text": "Because finding index 0 requires a linear search through the array"},
            {"id": "C", "text": "Because memory allocation occurs at index 0 only in O(n) time"},
            {"id": "D", "text": "It actually takes O(1) time if the array is unsorted"}
        ],
        "correct_option": "A",
        "explanation": "Arrays require contiguous memory. Inserting at index 0 demands shifting all existing n elements from index i to i+1, yielding O(n) complexity.",
        "option_misconceptions": {
            "B": "array_bounds_zero_index",
            "D": "array_insertion_cost"
        }
    },

    # --- 2. TIME COMPLEXITY ---
    {
        "id": "q_time_01",
        "concept_id": "time_complexity",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "What is the time complexity of the following code snippet?\n\n```python\ni = 1\nwhile i < n:\n    print(i)\n    i = i * 2\n```",
        "options": [
            {"id": "A", "text": "O(log n)"},
            {"id": "B", "text": "O(n)"},
            {"id": "C", "text": "O(n log n)"},
            {"id": "D", "text": "O(1)"}
        ],
        "correct_option": "A",
        "explanation": "Since the loop variable doubles on each iteration (i = 1, 2, 4, 8...), the loop executes k times where 2^k = n, so k = log2(n) iterations: O(log n).",
        "option_misconceptions": {
            "B": "complexity_loop_nesting",
            "C": "complexity_loop_nesting"
        }
    },
    {
        "id": "q_time_02",
        "concept_id": "time_complexity",
        "difficulty": "advanced",
        "is_diagnostic": False,
        "question_text": "Why is the worst-case time complexity of standard QuickSort O(n^2), even though its average-case is O(n log n)?",
        "options": [
            {"id": "A", "text": "When the chosen pivot is always the maximum or minimum element, partitioning splits the array into sizes 0 and n-1"},
            {"id": "B", "text": "Because merging subarrays takes quadratic time in the worst case"},
            {"id": "C", "text": "Because comparison operators degrade to O(n) on large arrays"},
            {"id": "D", "text": "QuickSort never takes O(n^2); it is proven to be strictly O(n log n)"}
        ],
        "correct_option": "A",
        "explanation": "If the pivot repeatedly isolates the extreme element (such as sorting an already sorted array with the first element as pivot), the recurrence is T(n) = T(n-1) + O(n) = O(n^2).",
        "option_misconceptions": {
            "D": "complexity_worst_vs_average",
            "B": "sorting_stability_confusion"
        }
    },

    # --- 3. SPACE COMPLEXITY ---
    {
        "id": "q_space_01",
        "concept_id": "space_complexity",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "What is the auxiliary space complexity of printing a linked list of length n recursively?\n\n```python\ndef print_list(node):\n    if not node: return\n    print(node.val)\n    print_list(node.next)\n```",
        "options": [
            {"id": "A", "text": "O(n) auxiliary space due to n active recursive call stack frames"},
            {"id": "B", "text": "O(1) auxiliary space because no new collections or arrays were allocated"},
            {"id": "C", "text": "O(n^2) space because each stack frame clones the list"},
            {"id": "D", "text": "O(log n) auxiliary space"}
        ],
        "correct_option": "A",
        "explanation": "Even though no data structures are instantiated, the runtime call stack allocates a frame for every recursive invocation until base condition is met, using O(n) stack memory.",
        "option_misconceptions": {
            "B": "space_recursion_stack_ignored",
            "C": "space_auxiliary_vs_input"
        }
    },

    # --- 4. LINKED LISTS ---
    {
        "id": "q_ll_01",
        "concept_id": "linked_lists",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "To insert a new node `new_node` immediately after `prev_node` in a singly linked list, which sequence of pointer assignments is correct?",
        "options": [
            {"id": "A", "text": "new_node.next = prev_node.next; prev_node.next = new_node"},
            {"id": "B", "text": "prev_node.next = new_node; new_node.next = prev_node.next"},
            {"id": "C", "text": "prev_node.next = new_node.next; new_node.next = prev_node"},
            {"id": "D", "text": "new_node = prev_node.next; prev_node.next = new_node"}
        ],
        "correct_option": "A",
        "explanation": "You must link `new_node.next` to `prev_node.next` first. If you execute `prev_node.next = new_node` first, you overwrite the reference to the subsequent nodes, orphaning the rest of the list.",
        "option_misconceptions": {
            "B": "linked_list_pointer_loss",
            "C": "linked_list_pointer_loss"
        }
    },

    # --- 5. RECURSION ---
    {
        "id": "q_rec_01",
        "concept_id": "recursion",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "What happens if a recursive function lacks a base case or has an unreachable base case?",
        "options": [
            {"id": "A", "text": "The function calls itself indefinitely until maximum call stack size is exceeded (StackOverflow / RecursionError)"},
            {"id": "B", "text": "The program automatically returns 0 once input reaches 0"},
            {"id": "C", "text": "The compiler converts the recursion into a single while loop"},
            {"id": "D", "text": "The memory automatically garbage collects previous calls"}
        ],
        "correct_option": "A",
        "explanation": "Without a valid base condition to halt calls and unwind the stack, frames accumulate on the call stack until memory is exhausted, throwing a Stack Overflow.",
        "option_misconceptions": {
            "B": "recursion_missing_base",
            "C": "recursion_missing_base"
        }
    },

    # --- 6. STACKS ---
    {
        "id": "q_stack_01",
        "concept_id": "stacks",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "The following operations are performed on an initially empty stack S: Push(5), Push(8), Pop(), Push(12), Push(15), Pop(). What value is at the top of the stack?",
        "options": [
            {"id": "A", "text": "12"},
            {"id": "B", "text": "15"},
            {"id": "C", "text": "5"},
            {"id": "D", "text": "8"}
        ],
        "correct_option": "A",
        "explanation": "Tracing LIFO stack operations:\n1. Push(5) -> [5]\n2. Push(8) -> [5, 8]\n3. Pop() -> removes 8, leaves [5]\n4. Push(12) -> [5, 12]\n5. Push(15) -> [5, 12, 15]\n6. Pop() -> removes 15, leaves [5, 12]. Top element is 12.",
        "option_misconceptions": {
            "C": "stack_fifo_confusion",
            "B": "stack_push_pop_pointer"
        }
    },
    {
        "id": "q_stack_02",
        "concept_id": "stacks",
        "difficulty": "intermediate",
        "is_diagnostic": False,
        "question_text": "When implementing a bounded stack using a fixed-size array of capacity C, what critical validation must occur before executing a push operation?",
        "options": [
            {"id": "A", "text": "Verify top < C - 1 (or size < C) to prevent stack overflow"},
            {"id": "B", "text": "Verify top > 0 to prevent stack underflow"},
            {"id": "C", "text": "Verify elements are in ascending sorted order"},
            {"id": "D", "text": "Re-allocate the entire memory block dynamically on every call"}
        ],
        "correct_option": "A",
        "explanation": "Pushing into a full stack causes Stack Overflow or out-of-bounds array access. Validating top < capacity - 1 ensures safe capacity boundaries.",
        "option_misconceptions": {
            "B": "stack_overflow_underflow"
        }
    },

    # --- 7. QUEUES ---
    {
        "id": "q_queue_01",
        "concept_id": "queues",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "In a circular queue implemented using an array of size 5 with front = 2 and rear = 4, where will the next enqueued element be placed?",
        "options": [
            {"id": "A", "text": "Index 0 (via (4 + 1) % 5 = 0)"},
            {"id": "B", "text": "Index 5 (triggering queue overflow)"},
            {"id": "C", "text": "Index 2"},
            {"id": "D", "text": "Index 3"}
        ],
        "correct_option": "A",
        "explanation": "Circular queues use modulo arithmetic: next_rear = (rear + 1) % size = (4 + 1) % 5 = 0. Since index 0 is free (front is at 2), wraparound occurs seamlessly.",
        "option_misconceptions": {
            "B": "queue_circular_wrap",
            "C": "queue_dequeue_end"
        }
    },

    # --- 8. SEARCHING ---
    {
        "id": "q_search_01",
        "concept_id": "searching",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "What fundamental precondition must an array satisfy before Binary Search can be applied to find a target value in O(log n) time?",
        "options": [
            {"id": "A", "text": "The array elements must be arranged in monotonic (sorted) order"},
            {"id": "B", "text": "The array must contain only positive integers"},
            {"id": "C", "text": "The array size must be an exact power of 2"},
            {"id": "D", "text": "The array must have no duplicate elements"}
        ],
        "correct_option": "A",
        "explanation": "Binary search divides the problem space by checking whether target is less than or greater than mid. This logic only holds if elements are sorted.",
        "option_misconceptions": {
            "C": "binary_search_unsorted",
            "D": "binary_search_unsorted"
        }
    },

    # --- 9. SORTING ---
    {
        "id": "q_sort_01",
        "concept_id": "sorting",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "What does it mean for a sorting algorithm to be 'stable'?",
        "options": [
            {"id": "A", "text": "Elements with equal keys retain their original relative order after sorting"},
            {"id": "B", "text": "The algorithm executes in O(n log n) time on all inputs without crashing"},
            {"id": "C", "text": "The algorithm uses O(1) auxiliary memory space"},
            {"id": "D", "text": "The algorithm does not modify the original array"}
        ],
        "correct_option": "A",
        "explanation": "A sorting algorithm is stable if duplicates preserve their input order. For instance, if item X appears before item Y and X.key == Y.key, X will still precede Y in the sorted output.",
        "option_misconceptions": {
            "B": "sorting_stability_confusion",
            "C": "space_auxiliary_vs_input"
        }
    },

    # --- 10. TREES ---
    {
        "id": "q_tree_01",
        "concept_id": "trees",
        "difficulty": "novice",
        "is_diagnostic": True,
        "question_text": "In which tree traversal order is a node visited AFTER all of its descendants in both left and right subtrees have been visited?",
        "options": [
            {"id": "A", "text": "Post-order traversal (Left, Right, Root)"},
            {"id": "B", "text": "Pre-order traversal (Root, Left, Right)"},
            {"id": "C", "text": "In-order traversal (Left, Root, Right)"},
            {"id": "D", "text": "Level-order traversal (Breadth-first)"}
        ],
        "correct_option": "A",
        "explanation": "Post-order traverses the left subtree, then right subtree, and finally visits the root node. It is naturally suited for bottom-up tasks like calculating tree height or deleting nodes.",
        "option_misconceptions": {
            "B": "tree_traversal_order_swap",
            "C": "tree_traversal_order_swap"
        }
    },

    # --- 11. BINARY TREES ---
    {
        "id": "q_bt_01",
        "concept_id": "binary_trees",
        "difficulty": "intermediate",
        "is_diagnostic": True,
        "question_text": "Consider a tree with Root = 20. Root.left = 10 and Root.right = 30. Then Root.right.left is set to 15. Does this tree satisfy the Binary Search Tree (BST) property?",
        "options": [
            {"id": "A", "text": "No, because 15 is in the right subtree of 20, but 15 < 20, violating the global BST ancestor invariant"},
            {"id": "B", "text": "Yes, because 15 < 30 locally at node 30"},
            {"id": "C", "text": "Yes, because 15 > 10"},
            {"id": "D", "text": "No, because node 20 must have degree 3"}
        ],
        "correct_option": "A",
        "explanation": "In a BST, every node in the right subtree of root must be greater than root. Since 15 < 20, placing 15 in the right subtree violates the BST property despite being locally less than 30.",
        "option_misconceptions": {
            "B": "bst_ancestor_constraint_violation"
        }
    },

    # --- 12. GRAPHS ---
    {
        "id": "q_graph_01",
        "concept_id": "graphs",
        "difficulty": "intermediate",
        "is_diagnostic": True,
        "question_text": "Why must Depth-First Search (DFS) or Breadth-First Search (BFS) maintain a 'visited' set when traversing general graphs, unlike binary trees?",
        "options": [
            {"id": "A", "text": "Graphs can contain cycles; without a visited tracker, traversal can loop infinitely"},
            {"id": "B", "text": "Because graphs have more vertices than edges"},
            {"id": "C", "text": "Because vertices are not stored in contiguous memory"},
            {"id": "D", "text": "Graphs require recursion while trees do not"}
        ],
        "correct_option": "A",
        "explanation": "Trees are acyclic connected graphs by definition. General graphs may contain cycles (e.g. A -> B -> C -> A). Tracking visited nodes prevents infinite cycling.",
        "option_misconceptions": {
            "B": "graph_cycle_visited_omission",
            "D": "graph_cycle_visited_omission"
        }
    }
]

def get_diagnostic_questions() -> List[Dict[str, Any]]:
    return [q for q in QUESTION_BANK if q.get("is_diagnostic")]

def get_questions_for_concept(concept_id: str, difficulty: str = None) -> List[Dict[str, Any]]:
    questions = [q for q in QUESTION_BANK if q["concept_id"] == concept_id]
    if difficulty:
        filtered = [q for q in questions if q["difficulty"] == difficulty]
        return filtered if filtered else questions
    return questions

def get_question_by_id(question_id: str) -> Dict[str, Any]:
    for q in QUESTION_BANK:
        if q["id"] == question_id:
            return q
    return {}
