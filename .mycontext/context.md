# My Project - Context

## Overview
The UI displays a live standings screen for a game, likely a sports or esports competition.  The user can see the current match score at the top, followed by a ranked list of players. The user's own rank is highlighted for easy visibility.  The user flow is straightforward: view the standings and potentially 'Jump to Me' to see their own position more easily.  The design uses a dark theme with vibrant accent colors to highlight key information. The 'Updating' indicator and the live match status (LIVE 78') suggest that the application receives real-time data. The design emphasizes clarity and easy readability, with clear typography and sufficient spacing between elements.

## Component Breakdown

### Back Button
**Type**: Button
**Description**: Navigates to the previous screen.
**Hierarchy**: Header > Button

### Title
**Type**: Text
**Description**: Displays the screen title: 'BAO! ARENA'
**Hierarchy**: Header > Text

### Notification Icon
**Type**: Icon
**Description**: Displays a notification icon.
**Hierarchy**: Header > Icon

### Match Card
**Type**: Card
**Description**: Displays the match information including team logos (ARS, CHE), scores (2-1), team names (ARSENAL, CHELSEA), and live status (LIVE 78').
**Hierarchy**: Body > Card

### Team Logo (ARS)
**Type**: Image
**Description**: The Arsenal team logo.
**Hierarchy**: Match Card > Image

### Team Logo (CHE)
**Type**: Image
**Description**: The Chelsea team logo.
**Hierarchy**: Match Card > Image

### Scoreboard
**Type**: Text
**Description**: Score display: 2 - 1
**Hierarchy**: Match Card > Text

### Live Status
**Type**: Text
**Description**: Indicates the match is live with the current minute (LIVE • 78').
**Hierarchy**: Match Card > Text

### Section Title
**Type**: Text
**Description**: Displays the title 'LIVE STANDINGS'.
**Hierarchy**: Body > Text

### Updating Indicator
**Type**: Text with Icon
**Description**: Indicates that the standings are updating with a small green dot.
**Hierarchy**: Body > Text

### Rank Card
**Type**: Card
**Description**: Displays the rank, user profile, name, tier, and score of a player in the standings.
**Hierarchy**: Body > List > Card

### Rank Number
**Type**: Text
**Description**: The numerical rank of the player (1, 2, 3, etc.).
**Hierarchy**: Rank Card > Text

### User Avatar
**Type**: Image
**Description**: The player's profile picture.
**Hierarchy**: Rank Card > Image

### User Name
**Type**: Text
**Description**: The player's username (e.g., STRIKER_99).
**Hierarchy**: Rank Card > Text

### User Tier
**Type**: Text
**Description**: The player's tier (e.g., DIAMOND TIER).
**Hierarchy**: Rank Card > Text

### User Score
**Type**: Text
**Description**: The player's score in points (e.g., 1,450 pts).
**Hierarchy**: Rank Card > Text

### Highlighted Rank Card
**Type**: Card
**Description**: A highlighted card representing the current user's rank and score.
**Hierarchy**: Body > List > Card

### Rank Indicator
**Type**: Text with Icon
**Description**: Shows the user that he is moving up.
**Hierarchy**: Rank Card > Text

### Rank Summary
**Type**: Card
**Description**: A card showing your rank and score.
**Hierarchy**: Body > Card

### Jump to Me Button
**Type**: Button
**Description**: Button to go to your rank.
**Hierarchy**: Body > Card


## Design System

### Colors
- **primary**: #00C2FF
- **secondary**: #9D16FF
- **background**: #121E24
- **text**: #FFFFFF
- **accent**: #FFC107

### Typography
- **Headings**: Arial, 20px, Bold
- **Body**: Arial, 14px, Normal
- **Font Families**: Arial, Sans-serif

### Spacing
- **Base Unit**: 8px
- **Scale**: 4px, 8px, 16px, 24px, 32px

## Layout
**Type**: Flexbox
**Structure**: Single column layout with header, content, and footer sections. The content section uses a list structure for displaying the standings. The overall layout is vertically oriented.
**Breakpoints**: mobile: 320px, tablet: 768px, desktop: 1024px

## Recommended Tech Stack
- React Native
- Styled Components
- TypeScript

**Reasoning**: React Native is suitable for building cross-platform mobile applications. Styled Components provide a way to manage component-level styles, and TypeScript adds type safety and improves code maintainability.  Given the design is relatively simple in terms of custom animations/transitions, and the requirement to be performant, React Native is more suitable than Flutter.  If web support were a high priority from the start, React + Tailwind would be the choice.

## Implementation Guidelines

1. **Component Structure**: Follow the hierarchy outlined above
2. **Styling**: Use the design system tokens for consistent styling
3. **Responsiveness**: Implement breakpoints as specified
4. **Accessibility**: Ensure all interactive elements are keyboard accessible and have proper ARIA labels
5. **Performance**: Optimize images and lazy-load components where appropriate
