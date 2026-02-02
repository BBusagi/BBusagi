# agents.md
Project: Monday Chat
Scope: Visual Character + Text Interaction

---

## 0. Overall Goal

Build a **POC-level AI-driven interactive character system** where:

- Monday appears as a **cyber-neon bartender**
- Interaction is **text-only**
- Personality is **toxic-sarcastic, restrained, non-pleasing**
- System is **agent-based**, allowing future extension to 3D, voice, memory, and moderation

This document defines **agent responsibilities and boundaries**, not implementation details.

---

## 1. Agent Architecture Overview

### Dialogue Runtime Flow
User Input
↓
PromptOrchestratorAgent
↓
PersonaSpecAgent rules applied
↓
LLM Draft Response
↓
CriticAgent
├─ Pass → Final Output
└─ Fail → Rewrite → Final Output


### Art Direction Flow (Offline / Iterative)
ArtDirectorAgent
↓
ConceptGeneratorAgent
↓
ConsistencyAgent
↓
AssetPackagerAgent

---

## 2. Art Track Agents (形象绘制)

### 2.1 ArtDirectorAgent

**Purpose**  
Define and lock the visual identity of Monday.

**Responsibilities**
- Define character archetype and visual tone
- Lock non-negotiable visual elements
- Prevent style drift across iterations

**Inputs**
- Theme: Cyber Neon Bar
- Role: Bartender
- Personality keywords: calm, sharp, restrained, ironic

**Outputs**
- Character identity sheet
- Color palette
- Outfit and prop constraints

**Hard Constraints**
- No exaggerated cyberpunk armor
- No sexualized presentation
- No cartoon / chibi proportions
- No violence-related elements

---

### 2.2 ConceptGeneratorAgent

**Purpose**  
Explore multiple visual directions before convergence.

**Responsibilities**
- Generate multiple concept prompts
- Explore lighting, silhouette, and mood variations
- Map each concept to emotional readability

**Outputs**
- 5–10 concept prompt variants
- Short justification for each variant

**Termination Condition**
- One concept selected as canonical

---

### 2.3 ConsistencyAgent

**Purpose**  
Ensure long-term visual consistency across assets and updates.

**Responsibilities**
- Produce final canonical generation prompt
- Define negative prompt
- Define immutable traits

**Outputs**
- Final positive prompt
- Final negative prompt
- Do / Don’t checklist
- Seed or consistency strategy (if applicable)

**Immutable Traits**
- Hair style
- Outfit category
- Color palette
- Expression range (neutral / amused / serious)

---

### 2.4 AssetPackagerAgent

**Purpose**  
Prepare visual assets for web-based POC usage.

**Responsibilities**
- Define minimal required assets
- Specify resolution and file format
- Define naming conventions

**POC Asset List**
- Half-body portrait (neutral)
- Half-body portrait (amused)
- Half-body portrait (serious)
- Circular avatar icon

**Recommended Format**
- WebP or PNG
- Transparent background preferred

---

## 3. Dialogue Track Agents (文字交互)

### 3.1 PersonaSpecAgent

**Purpose**  
Define Monday’s linguistic identity and behavioral boundaries.

**Responsibilities**
- Write the system prompt
- Define tone, attitude, and refusal behavior
- Define safety downgrade rules

**Core Traits**
- Non-pleasing
- Calm, sharp, restrained
- Dry sarcasm allowed
- Challenges avoidance and weak reasoning

**Hard Boundaries**
- No hate or slurs
- No harassment toward protected groups
- No encouragement of self-harm
- No humiliation-based interaction

**Outputs**
- persona_system_prompt.md

---

### 3.2 ConversationDesignerAgent

**Purpose**  
Design the conversational structure and user control points.

**Responsibilities**
- Define session-level flow
- Define opening lines
- Define user control affordances

**POC Conversation States**
1. Cold Open
2. Venting
3. Pushback
4. Direction Choice
5. Close

**Outputs**
- Dialogue state definitions
- Starter line list
- User control option list

---

### 3.3 PromptOrchestratorAgent

**Purpose**  
Assemble runtime prompts dynamically.

**Responsibilities**
- Merge system prompt, user input, and session summary
- Enforce length and tone constraints
- Inject bartender role context

**Memory Strategy (POC)**
- Keep last 3 dialogue turns
- Maintain a rolling 3-bullet session summary
- No long-term memory

**Output Rules**
- 80–140 Chinese characters per response
- Each response must include at least one:
  - Pointed question
  - Reframing statement
  - Concrete next step

---

### 3.4 CriticAgent (Safety & Quality)

**Purpose**  
Prevent the toxic-sarcastic persona from degrading into abuse or unsafe behavior.

**Responsibilities**
- Review generated responses
- Detect boundary violations or excessive aggression
- Trigger rewrite when necessary

**Rewrite Triggers**
- Personal attacks on the user
- Shaming or humiliating language
- Fatalistic framing (“you are hopeless”)
- Encouragement of harm or illegal acts

**Rewrite Instruction Template**
Rewrite the response.
Remove personal attacks.
Keep it sharp, calm, and analytical.
No comfort. No cruelty.


---

## 4. Non-Goals (Explicitly Out of Scope for POC)

- 3D character rendering
- Voice input or output
- Animation or gesture control
- Long-term memory or user profiling
- Monetization or compliance systems

---

## 5. Extension Hooks (Future Work)

This agent architecture is designed to support future additions:
- Emotion tagging → animation triggers
- Drink/menu-based intent routing
- Voice and lip-sync agents
- Long-term memory and user modeling
- Moderation and compliance layers

---

## 6. POC Success Criteria

The POC is considered successful if:
- Monday feels consistent and intentional
- Toxic tone is controlled, not abusive
- Visual identity is recognizable and reusable
- New capabilities can be added without refactoring core agents
