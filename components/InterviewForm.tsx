'use client';

/**
 * Structured form phase of the AIaaS DVI instrument. Collects routing, the five
 * 0–5 component self-ratings, the two asset & contribution ratings, tag
 * selections, adoption intent, and contact consent. On submit it hands the raw
 * FormState to the parent, which derives the route, computes the DVI and the
 * demand × asset matrix quadrant, and transitions to the short chat phase.
 */

import { useMemo, useState } from 'react';
import {
  FormState,
  emptyForm,
  isAdvancedDemand,
  BARRIER_SCALE,
  USEFULNESS_SCALE,
  EXTENT_SCALE,
  WILLINGNESS_SCALE,
  ORG_TYPES,
  WORK_TYPES,
  AI_MATURITY,
  NEED_OPTIONS,
  COMPETITOR_OPTIONS,
  FRICTION_OPTIONS,
  COST_TAG_OPTIONS,
  TECH_TAG_OPTIONS,
  LOCAL_TAG_OPTIONS,
  FEATURE_OPTIONS,
  GOV_TAG_OPTIONS,
  ASSET_TAG_OPTIONS,
  LIKELIHOOD_OPTIONS,
  FIRST_USE_OPTIONS,
  TIMEFRAME_OPTIONS,
  BLOCKER_OPTIONS,
  AI_WORK_OPTIONS,
  AD_PAIN_OPTIONS,
} from '@/lib/questions';

interface InterviewFormProps {
  onSubmit: (form: FormState) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
      <legend className="px-2 text-sm font-semibold text-gray-800">{title}</legend>
      {children}
    </fieldset>
  );
}

function ErrorNote({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xs font-medium text-red-600">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.9.9 0 01.9.9v3.6a.9.9 0 01-1.8 0V4.9A.9.9 0 018 4zm0 7.4a1 1 0 110 2 1 1 0 010-2z" />
      </svg>
      {children}
    </p>
  );
}

function Question({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  const labelId = id ? `${id}-label` : undefined;
  const errorId = id ? `${id}-error` : undefined;
  return (
    // role="group" + aria-labelledby names this set of radios/checkboxes; when it's
    // unanswered, aria-describedby ties the group to the inline error text so screen
    // readers announce the problem (aria-invalid isn't a supported prop on a group).
    <div
      id={id}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className={`space-y-2 scroll-mt-24 ${
        error ? 'rounded-lg border border-red-300 bg-red-50/60 p-3 -m-0.5' : ''
      }`}
    >
      <p id={labelId} className={`text-sm font-medium ${error ? 'text-red-700' : 'text-gray-800'}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      {children}
      {error && <ErrorNote id={errorId}>This question needs an answer.</ErrorNote>}
    </div>
  );
}

function RadioGroup({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="radio" className="mt-1" checked={value === opt} onChange={() => onChange(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({ options, values, onChange }: { options: readonly string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <div className="grid sm:grid-cols-2 gap-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={values.includes(opt)} onChange={() => toggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function Scale({ labels, value, onChange }: { labels: readonly string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((lbl, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
            value === i
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
          }`}
          aria-pressed={value === i}
        >
          {i} · {lbl}
        </button>
      ))}
    </div>
  );
}

export function InterviewForm({ onSubmit }: InterviewFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showErrors, setShowErrors] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const needsPrimary = form.workType === WORK_TYPES[2] || form.workType === WORK_TYPES[3];
  const ad = isAdvancedDemand(form);

  const missing = useMemo(() => {
    const m: { id: string; label: string }[] = [];
    if (!form.orgType) m.push({ id: 'q-orgType', label: 'organization type' });
    if (!form.workType) m.push({ id: 'q-workType', label: 'current work' });
    if (needsPrimary && !form.primaryContext) m.push({ id: 'q-primaryContext', label: 'primary context' });
    if (!form.aiMaturity) m.push({ id: 'q-aiMaturity', label: 'AI maturity' });
    if (form.needTags.length === 0) m.push({ id: 'q-needTags', label: 'what you need' });
    if (form.competitors.length === 0) m.push({ id: 'q-competitors', label: 'alternatives tried' });
    if (form.costRating < 0) m.push({ id: 'q-costRating', label: 'cost rating' });
    if (form.techRating < 0) m.push({ id: 'q-techRating', label: 'technical rating' });
    if (form.locRating < 0) m.push({ id: 'q-locRating', label: 'localization rating' });
    if (form.uvpRating < 0) m.push({ id: 'q-uvpRating', label: 'AIaaS usefulness rating' });
    if (form.govRating < 0) m.push({ id: 'q-govRating', label: 'governance rating' });
    if (form.assetPossession < 0) m.push({ id: 'q-assetPossession', label: 'asset possession rating' });
    if (form.assetWillingness < 0) m.push({ id: 'q-assetWillingness', label: 'contribution willingness rating' });
    if (!form.likelihood) m.push({ id: 'q-likelihood', label: 'likelihood to try' });
    if (!form.firstUse) m.push({ id: 'q-firstUse', label: 'first-use pathway' });
    if (!form.timeframe) m.push({ id: 'q-timeframe', label: 'timeframe' });
    if (!form.contactAnswered) m.push({ id: 'q-contact', label: 'contact preference' });
    if (form.contactConsent && !form.contactEmail.trim()) m.push({ id: 'q-contactEmail', label: 'work email' });
    return m;
  }, [form, needsPrimary]);

  const missingIds = useMemo(() => new Set(missing.map((m) => m.id)), [missing]);
  const hasError = (id: string) => showErrors && missingIds.has(id);

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = () => {
    if (missing.length > 0) {
      setShowErrors(true);
      // Jump the respondent to the first item they missed.
      requestAnimationFrame(() => scrollToQuestion(missing[0].id));
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 md:p-5 space-y-2">
        <h2 className="text-base font-semibold text-gray-900">About this study</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          This market study measures real demand for a <strong>localized AI-as-a-Service (AIaaS) platform</strong> —
          a resource of Philippine-relevant datasets, ready-to-use models and APIs, and a secure,
          lower-cost inference option for research and developer teams.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          Your answers about what you need, the friction you face with existing platforms, and how a local
          alternative would fit are combined into a study-specific <strong>Demand Viability Index (DVI)</strong>{' '}
          that helps us prioritize what to build first. This is not a readiness test or a certification, and
          there are no right or wrong answers.
        </p>
        <p className="text-xs text-gray-500">
          Takes about 5–7 minutes · your responses are confidential · contact details are collected only if you consent.
        </p>
      </div>

      <Section title="A · About your team">
        <Question id="q-orgType" error={hasError('q-orgType')} label="Which best describes your team or organization?" required>
          <RadioGroup options={ORG_TYPES} value={form.orgType} onChange={(v) => set('orgType', v)} />
        </Question>
        <Question id="q-workType" error={hasError('q-workType')} label="Which best describes your current work?" required>
          <RadioGroup options={WORK_TYPES} value={form.workType} onChange={(v) => set('workType', v)} />
        </Question>
        {needsPrimary && (
          <Question id="q-primaryContext" error={hasError('q-primaryContext')} label="If you used the AIaaS platform, which would be your team's PRIMARY context?" required>
            <RadioGroup options={[WORK_TYPES[0], WORK_TYPES[1]]} value={form.primaryContext} onChange={(v) => set('primaryContext', v)} />
          </Question>
        )}
        <Question id="q-aiMaturity" error={hasError('q-aiMaturity')} label="Does your team currently use, train, deploy, fine-tune, or integrate AI models?" required>
          <RadioGroup options={AI_MATURITY} value={form.aiMaturity} onChange={(v) => set('aiMaturity', v)} />
        </Question>
      </Section>

      <Section title="B · What you need">
        <Question id="q-needTags" error={hasError('q-needTags')} label="What type of data, model, or AI service do you need most? (select all)" required>
          <CheckboxGroup options={NEED_OPTIONS} values={form.needTags} onChange={(v) => set('needTags', v)} />
        </Question>
      </Section>

      <Section title="C · Current alternatives">
        <Question id="q-competitors" error={hasError('q-competitors')} label="Which platforms or alternatives have you tried or seriously considered? (select all)" required>
          <CheckboxGroup options={COMPETITOR_OPTIONS} values={form.competitors} onChange={(v) => set('competitors', v)} />
        </Question>
        <Question label="What problems have you experienced with these alternatives? (select all)">
          <CheckboxGroup options={FRICTION_OPTIONS} values={form.frictionTags} onChange={(v) => set('frictionTags', v)} />
        </Question>
      </Section>

      <Section title="D · Cost">
        <Question id="q-costRating" error={hasError('q-costRating')} label="How significant is COST as a barrier to your team's use of AI models, datasets, APIs, cloud, or inference?" required>
          <Scale labels={BARRIER_SCALE} value={form.costRating} onChange={(v) => set('costRating', v)} />
        </Question>
        <Question label="Which cost issues affect you? (select all)">
          <CheckboxGroup options={COST_TAG_OPTIONS} values={form.costTags} onChange={(v) => set('costTags', v)} />
        </Question>
      </Section>

      <Section title="E · Technical complexity">
        <Question id="q-techRating" error={hasError('q-techRating')} label="How significant is TECHNICAL COMPLEXITY as a barrier for your team?" required>
          <Scale labels={BARRIER_SCALE} value={form.techRating} onChange={(v) => set('techRating', v)} />
        </Question>
        <Question label="Which technical barriers affect you? (select all)">
          <CheckboxGroup options={TECH_TAG_OPTIONS} values={form.techTags} onChange={(v) => set('techTags', v)} />
        </Question>
      </Section>

      <Section title="F · Localization">
        <Question id="q-locRating" error={hasError('q-locRating')} label="How significant is the lack of localized / Philippine-relevant datasets or models as a barrier?" required>
          <Scale labels={BARRIER_SCALE} value={form.locRating} onChange={(v) => set('locRating', v)} />
        </Question>
        <Question label="Which localization gaps do you experience? (select all)">
          <CheckboxGroup options={LOCAL_TAG_OPTIONS} values={form.locTags} onChange={(v) => set('locTags', v)} />
        </Question>
      </Section>

      <Section title="G · AIaaS value">
        <Question id="q-uvpRating" error={hasError('q-uvpRating')} label="How useful would a localized AI repository + AI-as-a-Service platform (datasets, models, APIs, inference) be for your team?" required>
          <Scale labels={USEFULNESS_SCALE} value={form.uvpRating} onChange={(v) => set('uvpRating', v)} />
        </Question>
        <Question label="Which AIaaS features would be valuable? (select all)">
          <CheckboxGroup options={FEATURE_OPTIONS} values={form.featureTags} onChange={(v) => set('featureTags', v)} />
        </Question>
      </Section>

      <Section title="H · Governance & data sovereignty">
        <Question id="q-govRating" error={hasError('q-govRating')} label="How useful would strong local governance and data sovereignty — on-shore data, local ownership, and public-sector alignment — be for your team?" required>
          <Scale labels={USEFULNESS_SCALE} value={form.govRating} onChange={(v) => set('govRating', v)} />
        </Question>
        <Question label="Which governance factors matter most? (select all)">
          <CheckboxGroup options={GOV_TAG_OPTIONS} values={form.govTags} onChange={(v) => set('govTags', v)} />
        </Question>
      </Section>

      <Section title="I · Asset & Contribution">
        <Question id="q-assetPossession" error={hasError('q-assetPossession')} label="Does your team hold reusable AI assets — datasets, models, documentation, or benchmarks — that could be shared with others?" required>
          <Scale labels={EXTENT_SCALE} value={form.assetPossession} onChange={(v) => set('assetPossession', v)} />
        </Question>
        <Question id="q-assetWillingness" error={hasError('q-assetWillingness')} label="Would your team be willing to contribute or share those assets into a governed local platform?" required>
          <Scale labels={WILLINGNESS_SCALE} value={form.assetWillingness} onChange={(v) => set('assetWillingness', v)} />
        </Question>
        <Question label="Which kinds of assets could your team contribute? (select all)">
          <CheckboxGroup options={ASSET_TAG_OPTIONS} values={form.assetTags} onChange={(v) => set('assetTags', v)} />
        </Question>
      </Section>

      <Section title="J · Adoption intent">
        <Question id="q-likelihood" error={hasError('q-likelihood')} label="If the AIaaS platform were available, how likely would your team be to try it?" required>
          <RadioGroup options={LIKELIHOOD_OPTIONS} value={form.likelihood} onChange={(v) => set('likelihood', v)} />
        </Question>
        <Question id="q-firstUse" error={hasError('q-firstUse')} label="What is the most realistic way your team would use the AIaaS platform first?" required>
          <RadioGroup options={FIRST_USE_OPTIONS} value={form.firstUse} onChange={(v) => set('firstUse', v)} />
        </Question>
        <Question id="q-timeframe" error={hasError('q-timeframe')} label="How soon would your team be willing to try the AIaaS platform?" required>
          <RadioGroup options={TIMEFRAME_OPTIONS} value={form.timeframe} onChange={(v) => set('timeframe', v)} />
        </Question>
        <Question label="What would prevent your team from using the AIaaS platform? (select all)">
          <CheckboxGroup options={BLOCKER_OPTIONS} values={form.blockers} onChange={(v) => set('blockers', v)} />
        </Question>
      </Section>

      {ad && (
        <Section title="K · Advanced AI use">
          <Question label="What AI-related work does your team currently perform? (select all)">
            <CheckboxGroup options={AI_WORK_OPTIONS} values={form.aiWork} onChange={(v) => set('aiWork', v)} />
          </Question>
          <Question label="Since you already have AI capability, what are your biggest remaining pain points? (select all)">
            <CheckboxGroup options={AD_PAIN_OPTIONS} values={form.adPain} onChange={(v) => set('adPain', v)} />
          </Question>
        </Section>
      )}

      <Section title="L · Contact">
        <Question id="q-contact" error={hasError('q-contact')} label="May DOST-NAIRA contact you for follow-up or pilot coordination?" required>
          <RadioGroup
            options={['Yes, I agree to be contacted', 'No, I prefer not to be contacted']}
            value={
              !form.contactAnswered
                ? ''
                : form.contactConsent
                  ? 'Yes, I agree to be contacted'
                  : 'No, I prefer not to be contacted'
            }
            onChange={(v) => setForm((f) => ({ ...f, contactAnswered: true, contactConsent: v.startsWith('Yes') }))}
          />
        </Question>
        {form.contactConsent && (
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="space-y-1">
              <input
                id="q-contactEmail"
                type="email"
                placeholder="Work email"
                aria-invalid={hasError('q-contactEmail') || undefined}
                aria-describedby={hasError('q-contactEmail') ? 'q-contactEmail-error' : undefined}
                value={form.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm border scroll-mt-24 ${
                  hasError('q-contactEmail')
                    ? 'border-red-400 bg-red-50/60'
                    : 'border-gray-300'
                }`}
              />
              {hasError('q-contactEmail') && (
                <ErrorNote id="q-contactEmail-error">A work email is required to be contacted.</ErrorNote>
              )}
            </div>
          </div>
        )}
      </Section>

      {showErrors && missing.length > 0 && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <p className="font-medium">
            {missing.length === 1
              ? '1 question still needs an answer. Tap it to jump there:'
              : `${missing.length} questions still need an answer. Tap one to jump there:`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((m, i) => (
              <button
                key={`${m.id}-${i}`}
                type="button"
                onClick={() => scrollToQuestion(m.id)}
                className="rounded-full border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
