import streamlit as st

class QuiddlerExpanders:
    """Class to handle all expandable information sections for Quiddler app."""
    
    def __init__(self):
        pass
    
    def render_calculator_instructions(self):
        """Render calculator usage instructions."""
        with st.expander("🧮 Calculator Instructions"):
            st.markdown("""
            ### How to Use This Calculator
            
            **Basic Usage:**
            - Enter mathematical expressions in the input field
            - Click "Calculate" or press Enter to compute the result
            - The result will appear below the input
            
            **Supported Operations:**
            - Addition: `+` (e.g., `5 + 3`)
            - Subtraction: `-` (e.g., `10 - 4`)
            - Multiplication: `*` (e.g., `6 * 7`)
            - Division: `/` (e.g., `15 / 3`)
            - Exponentiation: `**` (e.g., `2**3` for 2³)
            - Parentheses: `()` for grouping (e.g., `(5 + 3) * 2`)
            
            **Scoring Examples:**
            - Calculate word score: `3 + 1 + 2 + 5` (for "CARD")
            - Add bonuses: `word_total + 10` (longest word bonus)
            - Round total: `(word1 + word2 + word3) + bonuses`
            """)
    
    def render_game_overview(self):
        """Render basic game overview."""
        with st.expander("🎯 Game Overview"):
            st.markdown("""
            ### Quiddler Quick Facts
            
            **Players:** 1 to 8 • **Ages:** 8 to adult
            
            **Object:** Obtain the highest number of points by combining cards into words
            
            **Game Structure:**
            - 10 rounds total
            - Round 1: 3 cards each
            - Round 2: 4 cards each
            - Each round adds 1 more card
            - Final round: 10 cards each
            
            **The Deck:** 118 cards with letters A-Z plus special cards (QU, IN, ER, TH, CL)
            """)
    
    def render_gameplay_rules(self):
        """Render core gameplay rules."""
        with st.expander("🎮 How to Play"):
            st.markdown("""
            ### Basic Gameplay
            
            **Each Turn:**
            1. Draw a card (from deck or discard pile)
            2. Arrange cards into words
            3. Discard one card to end turn
            
            **Going Out:**
            - Use ALL cards in your hand to make words (except one to discard)
            - Can only go out on your turn
            - Once someone goes out, others get one final turn
            
            **Word Rules:**
            - Minimum 2 cards per word
            - No proper nouns, prefixes, suffixes, abbreviations, or hyphenated words
            - Choose your dictionary before starting
            - Words can be challenged if questionable
            """)
    
    def render_scoring_rules(self):
        """Render scoring system."""
        with st.expander("📊 Scoring System"):
            st.markdown("""
            ### How Scoring Works
            
            **Basic Scoring:**
            - Cards used in words = Points FOR you
            - Unused cards = Points AGAINST you
            - Minimum score per round is 0 (can't go negative)
            
            **Bonuses (10 points each):**
            - **Most Words:** Player with most words in the round
            - **Longest Word:** Player with word using most letters
            - Same player can win both bonuses
            - No bonus awarded if there's a tie
            - *Note: With 2 players, use only one bonus*
            
            **Final Score:** Highest total after 10 rounds wins
            """)
    
    def render_challenges_tips(self):
        """Render challenge rules and strategy tips."""
        with st.expander("⚡ Challenges & Strategy"):
            st.markdown("""
            ### Word Challenges
            
            **Challenge Process:**
            - Any player can challenge a word after it's played
            - Check dictionary to resolve
            - **If word is valid:** Challenger loses points equal to word value
            - **If word is invalid:** Player loses points equal to word value
            
            ### Strategy Tips
            
            **Word Strategy:**
            - Early rounds: Focus on using all cards
            - Later rounds: Consider longer words vs. more words
            - Watch for bonus opportunities (most words/longest word)
            
            **Scoring Strategy:**
            - High-value letters (Q, Z, X, J) are worth big points but risky
            - Consider keeping common letters for easier word formation
            - Balance between going out first vs. maximizing points
            """)
    
    def render_card_reference(self):
        """Render card values and frequency reference."""
        with st.expander("🃏 Card Reference"):
            st.markdown("### Complete Letter Values & Deck Quantities")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.markdown("""
                **2 Points:**
                - A (10 cards), I (8 cards), O (8 cards)
                
                **3 Points:**
                - L (4 cards), N (6 cards), R (6 cards), S (4 cards), T (6 cards), U (6 cards)
                
                **4 Points:**
                - Y (4 cards)
                
                **5 Points:**
                - D (4 cards), M (2 cards)
                """)
            
            with col2:
                st.markdown("""
                **6 Points:**
                - F (2 cards), G (4 cards), P (2 cards)
                
                **7 Points:**
                - H (2 cards)
                
                **8 Points:**
                - B (2 cards), K (2 cards)
                
                **10 Points:**
                - W (2 cards)
                """)
            
            with col3:
                st.markdown("""
                **11 Points:**
                - V (2 cards)
                
                **12 Points:**
                - E (12 cards), X (2 cards)
                
                **13 Points:**
                - J (2 cards)
                
                **14 Points:**
                - Z (2 cards)
                
                **15 Points:**
                - C (2 cards), Q (2 cards)
                """)
            
            st.markdown("---")
            st.markdown("""
            **Special Double-Letter Cards:**
            - ER (7 pts, 2 cards)
            - IN (7 pts, 2 cards) 
            - TH (9 pts, 2 cards)
            - QU (9 pts, 2 cards)
            - CL (10 pts, 2 cards)
            
            **Total Deck:** 118 cards
            """)
    
    def render_letter_values(self):
        """Render simplified letter values for quick reference."""
        with st.expander("📝 Quick Letter Lookup"):
            st.markdown("### Letter Values for Quick Scoring")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown("""
                **Low Value (2-4 pts):**
                - A, I, O (2 pts)
                - L, N, R, S, T, U (3 pts)
                - Y (4 pts)
                """)
            
            with col2:
                st.markdown("""
                **Medium Value (5-8 pts):**
                - D, M (5 pts)
                - F, G, P (6 pts)
                - H (7 pts)
                - B, K (8 pts)
                """)
            
            with col3:
                st.markdown("""
                **High Value (10-13 pts):**
                - W (10 pts)
                - V (11 pts)
                - E, X (12 pts)
                - J (13 pts)
                """)
            
            with col4:
                st.markdown("""
                **Highest Value (14-15 pts):**
                - Z (14 pts)
                - C, Q (15 pts)
                
                **Special Cards:**
                - ER, IN (7 pts)
                - TH, QU (9 pts)
                - CL (10 pts)
                """)

    
    def render_all_expanders(self):
        """Render all expander sections in logical order."""
        # Calculator-specific instructions first
        self.render_calculator_instructions()
        
        # Game information sections
        self.render_game_overview()
        self.render_gameplay_rules()
        self.render_scoring_rules()
        self.render_challenges_tips()
        
        # Quick reference materials
        self.render_letter_values()
        self.render_card_reference()
