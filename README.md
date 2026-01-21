# Brightvision Ads Insights Tool

Ett internt finansiellt verktyg för att övervaka, planera och prognostisera annonsbudgetar över flera plattformar (Google, LinkedIn, Meta).

## Funktioner

### 📊 Budget Overview Dashboard
- Realtidsöverblick av total budget vs. aktuell spend
- Filtrering per kund och kanal
- Visuella diagram för budget-utnyttjande
- Spend-fördelning per kanal

### ⚠️ Alert System
- Automatiska varningar vid 90% budget-utnyttjande
- Kritiska alerts vid 95%
- Notifikationsöversikt med läs/oläst-status

### 🔮 What-If Simulator
- Simulera budgetjusteringar
- Testa paus-perioder
- Prognostisera slutkostnad baserat på justeringar
- Rekommendationer baserade på simuleringsresultat

### 👥 Kundhantering
- Översikt av alla kunder
- Budget-status per kund
- Multi-valuta stöd (SEK, EUR, USD)

## Tech Stack

### Frontend
- **React 19** - UI-ramverk
- **TypeScript** - Typsäkerhet
- **Vite** - Byggverktyg & dev-server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Routing
- **Zustand** - State management
- **Recharts** - Diagram och visualiseringar
- **date-fns** - Datumhantering

### Backend (Schema för PostgreSQL)
- Fullständigt databasschema med:
  - Tabeller för Customers, Channels, Campaign Groups, Campaigns, Pause Windows
  - Views för aggregerad data
  - Triggers för automatiska alerts
  - Indexering för optimal prestanda

## Datamodell

```
Customers (1) ─────< Channels (N)
                         │
                         │
              Campaign Groups (N)
                         │
                         │
                  Campaigns (N) ─────< Pause Windows (N)
```

### Entiteter

| Entitet | Beskrivning |
|---------|-------------|
| **Customers** | Kundkonto med namn och valuta |
| **Channels** | Annonsplattform (Google/LinkedIn/Meta) |
| **CampaignGroups** | Gruppering av kampanjer |
| **Campaigns** | Individuell kampanj med budget och spend |
| **PauseWindows** | Planerade pausperioder |

## Kom igång

### Förutsättningar

- Node.js 18+
- npm eller pnpm

### Installation

```bash
# Installera beroenden
npm install

# Starta utvecklingsserver
npm run dev

# Bygg för produktion
npm run build
```

### Demo-inloggning

| Roll | E-post | Lösenord |
|------|--------|----------|
| Admin | admin@brightvision.se | admin123 |
| Viewer | viewer@brightvision.se | viewer123 |

## Projektstruktur

```
src/
├── components/
│   ├── alerts/          # Alert-komponenter
│   ├── dashboard/       # Dashboard-specifika komponenter
│   ├── layout/          # Layout (Sidebar, MainLayout)
│   ├── simulation/      # Simuleringskomponenter
│   └── ui/              # Återanvändbara UI-komponenter
├── data/
│   └── mockData.ts      # Simulerad testdata
├── db/
│   └── schema.sql       # PostgreSQL databasschema
├── pages/               # Sidkomponenter
├── store/               # Zustand stores
├── types/               # TypeScript-typer
└── utils/               # Hjälpfunktioner
```

## Databas Setup (PostgreSQL)

Schemat finns i `src/db/schema.sql` och innehåller:

1. **Tabeller** för alla entiteter
2. **Enum-typer** för currency, channel_name, status
3. **Views** för budget-aggregering
4. **Triggers** för automatiska alerts
5. **Funktioner** för budget-övervakning

Kör schemat mot en PostgreSQL-databas:

```bash
psql -U postgres -d brightvision -f src/db/schema.sql
```

## Alert-trösklar

| Nivå | Tröskel | Beskrivning |
|------|---------|-------------|
| Warning | 90% | Budget-utnyttjande närmar sig gränsen |
| Critical | 95% | Omedelbar åtgärd krävs |

## Licens

Intern användning - Brightvision © 2024
