# Cursor for Food - Implementation Plan

This document translates the [system design](cursor_for_food_system_design.md) into actionable development tasks organized by priority and dependencies.

---

## Current State Assessment

### What Exists
- ✅ Drizzle ORM schemas for all core entities
- ✅ Basic tRPC API structure with routers
- ✅ Frontend scaffolding with React + TailwindCSS
- ✅ Entity configuration system (`frontend/src/config/entities.tsx`)
- ✅ Basic data table components
- ✅ Algorithm documentation (`docs/algorithms.md`)
- ✅ Domain reference material (`docs/FoodServiceManagement.md`)

### What's Missing
- ❌ Three-panel Cursor-style layout
- ❌ Entity tree navigation
- ❌ Agent chat interface
- ❌ LLM integration
- ❌ `llm_notes` fields in schemas
- ❌ Tool execution framework
- ❌ Omni-search (⌘K)
- ❌ Rich entity views
- ❌ External integrations

---

## Implementation Strategy

### Guiding Principles

1. **Vertical Slices**: Build complete features (backend → frontend → agent) rather than horizontal layers
2. **Demo-able Increments**: Each sprint should produce something demonstrable
3. **Agent-First**: Prioritize agent capabilities - that's the differentiator
4. **Leverage Existing**: Build on current schemas and services, don't rewrite

### Sprint Structure

- **Sprint Duration**: 2 weeks
- **Total Sprints**: 10 (20 weeks)
- **Review Cadence**: Demo at end of each sprint

---

## Sprint Breakdown

### Sprint 1: Layout Foundation & Schema Updates
**Goal**: Establish Cursor-style three-panel layout and add llm_notes infrastructure

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Add `llmNotes` field to tenants schema | `backend/src/db/schema/tenants.ts` | 1hr | P0 |
| Add `llmNotes` field to sites schema | `backend/src/db/schema/tenants.ts` | 1hr | P0 |
| Add `llmNotes` field to stations schema | `backend/src/db/schema/tenants.ts` | 1hr | P0 |
| Add `llmNotes` field to cycle_menus schema | `backend/src/db/schema/menu.ts` | 1hr | P0 |
| Add `llmNotes` field to menu_items schema | `backend/src/db/schema/menu.ts` | 1hr | P0 |
| Add `llmNotes` field to diners schema | `backend/src/db/schema/diners.ts` | 1hr | P0 |
| Add `llmNotes` field to recipes schema | `backend/src/db/schema/recipes.ts` | 1hr | P0 |
| Create database migration | `backend/src/db/migrations/` | 2hr | P0 |
| Create context aggregation service | `backend/src/services/llm-context.service.ts` | 4hr | P0 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create three-panel layout component | `frontend/src/components/Layout/ThreePanelLayout.tsx` | 4hr | P0 |
| Add panel resizing (react-resizable-panels) | `frontend/src/components/Layout/` | 3hr | P0 |
| Create panel collapse/expand controls | `frontend/src/components/Layout/` | 2hr | P1 |
| Create basic entity tree component (static) | `frontend/src/components/EntityTree/EntityTree.tsx` | 4hr | P0 |
| Create placeholder agent panel | `frontend/src/components/AgentPanel/AgentPanel.tsx` | 2hr | P1 |
| Update App.tsx with new layout | `frontend/src/App.tsx` | 2hr | P0 |

**Sprint 1 Deliverable**: Application displays in three-panel layout. Entity tree shows static hierarchy. Database has llm_notes fields.

**Acceptance Criteria**:
- [ ] Three panels visible: entity tree (left), canvas (center), agent (right)
- [ ] Panels can be resized by dragging dividers
- [ ] Entity tree shows hardcoded tenant/site/station hierarchy
- [ ] All schema migrations run without errors
- [ ] llm_notes fields accept and store text

---

### Sprint 2: Entity Tree & Navigation
**Goal**: Dynamic entity tree that loads from database and navigates to entity views

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create tree data endpoint | `backend/src/trpc/routers/tree.ts` | 4hr | P0 |
| Add entity counts to tree nodes | `backend/src/trpc/routers/tree.ts` | 2hr | P1 |
| Create entity badges endpoint (alerts, status) | `backend/src/trpc/routers/tree.ts` | 3hr | P1 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create tree node component | `frontend/src/components/EntityTree/TreeNode.tsx` | 3hr | P0 |
| Add expand/collapse with lazy loading | `frontend/src/components/EntityTree/` | 4hr | P0 |
| Add tree node icons by entity type | `frontend/src/components/EntityTree/` | 2hr | P1 |
| Add count badges to tree nodes | `frontend/src/components/EntityTree/` | 2hr | P1 |
| Create tree context menu (right-click) | `frontend/src/components/EntityTree/TreeContextMenu.tsx` | 4hr | P2 |
| Implement tree selection → center pane routing | `frontend/src/components/EntityTree/` | 3hr | P0 |
| Add tree search/filter | `frontend/src/components/EntityTree/TreeFilter.tsx` | 3hr | P2 |

**Sprint 2 Deliverable**: Clicking tree nodes loads corresponding entity view in center pane.

**Acceptance Criteria**:
- [ ] Tree loads dynamically from database
- [ ] Expanding a node loads children lazily
- [ ] Clicking a node opens entity in center pane
- [ ] Nodes show counts (e.g., "Diners (127)")
- [ ] Tree remembers expanded/collapsed state

---

### Sprint 3: Core Entity Views
**Goal**: Rich detail views for Recipe, Diner, and Site entities

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create entity view container with tabs | `frontend/src/components/EntityView/EntityViewContainer.tsx` | 3hr | P0 |
| Create Recipe detail view | `frontend/src/pages/RecipeView.tsx` | 6hr | P0 |
| Create Recipe ingredients table | `frontend/src/pages/RecipeView.tsx` | 4hr | P0 |
| Create Recipe scaling calculator | `frontend/src/pages/RecipeView.tsx` | 4hr | P1 |
| Create Diner profile view | `frontend/src/pages/DinerView.tsx` | 5hr | P0 |
| Create Diner meal history section | `frontend/src/pages/DinerView.tsx` | 3hr | P1 |
| Create Site overview view | `frontend/src/pages/SiteView.tsx` | 4hr | P1 |
| Create entity edit mode toggle | `frontend/src/components/EntityView/` | 3hr | P0 |
| Add llm_notes editor to entity views | `frontend/src/components/EntityView/LLMNotesEditor.tsx` | 3hr | P0 |

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Extend recipe router with full details | `backend/src/trpc/routers/recipe.ts` | 3hr | P0 |
| Extend diner router with meal history | `backend/src/trpc/routers/diner.ts` | 3hr | P1 |
| Add llm_notes update endpoints | `backend/src/trpc/routers/*.ts` | 2hr | P0 |

**Sprint 3 Deliverable**: Users can view and edit recipes, diners, and sites with rich detail views.

**Acceptance Criteria**:
- [ ] Recipe view shows ingredients, costs, method, nutrition
- [ ] Diner view shows diet info, allergies, meal history
- [ ] Site view shows stations, employees, capacity
- [ ] Users can edit llm_notes on each entity
- [ ] Edit mode clearly indicated with save/cancel

---

### Sprint 4: Agent Panel Foundation
**Goal**: Basic agent chat interface with LLM connection

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Set up Claude API client | `backend/src/lib/llm.ts` | 3hr | P0 |
| Create agent router | `backend/src/trpc/routers/agent.ts` | 4hr | P0 |
| Implement conversation endpoint | `backend/src/trpc/routers/agent.ts` | 4hr | P0 |
| Create conversation memory/history | `backend/src/services/agent-memory.service.ts` | 4hr | P0 |
| Integrate context aggregation into prompts | `backend/src/services/agent.service.ts` | 4hr | P0 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create chat message component | `frontend/src/components/AgentPanel/ChatMessage.tsx` | 3hr | P0 |
| Create message input with send | `frontend/src/components/AgentPanel/ChatInput.tsx` | 3hr | P0 |
| Create message list with auto-scroll | `frontend/src/components/AgentPanel/MessageList.tsx` | 3hr | P0 |
| Add loading/streaming indicator | `frontend/src/components/AgentPanel/` | 2hr | P0 |
| Show context sources in panel | `frontend/src/components/AgentPanel/ContextDisplay.tsx` | 3hr | P1 |
| Add conversation history UI | `frontend/src/components/AgentPanel/` | 3hr | P2 |

**Sprint 4 Deliverable**: Users can chat with AI agent. Agent has access to hierarchical context.

**Acceptance Criteria**:
- [ ] User can type message and receive AI response
- [ ] Messages display in chat format
- [ ] Agent panel shows which llm_notes are active
- [ ] Conversation persists across panel open/close
- [ ] Streaming response shows typing indicator

---

### Sprint 5: Tool Framework & Core Tools
**Goal**: Agent can execute tools to query and modify data

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create tool registry | `backend/src/tools/registry.ts` | 4hr | P0 |
| Create tool execution framework | `backend/src/tools/executor.ts` | 5hr | P0 |
| Implement `db_query` tool | `backend/src/tools/data/db-query.ts` | 4hr | P0 |
| Implement `db_get` tool | `backend/src/tools/data/db-get.ts` | 3hr | P0 |
| Implement `db_create` tool | `backend/src/tools/data/db-create.ts` | 3hr | P1 |
| Implement `db_update` tool | `backend/src/tools/data/db-update.ts` | 3hr | P1 |
| Add tool calling to LLM integration | `backend/src/lib/llm.ts` | 5hr | P0 |
| Handle tool results in conversation | `backend/src/services/agent.service.ts` | 4hr | P0 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Show tool execution in messages | `frontend/src/components/AgentPanel/ToolExecution.tsx` | 4hr | P0 |
| Add collapsible tool details | `frontend/src/components/AgentPanel/` | 2hr | P1 |
| Create action buttons in responses | `frontend/src/components/AgentPanel/ActionButton.tsx` | 3hr | P0 |

**Sprint 5 Deliverable**: Agent can answer questions by querying database. Users see which tools were used.

**Acceptance Criteria**:
- [ ] "How many diners are on renal diet?" returns accurate count
- [ ] "Show me recipe for Beef Bourguignon" returns recipe details
- [ ] Tool executions shown in expandable section
- [ ] Action buttons in responses work (e.g., "View Recipe")
- [ ] Errors handled gracefully with user feedback

---

### Sprint 6: Algorithm Tools
**Goal**: Agent can scale recipes, validate diets, and forecast demand

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Implement `recipe_scale` tool | `backend/src/tools/algorithms/recipe-scale.ts` | 5hr | P0 |
| Implement `recipe_cost` tool | `backend/src/tools/algorithms/recipe-cost.ts` | 4hr | P0 |
| Implement `validate_diet` tool | `backend/src/tools/algorithms/validate-diet.ts` | 5hr | P0 |
| Implement `check_allergens` tool | `backend/src/tools/algorithms/check-allergens.ts` | 4hr | P0 |
| Implement `forecast_demand` tool | `backend/src/tools/algorithms/forecast-demand.ts` | 6hr | P1 |
| Implement `protein_spread` tool | `backend/src/tools/algorithms/protein-spread.ts` | 5hr | P1 |
| Create unit conversion utility | `backend/src/lib/unit-converter.ts` | 4hr | P0 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Add scaled recipe display component | `frontend/src/components/AgentPanel/ScaledRecipe.tsx` | 3hr | P1 |
| Add diet validation display | `frontend/src/components/AgentPanel/DietValidation.tsx` | 3hr | P1 |

**Sprint 6 Deliverable**: Agent can perform intelligent recipe and menu operations.

**Acceptance Criteria**:
- [ ] "Scale Beef Bourguignon to 100 portions" returns practical measurements
- [ ] "Is this recipe safe for Maria Rodriguez?" checks allergies and diet
- [ ] "What's the cost per portion?" calculates from current prices
- [ ] "Forecast lunch attendance for Friday" uses historical data
- [ ] Unit conversions are practical (e.g., "3/4 cup" not "0.75 cups")

---

### Sprint 7: Menu & Production Views
**Goal**: Menu calendar and production dashboard views

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create menu calendar grid | `frontend/src/pages/MenuCalendarView.tsx` | 6hr | P0 |
| Add drag-drop menu item placement | `frontend/src/pages/MenuCalendarView.tsx` | 5hr | P1 |
| Create menu item card component | `frontend/src/components/Menu/MenuItemCard.tsx` | 3hr | P0 |
| Add cost indicators to menu items | `frontend/src/pages/MenuCalendarView.tsx` | 3hr | P0 |
| Create production dashboard | `frontend/src/pages/ProductionView.tsx` | 6hr | P0 |
| Create production timeline | `frontend/src/components/Production/Timeline.tsx` | 5hr | P1 |
| Create prep checklist component | `frontend/src/components/Production/PrepChecklist.tsx` | 4hr | P1 |
| Add diet breakdown display | `frontend/src/pages/ProductionView.tsx` | 3hr | P1 |

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create menu calendar data endpoint | `backend/src/trpc/routers/menu.ts` | 4hr | P0 |
| Create production schedule endpoint | `backend/src/trpc/routers/production.ts` | 4hr | P0 |
| Implement `generate_production_schedule` tool | `backend/src/tools/algorithms/production-schedule.ts` | 5hr | P1 |

**Sprint 7 Deliverable**: Users can view and edit menus in calendar view. Production dashboard shows today's schedule.

**Acceptance Criteria**:
- [ ] Menu calendar shows week view with meals by day
- [ ] Menu items can be dragged between days
- [ ] Cost per meal shown with over-budget warnings
- [ ] Production timeline shows items with timing
- [ ] Prep checklist can be checked off
- [ ] Agent can generate production schedule

---

### Sprint 8: Omni-Search (⌘K)
**Goal**: Universal search across all entities with natural language

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create search index service | `backend/src/services/search.service.ts` | 5hr | P0 |
| Index entities on create/update | `backend/src/services/search.service.ts` | 4hr | P0 |
| Create unified search endpoint | `backend/src/trpc/routers/search.ts` | 4hr | P0 |
| Add entity type filtering | `backend/src/trpc/routers/search.ts` | 2hr | P0 |
| Add fuzzy matching | `backend/src/services/search.service.ts` | 3hr | P1 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create command palette component | `frontend/src/components/OmniSearch/CommandPalette.tsx` | 5hr | P0 |
| Add keyboard shortcut (⌘K) | `frontend/src/components/OmniSearch/` | 2hr | P0 |
| Create search result items | `frontend/src/components/OmniSearch/SearchResult.tsx` | 3hr | P0 |
| Add result type icons/grouping | `frontend/src/components/OmniSearch/` | 3hr | P0 |
| Add recent items section | `frontend/src/components/OmniSearch/` | 3hr | P1 |
| Add command mode (>prefix) | `frontend/src/components/OmniSearch/` | 4hr | P2 |
| Add "Ask Agent" option (?prefix) | `frontend/src/components/OmniSearch/` | 3hr | P1 |

**Sprint 8 Deliverable**: ⌘K opens universal search. Users can find any entity quickly.

**Acceptance Criteria**:
- [ ] ⌘K opens search palette from anywhere
- [ ] Typing shows matching entities in real-time
- [ ] "@recipe chicken" filters to recipes only
- [ ] Results show entity type icons
- [ ] Selecting result navigates to entity
- [ ] Recent searches shown on open

---

### Sprint 9: External Integrations
**Goal**: Weather, seasonal data, and Sysco integration

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create weather service | `backend/src/integrations/weather.ts` | 4hr | P0 |
| Implement `weather_get` tool | `backend/src/tools/external/weather.ts` | 3hr | P0 |
| Create seasonal produce service | `backend/src/integrations/seasonal.ts` | 4hr | P1 |
| Implement `seasonal_produce` tool | `backend/src/tools/external/seasonal.ts` | 3hr | P1 |
| Create Sysco service (mock/sandbox) | `backend/src/integrations/sysco.ts` | 5hr | P1 |
| Implement `sysco_search` tool | `backend/src/tools/external/sysco-search.ts` | 4hr | P1 |
| Implement `sysco_order` tool | `backend/src/tools/external/sysco-order.ts` | 4hr | P2 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create weather display component | `frontend/src/components/Weather/WeatherCard.tsx` | 2hr | P2 |
| Create Sysco product search UI | `frontend/src/components/Sysco/ProductSearch.tsx` | 4hr | P2 |
| Add purchase order preview | `frontend/src/components/Sysco/OrderPreview.tsx` | 4hr | P2 |

**Sprint 9 Deliverable**: Agent can check weather, suggest seasonal items, and search Sysco catalog.

**Acceptance Criteria**:
- [ ] "What's the weather on Friday?" returns forecast
- [ ] "What produce is in season?" returns seasonal list
- [ ] "Search Sysco for chicken breast" returns products with prices
- [ ] Weather impacts surfaced in production suggestions
- [ ] Sysco search results include pricing and pack sizes

---

### Sprint 10: Polish & Advanced Features
**Goal**: Voice input, agent personalities, and inventory dashboard

#### Backend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Create agent personality system | `backend/src/services/agent.service.ts` | 4hr | P1 |
| Define Chef personality | `backend/src/config/agent-personalities.ts` | 2hr | P1 |
| Define Dietitian personality | `backend/src/config/agent-personalities.ts` | 2hr | P1 |
| Define Operations Manager personality | `backend/src/config/agent-personalities.ts` | 2hr | P1 |
| Implement `analyze_leftovers` tool | `backend/src/tools/algorithms/analyze-leftovers.ts` | 4hr | P2 |
| Implement `cost_optimize` tool | `backend/src/tools/algorithms/cost-optimize.ts` | 5hr | P2 |

#### Frontend Tasks

| Task | File(s) | Effort | Priority |
|------|---------|--------|----------|
| Add voice input (Web Speech API) | `frontend/src/components/AgentPanel/VoiceInput.tsx` | 5hr | P1 |
| Add agent personality selector | `frontend/src/components/AgentPanel/PersonalitySelector.tsx` | 3hr | P1 |
| Create inventory dashboard | `frontend/src/pages/InventoryView.tsx` | 6hr | P0 |
| Add reorder alerts display | `frontend/src/pages/InventoryView.tsx` | 3hr | P0 |
| Add expiring items display | `frontend/src/pages/InventoryView.tsx` | 3hr | P0 |
| Create smart ordering suggestions | `frontend/src/pages/InventoryView.tsx` | 4hr | P1 |
| Add keyboard shortcuts help | `frontend/src/components/Help/KeyboardShortcuts.tsx` | 2hr | P2 |
| Create onboarding tour | `frontend/src/components/Onboarding/Tour.tsx` | 4hr | P2 |

**Sprint 10 Deliverable**: Full "Cursor for Food" experience with voice, personalities, and complete dashboards.

**Acceptance Criteria**:
- [ ] Voice button records and transcribes speech
- [ ] Agent personalities change tone and tool emphasis
- [ ] Inventory view shows reorder alerts and expirations
- [ ] Smart ordering suggestions based on forecast
- [ ] Keyboard shortcuts work throughout app
- [ ] New users can complete onboarding tour

---

## Technical Prerequisites

### Before Sprint 1

1. **Install dependencies**:
   ```bash
   npm install react-resizable-panels      # Panel layout
   npm install @tanstack/react-query       # Already have
   npm install zustand                     # State management
   npm install cmdk                        # Command palette
   npm install @anthropic-ai/sdk           # Claude API
   ```

2. **Environment setup**:
   ```env
   # .env additions
   ANTHROPIC_API_KEY=sk-ant-...
   OPENWEATHER_API_KEY=...
   SYSCO_API_KEY=...  # If available
   ```

3. **Database backup**: Ensure current database is backed up before migrations

### Before Sprint 4 (Agent)

1. **Claude API access**: Ensure Anthropic API key is active
2. **Rate limiting**: Implement basic rate limiting for LLM calls
3. **Cost monitoring**: Set up usage tracking for API costs

### Before Sprint 9 (Integrations)

1. **API keys**: Obtain keys for external services
2. **Sandbox accounts**: Set up test accounts for Sysco
3. **Webhook endpoints**: Set up endpoints for real-time updates

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM costs exceed budget | Medium | High | Implement caching, rate limiting, use smaller models for simple tasks |
| Sysco API unavailable | Medium | Medium | Build mock service, browser automation fallback |
| Complex entity relationships | Low | Medium | Start with simple hierarchies, add complexity incrementally |
| Performance with large datasets | Medium | Medium | Implement pagination, lazy loading, search indexing |
| Tool execution errors | Medium | Low | Comprehensive error handling, graceful degradation |

---

## Success Metrics by Sprint

| Sprint | Key Metric | Target |
|--------|------------|--------|
| 1 | Layout renders correctly | 100% |
| 2 | Tree navigation works | <500ms response |
| 3 | Entity views load | <1s load time |
| 4 | Agent responds | <3s response time |
| 5 | Tool execution | >95% success rate |
| 6 | Algorithm accuracy | >90% correct results |
| 7 | Menu editing | <5 clicks to add item |
| 8 | Search relevance | Top result 80% of time |
| 9 | Integration uptime | >99% availability |
| 10 | User satisfaction | >4/5 rating |

---

## Getting Started

### Immediate Next Steps

1. **Review and approve this plan** with stakeholders
2. **Set up development environment** (dependencies, API keys)
3. **Create Sprint 1 issues** in project management tool
4. **Assign developers** to Sprint 1 tasks
5. **Begin implementation** with schema updates

### Recommended Team Structure

| Role | Responsibility | Sprint Focus |
|------|----------------|--------------|
| Frontend Dev 1 | Layout, entity tree | Sprints 1-3, 8 |
| Frontend Dev 2 | Entity views, dashboards | Sprints 3, 7, 10 |
| Backend Dev 1 | Schemas, services, tRPC | Sprints 1-3, 7-8 |
| Backend Dev 2 | Agent, tools, LLM | Sprints 4-6, 9-10 |
| Designer | UI/UX, mockups | Throughout |

---

## Appendix: Quick Reference

### File Structure for New Code

```
backend/src/
├── tools/
│   ├── registry.ts           # Tool registration
│   ├── executor.ts           # Tool execution
│   ├── data/
│   │   ├── db-query.ts
│   │   ├── db-get.ts
│   │   └── ...
│   ├── algorithms/
│   │   ├── recipe-scale.ts
│   │   ├── protein-spread.ts
│   │   └── ...
│   └── external/
│       ├── weather.ts
│       ├── sysco.ts
│       └── ...
├── integrations/
│   ├── weather.ts
│   ├── sysco.ts
│   └── ehr.ts
└── services/
    ├── agent.service.ts
    ├── agent-memory.service.ts
    ├── llm-context.service.ts
    └── search.service.ts

frontend/src/
├── components/
│   ├── Layout/
│   │   └── ThreePanelLayout.tsx
│   ├── EntityTree/
│   │   ├── EntityTree.tsx
│   │   └── TreeNode.tsx
│   ├── AgentPanel/
│   │   ├── AgentPanel.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ...
│   ├── OmniSearch/
│   │   └── CommandPalette.tsx
│   └── EntityView/
│       └── EntityViewContainer.tsx
└── pages/
    ├── RecipeView.tsx
    ├── DinerView.tsx
    ├── MenuCalendarView.tsx
    ├── ProductionView.tsx
    └── InventoryView.tsx
```

### Key Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "cmdk": "^0.2.0",
    "react-resizable-panels": "^2.0.0",
    "zustand": "^4.0.0",
    "zod": "^3.22.0"
  }
}
```

