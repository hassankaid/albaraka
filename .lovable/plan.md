

## Analysis

After reviewing all admin pages, **only the Sales page (`src/pages/Sales.tsx`) is missing a search bar**. All other admin pages (Leads, Calls, Contacts, Payments, Commissions, Invoices) already have one.

## Plan

### 1. Enrich the CEO sales query with apporteur name

The current query fetches `contacts` (client) and `profiles` (closer) but not the apporteur. To enable search by apporteur name, the query needs to join through the lead to get the apporteur profile:

```
sales -> leads!sales_lead_id_fkey -> profiles!leads_apporteur_id_fkey(full_name)
```

Add `apporteur_name` to the `CeoSale` interface and populate it from the nested join.

### 2. Add search state and filtering logic

- Add a `search` state variable
- Add a `useMemo` that filters `ceoSales` (or `userCommissions` for non-CEO) by matching the search query against: **client name, client email, closer name, apporteur name, product name**
- Use the filtered list for rendering and stats

### 3. Add the search input in the header

Place an `Input` with a search icon next to the "Actualiser" button, consistent with the existing pattern used on Payments and Commissions pages.

### Files modified

| File | Change |
|---|---|
| `src/pages/Sales.tsx` | Add search state, enrich query with apporteur, filter with `useMemo`, add `Input` in header |

