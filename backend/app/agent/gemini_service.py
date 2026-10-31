import os
import json
import httpx
from typing import Dict, Any, List, Optional
from app.dsa.syllabus import DSA_CONCEPTS
from app.dsa.misconceptions import MISCONCEPTION_CATALOG

class GeminiTutorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def is_ai_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_tutor_response(
        self,
        student_query: str,
        cleaned_query: str,
        learner_context: Dict[str, Any],
        recent_misconception: Optional[str] = None
    ) -> str:
        """Generate pedagogical tutor response using Gemini API with deterministic fallback."""
        if not self.is_ai_configured():
            return self.deterministic_tutor_fallback(cleaned_query, learner_context, recent_misconception)

        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        category = learner_context.get("learner_category", "Student")
        pref_lang = learner_context.get("preferred_language", "Python")
        goals = ", ".join(learner_context.get("primary_goals", [])) or "DSA Mastery"
        prefs = ", ".join(learner_context.get("learning_preferences", [])) or "Standard"
        verified_lvl = learner_context.get("verified_level", 1)

        system_instruction = (
            "You are LearnLoop AI, an elite adaptive computer science tutor specialized in Data Structures and Algorithms. "
            "Tagline: 'Don't just learn the answers. Master the concepts.'\n"
            f"Personalization target: You are tutoring a {category} (Proficiency Level {verified_lvl}) whose preferred language is {pref_lang}.\n"
            f"Their primary goals are: {goals}. Their preferred learning styles: {prefs}.\n"
            "Your goal is to guide students to conceptual mastery using the Socratic method.\n"
            "Rules:\n"
            "1. When answering, focus on underlying memory invariants, pointers, or asymptotic mechanics.\n"
            "2. If the student has a recent misconception, gently help them resolve it without shaming them.\n"
            "3. If their input contained conversational speech fillers or digressions, acknowledge them warmly but focus on the DSA core.\n"
            f"4. Provide code snippets in {pref_lang} when illustrating examples.\n"
            "5. Keep explanations concise, clear, and structured with bullet points or brief code snippets when helpful."
        )

        prompt = f"""
Student Profile Context:
- Learner Category: {category}
- Proficiency Level: Level {verified_lvl}
- Primary Language: {pref_lang}
- Overall Mastery: {learner_context.get('overall_mastery', 0)}%
- Weakest Concept: {learner_context.get('weakest_concept', 'None')}
- Recent Misconception: {recent_misconception or 'None'}

Student Dictated Query (Cleaned):
"{cleaned_query}"

Respond as the LearnLoop AI tutor directly to the student:
"""

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    endpoint,
                    json={
                        "contents": [{"parts": [{"text": system_instruction + "\n\n" + prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text:
                        return text
        except Exception as e:
            print(f"[GeminiTutorService] Fallback engaged due to error: {e}")

        return self.deterministic_tutor_fallback(cleaned_query, learner_context, recent_misconception)

    def execute_tutor_action(
        self,
        concept_id: str,
        action_type: str,
        recent_misconception: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute interactive Socratic tutor actions:
        - hint
        - analogy
        - worked_example
        - socratic_challenge
        - solution
        """
        c_info = DSA_CONCEPTS.get(concept_id, DSA_CONCEPTS["arrays"])
        c_name = c_info["name"]

        HINTS = {
            "stacks": "Remember: push and pop operate strictly on the top element. The last element added is the first one available.",
            "queues": "A queue enforces fairness: the first element enqueued at the back is the first to be dequeued from the front.",
            "linked_lists": "Before updating any pointer (e.g. curr.next = prev), store the original next node in a temporary reference.",
            "binary_trees": "A BST's ordering constraint is global: every node in the left subtree must be < root, and every node in the right subtree must be > root.",
            "recursion": "Identify your base case first. Without an explicit stopping condition, recursion will consume stack frames until memory runs out.",
            "searching": "Binary search divides the candidate search space in half at each step, but it strictly requires sorted order.",
            "sorting": "Stability means elements with duplicate keys maintain their original relative sequence after sorting.",
            "time_complexity": "Count how many times the innermost statement executes as n grows. Halving the problem size indicates O(log n).",
            "space_complexity": "Do not count the input array towards auxiliary space; count only newly allocated data structures and call stack depth.",
            "arrays": "Arrays provide O(1) random indexing because contiguous memory allows calculating address = base + index * element_size.",
            "trees": "Pre-order visits the root first, In-order visits root between left and right, Post-order visits root last.",
            "graphs": "Unlike trees, graphs may contain cycles. Always maintain a visited set to avoid infinite loops during traversal."
        }

        ANALOGIES = {
            "stacks": "🥞 **Pancake Stack**: You stack pancakes on top of each other. You cannot eat the bottom pancake first without taking all the top pancakes off.",
            "queues": "🎟️ **Movie Ticket Line**: The first person to arrive at the ticket counter is served first. Cutting ahead violates FIFO order.",
            "linked_lists": "🚂 **Train Cars**: Each car is linked by a coupler to the next car. If you decouple car 2 without securing car 3, car 3 rolls away.",
            "binary_trees": "🧭 **Postal Zip Codes**: Every branch narrows the region. You cannot place a California address in the New York branch simply because the house number is small.",
            "recursion": "🪆 **Russian Nesting Dolls**: Open each doll to find a smaller one inside. When you reach the solid baby doll (base case), you assemble them back up.",
            "searching": "📖 **Dictionary Search**: Looking up 'Tree'? Open to the middle; if you see 'P', flip forward; if 'W', flip back.",
            "sorting": "🃏 **Sorting a Hand of Cards**: Moving cards one by one into order while preserving which of two identical Jacks came first (stability).",
            "time_complexity": "🚗 **Travel Scaling**: A highway commute where adding passengers doesn't slow down the car (O(1)) vs city traffic that slows linearly with cars (O(n)).",
            "space_complexity": "🎒 **Backpack Packing**: Your backpack weight during a hike. The map you brought is the input; extra snacks you buy on the way are auxiliary space.",
            "arrays": "🏢 **Apartment Mailboxes**: Numbered 0 to 99 in a neat row. Knowing mailbox #42 lets the mail carrier reach it immediately without checking 0 to 41.",
            "trees": "🌳 **Company Hierarchy**: CEO at the root, VPs as children, managers below them. Communication flows strictly up and down branches.",
            "graphs": "🗺️ **Airline Flight Map**: Cities connected by flights. You can loop back to your starting city, so you need a passport stamp (visited set)."
        }

        WORKED_EXAMPLES = {
            "stacks": "```python\n# Stack LIFO Demonstration\nstack = []\nstack.append('A')  # push\nstack.append('B')  # push\nprint(stack.pop()) # returns 'B' (Last-In, First-Out!)\n```",
            "queues": "```python\n# Queue FIFO Demonstration\nfrom collections import deque\nq = deque()\nq.append('A')      # enqueue\nq.append('B')      # enqueue\nprint(q.popleft()) # returns 'A' (First-In, First-Out!)\n```",
            "linked_lists": "```python\n# Safe In-Place Node Insertion\n# Insert newNode between curr and curr.next\ntemp = curr.next    # 1. Save reference\ncurr.next = newNode # 2. Connect curr to new\nnewNode.next = temp # 3. Connect new to rest\n```",
            "binary_trees": "```python\n# BST Range Validation (Global Ancestor Constraints)\ndef is_valid_bst(node, low=-float('inf'), high=float('inf')):\n    if not node: return True\n    if not (low < node.val < high): return False\n    return is_valid_bst(node.left, low, node.val) and is_valid_bst(node.right, node.val, high)\n```",
            "recursion": "```python\n# Factorial with explicit base case\ndef fact(n):\n    if n <= 1: return 1   # Base Case prevents StackOverflow\n    return n * fact(n - 1) # Recursive Step\n```",
            "searching": "```python\n# Binary Search on Sorted Array\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = low + (high - low) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1\n```",
            "sorting": "```python\n# Merge Sort (Stable Divide-and-Conquer)\ndef merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right) # Stable merge\n```",
            "time_complexity": "```python\n# O(log n) Halving Loop\ni = n\nwhile i > 1:\n    i = i // 2 # Multiplies or divides -> log2(n) iterations\n```",
            "space_complexity": "```python\n# O(n) Auxiliary Space vs O(1) in-place\n# In-place reverse: O(1) auxiliary space\ndef reverse_inplace(arr):\n    l, r = 0, len(arr) - 1\n    while l < r:\n        arr[l], arr[r] = arr[r], arr[l]\n        l += 1; r -= 1\n```",
            "arrays": "```python\n# O(1) Address Arithmetic\n# address = base_address + index * 4 bytes\nval = arr[3] # Direct memory jump in constant time\n```",
            "trees": "```python\n# In-order Traversal (Left, Root, Right)\ndef inorder(root):\n    if root:\n        inorder(root.left)\n        print(root.val)\n        inorder(root.right)\n```",
            "graphs": "```python\n# BFS with Visited Set\ndef bfs(graph, start):\n    visited = {start}\n    queue = [start]\n    while queue:\n        curr = queue.pop(0)\n        for neighbor in graph[curr]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n```"
        }

        SOCRATIC_CHALLENGES = {
            "stacks": "If you push items 1, 2, 3 into a stack, and then perform two pop operations followed by pushing 4, what element is currently at the top?",
            "queues": "If a circular queue has capacity 5 and rear is at index 4, what index should rear become on the next enqueue?",
            "linked_lists": "What happens if you run `curr.next = curr.next.next` on the last node of a linked list?",
            "binary_trees": "Suppose the root of a BST is 25, and its right child is 35. Can a node in 35's left subtree have value 20? Why or why not?",
            "recursion": "What would happen if your recursive call was `return fact(n)` instead of `return n * fact(n - 1)`?",
            "searching": "Why can binary search NOT be used directly on a singly linked list even if its values are sorted?",
            "sorting": "Why is QuickSort generally faster in practice than MergeSort even though MergeSort has a guaranteed O(n log n) worst case?",
            "time_complexity": "What is the time complexity of two consecutive loops: one running n times and the second running n^2 times?",
            "space_complexity": "Does a recursive function with depth n use O(1) or O(n) auxiliary memory if it returns a single integer?",
            "arrays": "Why does inserting at the beginning of an array take O(n) time, but inserting at the end take O(1) amortized?",
            "trees": "In a binary search tree, which traversal visits all keys in strictly ascending sorted order?",
            "graphs": "Why can standard BFS find the shortest path in an unweighted graph, but fails on a graph with negative edge weights?"
        }

        EXPLAIN_SIMPLE = {
            "stacks": "🥞 **Stacks in plain English**: Put things on top, take things off the top. The item you put down *last* is the one you take off *first* (LIFO).",
            "queues": "🎟️ **Queues in plain English**: First come, first served. The first person to join the line gets served first (FIFO).",
            "linked_lists": "🔗 **Linked Lists in plain English**: Like a treasure hunt where every item contains a small piece of data and an arrow pointing to the next item in memory.",
            "binary_trees": "🌳 **BST in plain English**: At every fork in the road, numbers smaller than you go down the left path, and numbers bigger go down the right path.",
            "recursion": "🪞 **Recursion in plain English**: Solving a huge problem by having a function repeat itself on a tinier piece of the problem until it hits an easy stopping point (base case).",
            "searching": "🔍 **Searching in plain English**: Looking one-by-one (linear search) vs opening right to the middle of an alphabetically sorted dictionary (binary search).",
            "sorting": "🃏 **Sorting in plain English**: Arranging a messy deck of cards from lowest to highest, keeping identical cards in their original order (stability).",
            "time_complexity": "⏱️ **Time Complexity in plain English**: An estimate of how much slower an algorithm gets as the input size $n$ grows from 10 to 1,000,000.",
            "space_complexity": "📝 **Space Complexity in plain English**: How much extra scratchpad memory your algorithm needs while doing its work, beyond the input data.",
            "arrays": "🏢 **Arrays in plain English**: Numbered lockers right next to each other. You can jump straight to locker #42 instantly in O(1) time.",
            "trees": "👑 **Trees in plain English**: A hierarchy with one CEO at the top (root) and direct reports branching out underneath with no circular loops.",
            "graphs": "🗺️ **Graphs in plain English**: A network of cities and flight routes. Because you can fly in circles, you need to mark visited cities to avoid infinite loops."
        }

        if action_type == "hint":
            content = HINTS.get(concept_id, f"Focus on how {c_name} maintains its core structural invariants.")
        elif action_type == "analogy":
            content = ANALOGIES.get(concept_id, f"Think of {c_name} as an organized physical filing system.")
        elif action_type == "worked_example":
            content = WORKED_EXAMPLES.get(concept_id, "```python\n# Core concept trace\npass\n```")
        elif action_type in ["socratic_challenge", "challenge", "test_understanding"]:
            content = SOCRATIC_CHALLENGES.get(concept_id, f"How would {c_name} behave under edge-case inputs?")
        elif action_type in ["explain_simple", "simple", "explain_more_simply"]:
            content = EXPLAIN_SIMPLE.get(concept_id, f"**{c_name} simply**: Core foundational building block in introductory DSA.")
        elif action_type == "solution":
            content = (
                f"**Full Concept Breakdown for {c_name}**:\n\n"
                f"{c_info['description']}\n\n"
                f"**Key Mechanics**:\n"
                + "\n".join([f"- {st}" for st in c_info.get("key_subtopics", [])]) +
                f"\n\n**Best Practice**: Review prerequisite relationships and verify invariants with small test inputs."
            )
        else:
            content = f"Guidance for {c_name}: Review core principles and attempt an adaptive practice question."

        return {
            "concept_id": concept_id,
            "concept_name": c_name,
            "action_type": action_type,
            "content": content
        }

    def deterministic_tutor_fallback(
        self,
        query: str,
        learner_context: Dict[str, Any],
        recent_misconception: Optional[str] = None
    ) -> str:
        """Deterministic rule-based pedagogical response engine for 100% offline functionality."""
        q_lower = query.lower()
        weak_concept = learner_context.get("weakest_concept", "arrays")

        # Check if query matches a known DSA concept
        matched_concept = None
        for cid, cdata in DSA_CONCEPTS.items():
            if cid in q_lower or cdata["name"].lower() in q_lower:
                matched_concept = cid
                break

        target_concept = matched_concept or weak_concept
        c_info = DSA_CONCEPTS.get(target_concept, DSA_CONCEPTS["arrays"])

        # Check if recent misconception is relevant
        m_advice = ""
        if recent_misconception and recent_misconception in MISCONCEPTION_CATALOG:
            m_data = MISCONCEPTION_CATALOG[recent_misconception]
            m_advice = f"\n\n💡 **Focus Insight on {m_data['name']}**:\n{m_data['remediation_tip']}\n"

        response = (
            f"Hello! I am your **LearnLoop AI** tutor. Let's look closely at **{c_info['name']}**.\n\n"
            f"**Core Concept**: {c_info['description']}\n\n"
            f"**Key Invariants to Remember**:\n"
            + "\n".join([f"- {st}" for st in c_info.get("key_subtopics", [])[:3]])
            + m_advice +
            f"\n\nWould you like an adaptive practice question on {c_info['name']}, or shall we walk through an illustrative code trace together?"
        )
        return response

gemini_tutor = GeminiTutorService()
