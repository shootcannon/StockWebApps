<img width="500" height="500" alt="logo" src="https://github.com/user-attachments/assets/b16f29bf-0922-44a5-be26-28a98c1be0f6" />


# Fufas Markets

A personal market intelligence dashboard for tracking cryptocurrency and stocks in real-time. Built with Laravel, Inertia.js, React, and TypeScript.

---

## Features

**Market Data**
- Live cryptocurrency prices via CoinGecko API (top 250 by market cap, categories, trending, gainers/losers)
- Live stock prices via Yahoo Finance API
- OHLC candlestick data with configurable ranges (1D, 5D, 1M, 3M, 6M, 1Y, All)
- Global crypto market stats (total market cap, BTC/ETH dominance, active coins)

**Charts**
- Interactive price charts using Lightweight Charts v5 (candlestick, line, area, bar modes)
- Overlay indicators: MA20, MA50, EMA12, EMA26, Bollinger Bands, Volume
- RSI (14) and MACD (12, 26, 9) sub-charts
- Asset comparison chart with normalized relative performance
- 7-day sparklines on market and watchlist tables

**Technical Analysis & Forecast**
- 30-day price projection using log-linear regression with 90% confidence interval
- Technical signals: RSI overbought/oversold, MA20 vs MA50 cross (Golden/Death Cross), MACD histogram crossover, price vs MA50 trend
- Support and resistance levels via pivot point calculation
- Overall sentiment score (Strong Buy / Buy / Hold / Sell / Strong Sell)

**Portfolio**
- Record buy and sell transactions per asset
- Net quantity, average entry price, unrealized P/L calculated live against current price
- Full transaction history with date tracking

**Watchlist**
- Add any crypto or stock to a personal watchlist
- Live price and 24h change on the dashboard

**Price Alerts**
- Set above/below price alerts per asset
- Toggle alerts active/paused, mark triggered

**Notes**
- Write free-form analysis notes per asset with optional title
- Full edit and delete support

**Other**
- Asset search with debounced live results (crypto + stocks)
- Multi-currency display with live FX conversion (IDR, SGD, EUR, GBP, JPY, etc.)
- Dark and light theme with system-aware persistence
- Cmd+K search shortcut
- Custom branded loading bar (FufasProgress) replacing default Inertia progress
- Custom toast notification and confirm dialog system (no browser alert/confirm)

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Backend      | PHP 8.3, Laravel 13                             |
| Frontend     | React 19, TypeScript 5.7                        |
| SSR Bridge   | Inertia.js v3                                   |
| Styling      | Tailwind CSS v4                                 |
| Charts       | Lightweight Charts v5 (TradingView)             |
| Build Tool   | Vite 8                                          |
| Database     | SQLite (default) or MySQL/PostgreSQL            |
| Cache        | Database (default) or Redis                     |
| Data Sources | CoinGecko API (free), Yahoo Finance (no key)    |

---

## Requirements

- PHP >= 8.3 with extensions: `pdo`, `sqlite3` (or `pdo_mysql`), `openssl`, `mbstring`, `curl`
- Composer >= 2.x
- Node.js >= 20.x
- npm >= 10.x

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/fufas-markets.git
cd fufas-markets
```

### 2. Install PHP dependencies

```bash
composer install
```

### 3. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

### 4. Set up the database

The default configuration uses SQLite. No additional setup is needed.

```bash
touch database/database.sqlite
php artisan migrate
```

To use MySQL instead, update `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fufas_markets
DB_USERNAME=root
DB_PASSWORD=your_password
```

Then run `php artisan migrate`.

### 5. Install JavaScript dependencies

```bash
npm install
```

### 6. Build frontend assets

For development (with hot reload):

```bash
npm run dev
```

For production:

```bash
npm run build
```

### 7. Start the server

```bash
php artisan serve
```

The app will be available at `http://localhost:8000`.

> **Note:** To run all services concurrently (server, queue worker, log viewer, and Vite) in a single terminal:
> ```bash
> composer run dev
> ```

---

## Environment Variables

The following variables in `.env` are relevant to this project:

```env
APP_NAME=Fufas Markets
APP_ENV=local
APP_URL=http://localhost:8000

# Database — SQLite by default, no changes needed for local dev
DB_CONNECTION=sqlite

# Cache — database driver works out of the box
CACHE_STORE=database

# Queue — used for background jobs if any are added
QUEUE_CONNECTION=database

# Optional: set to your app name for browser tab titles
VITE_APP_NAME="${APP_NAME}"
```

No third-party API keys are required. CoinGecko is used on the free public tier (no key). Yahoo Finance is accessed without authentication.

---

## Project Structure

```
app/
  Http/Controllers/
    AssetController.php       — price, candles, search, FX, refresh endpoints
    DashboardController.php   — dashboard page with watchlist, trending, global stats
    MarketsController.php     — paginated markets list with categories
    CompareController.php     — side-by-side asset comparison
    HoldingController.php     — portfolio positions CRUD
    WatchlistController.php   — watchlist CRUD
    NoteController.php        — analysis notes CRUD
    AlertController.php       — price alerts CRUD
  Services/
    MarketService.php         — all external API calls (CoinGecko, Yahoo Finance, FX)
    ForecastService.php       — log-linear regression, RSI/MACD/MA signals, S/R levels

resources/
  js/
    components/
      AppShell.tsx            — main layout shell, nav, search, theme, currency
      PriceChart.tsx          — Lightweight Charts wrapper (candlestick + overlays)
      RsiChart.tsx            — RSI sub-chart
      MacdChart.tsx           — MACD sub-chart
      ForecastPanel.tsx       — forecast + signals + support/resistance display
      LiveBadge.tsx           — pulsing live indicator with source and refresh
      FufasLoader.tsx         — branded progress bar, splash screen, skeleton loader
      FufasAlert.tsx          — global toast and confirm dialog system
      Sparkline.tsx           — lightweight SVG sparkline for tables
      indicators.ts           — SMA, EMA, RSI, MACD, Bollinger client-side calculations
    pages/
      dashboard.tsx
      markets.tsx
      asset.tsx
      portfolio.tsx
      compare.tsx
    lib/
      currency.ts             — multi-currency context with live FX rates
      theme.ts                — dark/light theme context
      format.ts               — number and percentage formatting utilities
  css/
    app.css                   — CSS custom properties, Tailwind config, keyframe animations

database/
  migrations/                 — watchlist_items, notes, alerts, holdings tables
```

---

## API Reference

All routes are defined in `routes/web.php`.

| Method | Path                             | Description                              |
|--------|----------------------------------|------------------------------------------|
| GET    | `/`                              | Dashboard                                |
| GET    | `/markets`                       | Paginated crypto markets list            |
| GET    | `/portfolio`                     | Portfolio holdings overview              |
| GET    | `/compare`                       | Asset comparison chart                   |
| GET    | `/asset/{type}/{symbol}`         | Asset detail page (type: crypto, stock)  |
| GET    | `/api/search?q=`                 | Live asset search                        |
| GET    | `/api/candles/{type}/{symbol}`   | OHLC candles + forecast for chart ranges |
| POST   | `/api/refresh/{type}/{symbol}`   | Bust cache and re-fetch asset data       |
| GET    | `/api/fx/{target}`               | FX rate for a currency code              |
| POST   | `/watchlist`                     | Add to watchlist                         |
| DELETE | `/watchlist/{id}`                | Remove from watchlist                    |
| POST   | `/notes`                         | Create analysis note                     |
| PATCH  | `/notes/{id}`                    | Update note                              |
| DELETE | `/notes/{id}`                    | Delete note                              |
| POST   | `/alerts`                        | Create price alert                       |
| PATCH  | `/alerts/{id}`                   | Update alert (toggle active/triggered)   |
| DELETE | `/alerts/{id}`                   | Delete alert                             |
| POST   | `/holdings`                      | Record transaction                       |
| DELETE | `/holdings/{id}`                 | Delete transaction                       |

---

## Caching Strategy

All external API responses are cached at the service layer to avoid rate limiting.

| Data                  | Cache Key Pattern                          | TTL      |
|-----------------------|--------------------------------------------|----------|
| Quote (price)         | `quote:{type}:{symbol}`                    | 5 min    |
| OHLC candles          | `candles:{type}:{symbol}:{range}:{interval}` | 1 min  |
| Top 250 crypto list   | `coingecko:markets:top250`                 | 10 min   |
| Category list         | `categories:top30`                         | 10 min   |
| Global market stats   | `global:stats`                             | 10 min   |
| News                  | `news:{type}:{symbol}`                     | 15 min   |
| FX rates              | `fx:{currency}`                            | 1 hour   |

> **Note:** The cache only stores validated responses. Error responses from CoinGecko (e.g. HTTP 429 rate limit) are never cached — the next request will retry the live API.

---

## Forecast Model

The 30-day price projection in `ForecastService.php` works as follows:

1. Fetch 3 months of daily OHLC candles for the asset (always uses this range regardless of the chart's selected range, to ensure enough data points)
2. Fit a log-linear regression on closing prices: `log(price) = intercept + slope * t`
3. Compute the 90% confidence interval by widening with residual standard deviation: `CI = exp(log_pred +/- 1.645 * sigma * sqrt(t))`
4. Compute technical signals independently:
   - RSI (14): oversold if <= 30, overbought if >= 70
   - Price vs MA50: bullish if above, bearish if below
   - MA20 vs MA50: detects Golden Cross and Death Cross
   - MACD (12, 26, 9): histogram crossover direction
5. Combine signal counts with slope and expected return into a single sentiment score

> **Note:** The forecast is statistical and based solely on price history. It is not financial advice. Macro events, news, and market sentiment are not factored in.

---

## Notes and Known Limitations

**CoinGecko Free Tier**
The app uses the CoinGecko public API without an API key. The free tier has rate limits (approximately 10-30 calls per minute). If requests are throttled (HTTP 429), the app returns cached data or an empty state. Upgrading to a CoinGecko API key can be done by adding the key to `.env` and passing it as a header in `MarketService.php`.

**Yahoo Finance**
Yahoo Finance does not provide an official public API. The app accesses the unofficial `query1.finance.yahoo.com` chart endpoint. This may break without notice if Yahoo changes their API structure.

**OHLC Granularity**
CoinGecko OHLC granularity is fixed by the `days` parameter and cannot be overridden on the free tier:
- 1-2 days: 30-minute candles
- 3-30 days: 4-hour candles
- 31+ days: 4-day candles

This means the 1D and 5D chart ranges will show fewer candles than the equivalent stock charts from Yahoo Finance.

**No Authentication**
The app is designed as a single-user personal tool and has no login system. All data (watchlist, portfolio, notes, alerts) is shared across anyone with access to the URL. Do not expose it publicly without adding authentication.

**SQLite Concurrency**
SQLite works well for single-user local use. If you plan to run the app on a server with multiple concurrent users, switch to MySQL or PostgreSQL.

---

## Development Commands

```bash
# Start all services (server + queue + logs + vite HMR)
composer run dev

# Run PHP tests
php artisan test

# Check TypeScript types
npm run types:check

# Format PHP code
composer run lint

# Format JS/CSS
npm run format

# Production build
npm run build
```

---
