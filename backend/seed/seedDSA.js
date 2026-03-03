/**
 * seed/seedDSA.js — Seeds DSA Sheet data: 3 levels × 5 topics × 10 problems
 * Run: node seed/seedDSA.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DSALevel, MonthlyFocus, BatchGuidance } from '../models/DSA.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placemate';

const TOPICS = {
    1: [
        {
            name: 'Arrays & Hashing',
            problems: [
                { title: 'Two Sum', link: 'https://leetcode.com/problems/two-sum/', resourceLink: 'https://youtu.be/KLlXCFG5TnA', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Contains Duplicate', link: 'https://leetcode.com/problems/contains-duplicate/', resourceLink: 'https://youtu.be/3OamzN90kPg', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Valid Anagram', link: 'https://leetcode.com/problems/valid-anagram/', resourceLink: 'https://youtu.be/9UtInBqnCgA', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Group Anagrams', link: 'https://leetcode.com/problems/group-anagrams/', resourceLink: 'https://youtu.be/vzdNOK2oB2E', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Top K Frequent Elements', link: 'https://leetcode.com/problems/top-k-frequent-elements/', resourceLink: 'https://youtu.be/YPTqKIgVk-k', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Product of Array Except Self', link: 'https://leetcode.com/problems/product-of-array-except-self/', resourceLink: 'https://youtu.be/bNvIQI2wAjk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Longest Consecutive Sequence', link: 'https://leetcode.com/problems/longest-consecutive-sequence/', resourceLink: 'https://youtu.be/P6RZZMu_maU', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Sort Colors', link: 'https://leetcode.com/problems/sort-colors/', resourceLink: 'https://youtu.be/tp8JIuCXBaU', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Majority Element', link: 'https://leetcode.com/problems/majority-element/', resourceLink: 'https://youtu.be/nP_ns3uSh80', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Maximum Subarray (Kadane)', link: 'https://leetcode.com/problems/maximum-subarray/', resourceLink: 'https://youtu.be/5WZl3MMT0Eg', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Two Pointers',
            problems: [
                { title: 'Valid Palindrome', link: 'https://leetcode.com/problems/valid-palindrome/', resourceLink: 'https://youtu.be/jn1KZ0S3sqM', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Two Sum II - Input Array Is Sorted', link: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/', resourceLink: 'https://youtu.be/cQ1Oz4ckceM', practiceLink: '#', difficulty: 'Medium' },
                { title: '3Sum', link: 'https://leetcode.com/problems/3sum/', resourceLink: 'https://youtu.be/jzZsG8n2R9A', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Container With Most Water', link: 'https://leetcode.com/problems/container-with-most-water/', resourceLink: 'https://youtu.be/UuiTKBwPgAo', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Trapping Rain Water', link: 'https://leetcode.com/problems/trapping-rain-water/', resourceLink: 'https://youtu.be/ZI2z5pq0TqA', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Move Zeroes', link: 'https://leetcode.com/problems/move-zeroes/', resourceLink: 'https://youtu.be/aayNRwUN3Do', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Remove Duplicates from Sorted Array', link: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Squares of a Sorted Array', link: 'https://leetcode.com/problems/squares-of-a-sorted-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Merge Sorted Array', link: 'https://leetcode.com/problems/merge-sorted-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Minimum Size Subarray Sum', link: 'https://leetcode.com/problems/minimum-size-subarray-sum/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Sliding Window',
            problems: [
                { title: 'Best Time to Buy and Sell Stock', link: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', resourceLink: 'https://youtu.be/1pkOgXD63yU', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Longest Substring Without Repeating Characters', link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', resourceLink: 'https://youtu.be/wiGpQwVHdE0', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Longest Repeating Character Replacement', link: 'https://leetcode.com/problems/longest-repeating-character-replacement/', resourceLink: 'https://youtu.be/gqXU1UyA8pk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Permutation in String', link: 'https://leetcode.com/problems/permutation-in-string/', resourceLink: 'https://youtu.be/UbyhOgBN834', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Minimum Window Substring', link: 'https://leetcode.com/problems/minimum-window-substring/', resourceLink: 'https://youtu.be/jSto0O4AJbM', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Sliding Window Maximum', link: 'https://leetcode.com/problems/sliding-window-maximum/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Fruit Into Baskets', link: 'https://leetcode.com/problems/fruit-into-baskets/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Subarray Sum Equals K', link: 'https://leetcode.com/problems/subarray-sum-equals-k/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Maximum Points You Can Obtain from Cards', link: 'https://leetcode.com/problems/maximum-points-you-can-obtain-from-cards/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Find All Anagrams in a String', link: 'https://leetcode.com/problems/find-all-anagrams-in-a-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Stack',
            problems: [
                { title: 'Valid Parentheses', link: 'https://leetcode.com/problems/valid-parentheses/', resourceLink: 'https://youtu.be/WTzjTskDFMg', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Min Stack', link: 'https://leetcode.com/problems/min-stack/', resourceLink: 'https://youtu.be/qkLl7nAwDPo', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Evaluate Reverse Polish Notation', link: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/', resourceLink: 'https://youtu.be/iu0082c4HDE', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Generate Parentheses', link: 'https://leetcode.com/problems/generate-parentheses/', resourceLink: 'https://youtu.be/s9fokUqJ76A', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Daily Temperatures', link: 'https://leetcode.com/problems/daily-temperatures/', resourceLink: 'https://youtu.be/cTBiBSnjO3c', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Car Fleet', link: 'https://leetcode.com/problems/car-fleet/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Largest Rectangle in Histogram', link: 'https://leetcode.com/problems/largest-rectangle-in-histogram/', resourceLink: 'https://youtu.be/zx5Sw9130L0', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Next Greater Element I', link: 'https://leetcode.com/problems/next-greater-element-i/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Next Greater Element II', link: 'https://leetcode.com/problems/next-greater-element-ii/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Decode String', link: 'https://leetcode.com/problems/decode-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Binary Search',
            problems: [
                { title: 'Binary Search', link: 'https://leetcode.com/problems/binary-search/', resourceLink: 'https://youtu.be/s4DPM8ct1pI', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Search a 2D Matrix', link: 'https://leetcode.com/problems/search-a-2d-matrix/', resourceLink: 'https://youtu.be/Ber2pi2C0j0', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Koko Eating Bananas', link: 'https://leetcode.com/problems/koko-eating-bananas/', resourceLink: 'https://youtu.be/U2SozAs9RzA', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Find Minimum in Rotated Sorted Array', link: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', resourceLink: 'https://youtu.be/nIVW4P8b1VA', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Search in Rotated Sorted Array', link: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', resourceLink: 'https://youtu.be/U8XENwh8Oy8', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Time Based Key-Value Store', link: 'https://leetcode.com/problems/time-based-key-value-store/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Median of Two Sorted Arrays', link: 'https://leetcode.com/problems/median-of-two-sorted-arrays/', resourceLink: 'https://youtu.be/q6IEA26hvXc', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Find First and Last Position of Element in Sorted Array', link: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Peak Index in a Mountain Array', link: 'https://leetcode.com/problems/peak-index-in-a-mountain-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Allocate Books (Painter Partition)', link: 'https://www.geeksforgeeks.org/allocate-minimum-number-pages/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
    ],
    2: [
        {
            name: 'Linked List',
            problems: [
                { title: 'Reverse Linked List', link: 'https://leetcode.com/problems/reverse-linked-list/', resourceLink: 'https://youtu.be/G0_I-ZF0S38', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Merge Two Sorted Lists', link: 'https://leetcode.com/problems/merge-two-sorted-lists/', resourceLink: 'https://youtu.be/XIdigk956u0', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Reorder List', link: 'https://leetcode.com/problems/reorder-list/', resourceLink: 'https://youtu.be/S5bfdUTrKLM', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Remove Nth Node From End of List', link: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/', resourceLink: 'https://youtu.be/XVuQxVej6y8', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Linked List Cycle', link: 'https://leetcode.com/problems/linked-list-cycle/', resourceLink: 'https://youtu.be/gBTe7lFR3vc', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Find the Duplicate Number', link: 'https://leetcode.com/problems/find-the-duplicate-number/', resourceLink: 'https://youtu.be/wjYnzkAhcNk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'LRU Cache', link: 'https://leetcode.com/problems/lru-cache/', resourceLink: 'https://youtu.be/7ABFKPK2hD4', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Merge k Sorted Lists', link: 'https://leetcode.com/problems/merge-k-sorted-lists/', resourceLink: 'https://youtu.be/q5a5OiGbT6Q', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Reverse Nodes in k-Group', link: 'https://leetcode.com/problems/reverse-nodes-in-k-group/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Palindrome Linked List', link: 'https://leetcode.com/problems/palindrome-linked-list/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
            ],
        },
        {
            name: 'Trees',
            problems: [
                { title: 'Invert Binary Tree', link: 'https://leetcode.com/problems/invert-binary-tree/', resourceLink: 'https://youtu.be/OnSn2XEQ4MY', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Maximum Depth of Binary Tree', link: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', resourceLink: 'https://youtu.be/hTM3phVI6YQ', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Diameter of Binary Tree', link: 'https://leetcode.com/problems/diameter-of-binary-tree/', resourceLink: 'https://youtu.be/bkxqA8Rfv04', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Balanced Binary Tree', link: 'https://leetcode.com/problems/balanced-binary-tree/', resourceLink: 'https://youtu.be/QfJsau0ItOY', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Same Tree', link: 'https://leetcode.com/problems/same-tree/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Subtree of Another Tree', link: 'https://leetcode.com/problems/subtree-of-another-tree/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Lowest Common Ancestor of BST', link: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', resourceLink: 'https://youtu.be/gs2LMfuOR9k', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Binary Tree Level Order Traversal', link: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', resourceLink: 'https://youtu.be/6ZnyEApgFYg', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Binary Tree Right Side View', link: 'https://leetcode.com/problems/binary-tree-right-side-view/', resourceLink: 'https://youtu.be/d4zLyf32e3I', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Validate Binary Search Tree', link: 'https://leetcode.com/problems/validate-binary-search-tree/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Heap / Priority Queue',
            problems: [
                { title: 'Kth Largest Element in a Stream', link: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Last Stone Weight', link: 'https://leetcode.com/problems/last-stone-weight/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'K Closest Points to Origin', link: 'https://leetcode.com/problems/k-closest-points-to-origin/', resourceLink: 'https://youtu.be/rI2EBUEMfTk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Kth Largest Element in an Array', link: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', resourceLink: 'https://youtu.be/XEmy13g1Qxc', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Task Scheduler', link: 'https://leetcode.com/problems/task-scheduler/', resourceLink: 'https://youtu.be/s8p8ukTyA2I', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Design Twitter', link: 'https://leetcode.com/problems/design-twitter/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Find Median from Data Stream', link: 'https://leetcode.com/problems/find-median-from-data-stream/', resourceLink: 'https://youtu.be/itssk8F_wdg', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Reorganize String', link: 'https://leetcode.com/problems/reorganize-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Meeting Rooms II', link: 'https://leetcode.com/problems/meeting-rooms-ii/', resourceLink: 'https://youtu.be/FdzJmTx9now', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Smallest Range Covering Elements from K Lists', link: 'https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
        {
            name: 'Graphs',
            problems: [
                { title: 'Number of Islands', link: 'https://leetcode.com/problems/number-of-islands/', resourceLink: 'https://youtu.be/pV2kpPD66nE', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Clone Graph', link: 'https://leetcode.com/problems/clone-graph/', resourceLink: 'https://youtu.be/mQeF6bN8hMk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Max Area of Island', link: 'https://leetcode.com/problems/max-area-of-island/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Pacific Atlantic Water Flow', link: 'https://leetcode.com/problems/pacific-atlantic-water-flow/', resourceLink: 'https://youtu.be/s-VIfLJdEo4', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Surrounded Regions', link: 'https://leetcode.com/problems/surrounded-regions/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Rotting Oranges', link: 'https://leetcode.com/problems/rotting-oranges/', resourceLink: 'https://youtu.be/y704fEOx0s0', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Course Schedule', link: 'https://leetcode.com/problems/course-schedule/', resourceLink: 'https://youtu.be/EgI5nU9etnU', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Course Schedule II', link: 'https://leetcode.com/problems/course-schedule-ii/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Word Ladder', link: 'https://leetcode.com/problems/word-ladder/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Number of Connected Components in an Undirected Graph', link: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Dynamic Programming – 1D',
            isFocusTopic: true,
            problems: [
                { title: 'Climbing Stairs', link: 'https://leetcode.com/problems/climbing-stairs/', resourceLink: 'https://youtu.be/Y0lT9Fck7qI', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Min Cost Climbing Stairs', link: 'https://leetcode.com/problems/min-cost-climbing-stairs/', resourceLink: 'https://youtu.be/ktmzAZWkEn0', practiceLink: '#', difficulty: 'Easy' },
                { title: 'House Robber', link: 'https://leetcode.com/problems/house-robber/', resourceLink: 'https://youtu.be/73r3KWiEvyk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'House Robber II', link: 'https://leetcode.com/problems/house-robber-ii/', resourceLink: 'https://youtu.be/rWAJCfYYOvM', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Longest Palindromic Substring', link: 'https://leetcode.com/problems/longest-palindromic-substring/', resourceLink: 'https://youtu.be/XYQecbcd6_c', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Palindromic Substrings', link: 'https://leetcode.com/problems/palindromic-substrings/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Decode Ways', link: 'https://leetcode.com/problems/decode-ways/', resourceLink: 'https://youtu.be/6aEyTjOwlJU', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Coin Change', link: 'https://leetcode.com/problems/coin-change/', resourceLink: 'https://youtu.be/H9bfqozjoqs', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Maximum Product Subarray', link: 'https://leetcode.com/problems/maximum-product-subarray/', resourceLink: 'https://youtu.be/lXVy6YWFcRM', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Word Break', link: 'https://leetcode.com/problems/word-break/', resourceLink: 'https://youtu.be/Sx9NNgInc3A', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
    ],
    3: [
        {
            name: 'Advanced DP – 2D',
            problems: [
                { title: 'Unique Paths', link: 'https://leetcode.com/problems/unique-paths/', resourceLink: 'https://youtu.be/IlEsdxuD4lY', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Longest Common Subsequence', link: 'https://leetcode.com/problems/longest-common-subsequence/', resourceLink: 'https://youtu.be/Ua0GhIs5Lr8', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Best Time to Buy and Sell Stock with Cooldown', link: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Coin Change 2', link: 'https://leetcode.com/problems/coin-change-ii/', resourceLink: 'https://youtu.be/Mjy4hd2xgrs', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Target Sum', link: 'https://leetcode.com/problems/target-sum/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Interleaving String', link: 'https://leetcode.com/problems/interleaving-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Longest Increasing Subsequence', link: 'https://leetcode.com/problems/longest-increasing-subsequence/', resourceLink: 'https://youtu.be/cjWnW0hdF1Y', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Edit Distance', link: 'https://leetcode.com/problems/edit-distance/', resourceLink: 'https://youtu.be/XJ6e4BQYJ24', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Distinct Subsequences', link: 'https://leetcode.com/problems/distinct-subsequences/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Burst Balloons', link: 'https://leetcode.com/problems/burst-balloons/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
        {
            name: 'Tries',
            problems: [
                { title: 'Implement Trie (Prefix Tree)', link: 'https://leetcode.com/problems/implement-trie-prefix-tree/', resourceLink: 'https://youtu.be/oobqoCJlHA0', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Design Add and Search Words Data Structure', link: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/', resourceLink: 'https://youtu.be/BTf05gs_8iU', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Word Search II', link: 'https://leetcode.com/problems/word-search-ii/', resourceLink: 'https://youtu.be/asbcE9mZz_U', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Longest Word in Dictionary', link: 'https://leetcode.com/problems/longest-word-in-dictionary/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Replace Words', link: 'https://leetcode.com/problems/replace-words/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Minimum XOR Sum of Two Arrays', link: 'https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Maximum XOR of Two Numbers in an Array', link: 'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Count Words Obtained After Adding a Letter', link: 'https://leetcode.com/problems/count-words-obtained-after-adding-a-letter/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Search Suggestions System', link: 'https://leetcode.com/problems/search-suggestions-system/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Count of Distinct Substrings', link: 'https://www.geeksforgeeks.org/count-of-distinct-substrings-of-a-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
        {
            name: 'Backtracking',
            problems: [
                { title: 'Subsets', link: 'https://leetcode.com/problems/subsets/', resourceLink: 'https://youtu.be/REOH22Xwdkk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Combination Sum', link: 'https://leetcode.com/problems/combination-sum/', resourceLink: 'https://youtu.be/GBKI9VSKdGg', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Permutations', link: 'https://leetcode.com/problems/permutations/', resourceLink: 'https://youtu.be/s7AvT7cGdSo', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Word Search', link: 'https://leetcode.com/problems/word-search/', resourceLink: 'https://youtu.be/pfiQ_PS1g8E', practiceLink: '#', difficulty: 'Medium' },
                { title: 'N-Queens', link: 'https://leetcode.com/problems/n-queens/', resourceLink: 'https://youtu.be/Ph95IHmRp5M', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Palindrome Partitioning', link: 'https://leetcode.com/problems/palindrome-partitioning/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Letter Combinations of a Phone Number', link: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Sudoku Solver', link: 'https://leetcode.com/problems/sudoku-solver/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
                { title: 'Combination Sum II', link: 'https://leetcode.com/problems/combination-sum-ii/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Expression Add Operators', link: 'https://leetcode.com/problems/expression-add-operators/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
        {
            name: 'Bit Manipulation',
            problems: [
                { title: 'Single Number', link: 'https://leetcode.com/problems/single-number/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Number of 1 Bits', link: 'https://leetcode.com/problems/number-of-1-bits/', resourceLink: 'https://youtu.be/5Km3utixwZs', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Counting Bits', link: 'https://leetcode.com/problems/counting-bits/', resourceLink: 'https://youtu.be/RyBM56RIWrM', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Reverse Bits', link: 'https://leetcode.com/problems/reverse-bits/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Missing Number', link: 'https://leetcode.com/problems/missing-number/', resourceLink: 'https://youtu.be/WnPLSRLSANE', practiceLink: '#', difficulty: 'Easy' },
                { title: 'Sum of Two Integers', link: 'https://leetcode.com/problems/sum-of-two-integers/', resourceLink: 'https://youtu.be/gVUrDV4tZfY', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Reverse Integer', link: 'https://leetcode.com/problems/reverse-integer/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Power of Two', link: 'https://leetcode.com/problems/power-of-two/', resourceLink: '#', practiceLink: '#', difficulty: 'Easy' },
                { title: 'XOR Queries of a Subarray', link: 'https://leetcode.com/problems/xor-queries-of-a-subarray/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Find the Duplicate Number (Bit)', link: 'https://leetcode.com/problems/find-the-duplicate-number/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
            ],
        },
        {
            name: 'Greedy & Advanced',
            problems: [
                { title: 'Maximum Subarray (Greedy)', link: 'https://leetcode.com/problems/maximum-subarray/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Jump Game', link: 'https://leetcode.com/problems/jump-game/', resourceLink: 'https://youtu.be/Yan0cv2cLy8', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Jump Game II', link: 'https://leetcode.com/problems/jump-game-ii/', resourceLink: 'https://youtu.be/7SBVnw7GSTk', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Gas Station', link: 'https://leetcode.com/problems/gas-station/', resourceLink: 'https://youtu.be/lJwbPZGo05A', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Hand of Straights', link: 'https://leetcode.com/problems/hand-of-straights/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Merge Triplets to Form Target Triplet', link: 'https://leetcode.com/problems/merge-triplets-to-form-target-triplet/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Partition Labels', link: 'https://leetcode.com/problems/partition-labels/', resourceLink: 'https://youtu.be/B7m8UmZE-vw', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Valid Parenthesis String', link: 'https://leetcode.com/problems/valid-parenthesis-string/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Minimum Number of Arrows to Burst Balloons', link: 'https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/', resourceLink: '#', practiceLink: '#', difficulty: 'Medium' },
                { title: 'Candy', link: 'https://leetcode.com/problems/candy/', resourceLink: '#', practiceLink: '#', difficulty: 'Hard' },
            ],
        },
    ],
};

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.\n');

    // Clear existing data
    await DSALevel.deleteMany({});
    await MonthlyFocus.deleteMany({});
    await BatchGuidance.deleteMany({});
    console.log('🗑️  Cleared existing DSA data.\n');

    // Seed levels
    for (const [lvl, topics] of Object.entries(TOPICS)) {
        const levelNum = parseInt(lvl);
        const topicsWithOrder = topics.map((topic, ti) => ({
            ...topic,
            order: ti,
            problems: topic.problems.map((p, pi) => ({ ...p, order: pi })),
        }));
        await DSALevel.create({ level: levelNum, topics: topicsWithOrder });
        console.log(`✅ Level ${levelNum} seeded — ${topics.length} topics, ${topics.reduce((a, t) => a + t.problems.length, 0)} problems`);
    }

    // Seed monthly focus (Level 2 / Dynamic Programming topic)
    const level2 = await DSALevel.findOne({ level: 2 });
    const dpTopic = level2?.topics.find(t => t.name.includes('Dynamic Programming'));
    if (dpTopic) {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 12);
        await MonthlyFocus.create({
            topicId: dpTopic._id,
            topicName: dpTopic.name,
            levelId: 2,
            endsAt,
            active: true,
        });
        console.log(`\n⭐ Monthly Focus set: "${dpTopic.name}" → ends in 12 days`);
    }

    // Seed batch guidance
    await BatchGuidance.create([
        { batch: 'default', guidance: 'Your batch focus: Complete Level 2 by end of 3-1 semester' },
        { batch: '2022-2026', guidance: 'Your batch focus: Complete Level 2 by end of 3-1 semester' },
        { batch: '2021-2025', guidance: 'Your batch focus: Finish Level 3 before placement season begins' },
    ]);
    console.log('✅ Batch guidance seeded.');

    console.log('\n🎉 DSA Seed complete!');
    process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
