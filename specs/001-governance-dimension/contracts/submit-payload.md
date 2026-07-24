# Contract — `POST /api/submit` payload delta

Only the `scores` object changes. One new required key; everything else is unchanged.

## Before (4 components)
```jsonc
"scores": {
  "costBarrier": 0.0,          // 0.0–5.0
  "technicalComplexity": 0.0,  // 0.0–5.0
  "localizationGap": 0.0,      // 0.0–5.0
  "uvpResonance": 0.0          // 0.0–5.0
}
```

## After (5 components)
```jsonc
"scores": {
  "costBarrier": 0.0,
  "technicalComplexity": 0.0,
  "localizationGap": 0.0,
  "uvpResonance": 0.0,
  "governanceResonance": 0.0   // NEW — 0.0–5.0, required
}
```

- `dvi` remains a single `0.0–5.0` number, now computed from five components (Scheme A weights).
- `dvi_model_version` is **not** part of the request; the server stamps `'v2'` in the stored record.
- Validation: `governanceResonance` must be a number in `[0.0, 5.0]` (Zod `scoreSchema`); the DB
  enforces `CHECK (governance_resonance_score_g BETWEEN 0 AND 5)` as a backstop.

## Backward compatibility
- A client that omits `governanceResonance` fails Zod validation (400) — the field is required for
  v2 submissions. There is no partial-5-component state.
- Previously stored records are unaffected: their column is NULL and `dvi_model_version = 'v1'`.
