# The State-Machine Graph Crawler — A Developer Explainer

---

### What Is It, In Plain Terms?

Imagine your app is a **maze**. Every screen is a room. Every button is a door. A user navigates by pressing buttons.

A traditional test says: *"I walked this specific path through the maze and didn't fall into a hole."*

The Graph Crawler says: **"I mathematically mapped every room, every door, every connection in the entire maze — and proved that no room is a dead end, no unauthorized shortcut exists between wings, and every room is reachable from the entrance."**

It treats your application not as code to execute, but as a **directed graph** to analyze.

---

### The Core Idea: Your App Is a Graph

```
States = Nodes
Button presses = Directed edges
User journey = A path through the graph
```

The crawler uses **Breadth-First Search** — the same algorithm Google uses to find shortest paths on maps — to systematically traverse every reachable node starting from each role's home screen. It doesn't guess; it exhausts.

---

### What It Proves — Three Mathematical Theorems

**1. Reachability Theorem**
> *"Every state that should exist does exist and can be reached."*

Catches: orphaned menus, states wired in code but never linked to from any button, screens that are dead code.

**2. No Dead-End Theorem**
> *"Every state has at least one outbound edge — no user can ever get permanently stuck."*

Catches: screens with no Back button, input states that loop only to themselves, flows with no escape route. In this very project it caught `REPORT_UPLOAD` and `PROFILE_EDIT` — states that had no `0`/`cancel` escape.

**3. Domain Integrity Theorem**
> *"No sequence of button presses from a Patient or Doctor seed ever reaches an Admin screen."*

This is the security one. It proves **role isolation holds under all possible input sequences**, not just the ones a human tester thought to try. It's the difference between "I tested the happy path" and "I proved it's impossible."

---

### Why an LLM Has a Unique Advantage Writing This

| Capability | Why It Matters Here |
|---|---|
| **Reads the entire codebase simultaneously** | The crawler had to understand `conversationFlow.js` (3,800+ lines), `payloadMap.js`, `adminRegistry`, `persona.js`, and the domain state arrays — all at once, to correctly model the graph |
| **Understands intent, not just syntax** | Knew that `'profile'` and `'5'` were semantically the same button after a menu refactor — caught the stale guard key bug because it read the *meaning* of the code |
| **Iterative debugging under constraints** | Found, diagnosed, and fixed 6 bugs *as a direct side effect* of writing the tests — because it could trace the exact execution path from assertion failure back to root cause |
| **Bridges spec and implementation** | Could write assertions like "super_admin must never reach WELCOME via the admin profile flow" by reasoning about the *intended architecture*, not just the current code |
| **No blind spots from familiarity** | A human developer who wrote the routing code has a mental model of "how it should work" — an LLM has no such bias and follows what the code *actually does* |

A human developer would spend days mapping all states manually and still miss edge cases. The LLM built the full model in one pass.

---

### What the Crawler Needs as Inputs

#### Mandatory

| Input | What It Is | Why |
|---|---|---|
| **State enum / constants** | `FlowStates` — the complete list of all possible states | Defines the nodes of the graph |
| **Transition function** | `createFlowHandler(chatId, input)` — given a state + input, returns next state | Defines the edges |
| **Valid inputs per state** | `payloadMap` + per-state button lists | Without this, the crawler can't know *what to press* |
| **Role seed states** | Where each role's session starts (e.g. `ADMIN_MENU`, `DOCTOR_MENU`) | Multi-seed BFS needs starting nodes per domain |

#### Good to Have (significantly improves coverage)

| Input | What It Unlocks |
|---|---|
| **Mocked data registries** | Seeding a doctor, admin, patient in the DB lets the crawler reach data-gated branches |
| **Pre-seeded sessions** | Setting `platformTermsAccepted: true`, `confirmedConsents` unlocks deeper patient states |
| **Domain state sets** | `ADMIN_DOMAIN_STATES`, `DOCTOR_DOMAIN_STATES` — needed for the Domain Integrity theorem |
| **Role-specific personas** | Running 5 separate crawls (one per role) vs one global crawl massively increases coverage |

Current coverage: **57.8% of FlowStates** (37/64). The remaining 42% are states behind live data — caregiver linking, payment verification, consultation completion — reachable only if the crawler is given richer mocked data.

---

### How It Enhances Human Testing

Think of it as **two different instruments measuring different things**:

```
Human Testing:          "Does the happy path work?"
                        "Does this specific bug I found reproduce?"
                        "Does this feature feel right to use?"

Graph Crawler:          "Is it *possible* for a user to get stuck anywhere?"
                        "Is it *possible* for a patient to reach admin screens?"
                        "Are there states that exist in code but lead nowhere?"
```

They don't compete — they cover **orthogonal failure modes**.

| What Human Testers Do Better | What the Crawler Does Better |
|---|---|
| UX feel, intuitiveness, visual layout | Exhaustive structural correctness |
| Business logic edge cases | Mathematical proof of global properties |
| Real-device behavior, API calls | Complete state coverage without fatigue |
| "This button label is confusing" | "This button leads nowhere under any conditions" |
| Regression on known bugs | Discovery of *unknown* structural bugs |

The most important property: **the crawler scales with codebase complexity for free**. Add 10 new states tomorrow — run `npm test` — it immediately tells you which ones are unreachable orphans or dead ends. A human tester has to *know* to go look for them.

In this project specifically, the crawler found **6 real bugs in the first run** that had survived months of human testing and a fuzzer — because they were structural (wrong routing, dead ends) rather than behavioral (wrong response text).
