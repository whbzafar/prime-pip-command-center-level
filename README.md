# PRIMEPIPFX Trading Command Center

## CFTC Commitments of Traders (COT) Configuration

The COT Report feature integrates official institutional positioning data directly from the CFTC Public Reporting Environment (Socrata SODA API).

### Data Source
- **API Endpoint:** `https://publicreporting.cftc.gov/resource/6dca-aqww.json`
- **Primary Dataset:** "Legacy – Futures Only" (`6dca-aqww`)
- **Authentication:** Free, public access. No API key required.
- **Optional App Token:** Add `CFTC_APP_TOKEN=<your_token>` or `SOCRATA_APP_TOKEN=<your_token>` to `.env` to increase Socrata API rate limits.

### Adding New Markets
All markets are configured in `src/config/cotConfig.ts`:
1. Find the official CFTC Contract Market Code from the CFTC website or by querying the dataset.
2. Add an entry to the `COT_MARKETS` array:
```ts
{
  code: '020601',
  name: '30-Year U.S. Treasury Bond',
  category: 'Bonds/Rates',
  exchange: 'CBOT',
  symbolHint: 'ZB / 30Y',
}
```
3. At startup, the app automatically verifies each code against live CFTC records. Any code returning empty rows is gracefully hidden and logged.

### Column Mapping
All column names are mapped in `src/config/cotConfig.ts` under `COT_COLUMN_MAPPINGS`. If the CFTC ever alters dataset column names, updating this single file updates the entire application.

### Running Unit Tests
Execute the verification suite covering net calculation, weekly change cross-checks, Larry Williams COT Index, and Friday 15:30 ET / DST release logic:
```bash
npm test
# or specifically:
npx tsx src/cotEngine.test.ts
```
