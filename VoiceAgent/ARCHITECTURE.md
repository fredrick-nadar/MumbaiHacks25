# 🏗️ HCM-AFIS Architecture

**Hierarchical Collaborative Multi-Agent Financial Intelligence System**

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Voice Call)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Twilio Voice
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TWILIO AGENT                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Speech-to-Text (Multi-language)                       │   │
│  │  • Text-to-Speech (Hindi/Tamil/Telugu/English)           │   │
│  │  • Session Management                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Text Query
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MASTER AGENT                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Language Detection (Groq LLM)                         │   │
│  │ 2. Intent Detection (Groq LLM)                           │   │
│  │ 3. Task Routing                                          │   │
│  │ 4. Collaboration Management                              │   │
│  │ 5. Response Merging                                      │   │
│  │ 6. Translation                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬──────────┬──────────┬──────────┬────────────────────────┘
         │          │          │          │
    ┌────┘     ┌────┘     ┌────┘     ┌────┘
    │          │          │          │
    ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Expense │ │  Tax   │ │Invest  │ │Income  │  ← SLAVE AGENTS
│ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │          │          │
     │          │          │          │
     ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Expense │ │  Tax   │ │Invest  │ │Income  │  ← REASONERS (LLM)
│Reasoner│ │Reasoner│ │Reasoner│ │Reasoner│
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │          │          │
     │          │          │          │
     ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Expense │ │  Tax   │ │Invest  │ │Income  │  ← MEMORY STORES
│ Memory │ │ Memory │ │ Memory │ │ Memory │
└────────┘ └────────┘ └────────┘ └────────┘
     │          │          │          │
     └──────────┴──────────┴──────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │   CORE SERVICES      │
        │  • Memory Store      │
        │  • Context Manager   │
        │  • Event Bus         │
        │  • Schema Validator  │
        └──────────────────────┘
```

## Agent Communication Flow

### Sequential Execution
```
Query: "मैंने 500 खर्च किए, tax में फायदा होगा?"

MasterAgent
    │
    ├─> ExpenseAgent (categorize & log)
    │      │
    │      └─> Returns: {category: "Food", amount: 500, taxDeductible: false}
    │
    ├─> TaxAgent (check deductibility)
           │
           └─> Returns: {isDeductible: false, suggestion: "Use 80C"}
```

### Parallel Execution
```
Query: "मेरी income और expenses बताओ"

MasterAgent
    │
    ├─────────────┬─────────────┐
    │             │             │
    ▼             ▼             │
IncomeAgent   ExpenseAgent      │
    │             │             │
    └─────────────┴─────────────┘
                  │
                  ▼
            MasterAgent (merge)
```

## Intent → Agent Mapping

| User Intent | Agents Triggered | Execution Mode |
|-------------|------------------|----------------|
| expense_logging | ExpenseAgent | Sequential |
| tax_saving_advice | TaxAgent | Sequential |
| invest_for_tax_saving | InvestmentAgent → TaxAgent | Sequential |
| income_vs_expenses | IncomeAgent ‖ ExpenseAgent | Parallel |
| financial_overview | All Agents | Sequential |

## Data Flow

```
1. User speaks (Hindi/Tamil/Telugu/English)
       ↓
2. Twilio converts to text
       ↓
3. MasterAgent detects language & intent
       ↓
4. MasterAgent translates to English (if needed)
       ↓
5. TaskRouter maps intent to agents
       ↓
6. CollaborationManager executes agents
       ↓
7. Each agent:
   • Processes task
   • Calls LLM reasoner
   • Stores in memory
   • Returns structured result
       ↓
8. MasterAgent merges all results
       ↓
9. MasterAgent generates final response (English)
       ↓
10. LanguageManager translates to user's language
       ↓
11. Twilio speaks response
```

## Component Responsibilities

### Master Agent Layer

**MasterAgent**
- Orchestrates entire flow
- Manages conversation context
- Final response generation

**TaskRouter**
- Intent-to-agent mapping
- Execution order determination
- Priority management

**CollaborationManager**
- Sequential execution
- Parallel execution
- Output merging

**LanguageManager**
- Language detection
- Translation (4 languages)
- Voice configuration

### Slave Agent Layer

**ExpenseAgent**
- Expense categorization
- Budget tracking
- Overspending prediction

**TaxAgent**
- Tax calculation (Indian tax law)
- Deduction suggestions
- Regime comparison

**InvestmentAgent**
- SIP recommendations
- Portfolio allocation
- Risk-based advice

**IncomeAgent**
- Income analysis
- Forecasting
- Stability assessment

### Core Services

**Memory Store**
- In-memory key-value storage
- TTL support
- Pattern matching

**Context Manager**
- Conversation history
- User preferences
- Session state

**Event Bus**
- Agent communication
- Event logging
- Async notifications

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Voice Interface | Twilio Voice API |
| Speech-to-Text | Twilio Transcription |
| Text-to-Speech | Google Cloud TTS (via Twilio) |
| LLM | Groq (Llama 3.1 8B) |
| Backend | Node.js + Express |
| Memory | In-memory (Map) |
| Tunneling | ngrok |

## Agent Interaction Patterns

### Pattern 1: Single Agent
```
User → MasterAgent → ExpenseAgent → Response
```

### Pattern 2: Sequential Chain
```
User → MasterAgent → InvestmentAgent → TaxAgent → Response
```

### Pattern 3: Parallel Execution
```
                    ┌─ IncomeAgent ─┐
User → MasterAgent ─┤               ├─ MasterAgent → Response
                    └─ ExpenseAgent ┘
```

### Pattern 4: Full Orchestra
```
                    ┌─ IncomeAgent ──┐
                    ├─ ExpenseAgent ─┤
User → MasterAgent ─┤                ├─ MasterAgent → Response
                    ├─ TaxAgent ─────┤
                    └─ InvestAgent ──┘
```

## Scalability Considerations

### Current (MVP)
- In-memory storage
- Single server instance
- Synchronous processing

### Production Ready
- Redis/MongoDB for persistence
- Load balancer + multiple instances
- Queue-based async processing
- Agent caching
- Response streaming

## Security

- ✅ Environment variables for secrets
- ✅ Twilio signature validation (recommended)
- ✅ Rate limiting via Twilio
- ⚠️ Add authentication for production
- ⚠️ Encrypt memory store
- ⚠️ Add audit logging

---

**Architecture designed for extensibility and modularity**
