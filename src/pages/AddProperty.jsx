import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, Button, Field, Input, Select, Textarea } from '../components/ui'
import AddressAutocomplete from '../components/AddressAutocomplete'

const STEPS = ['Basics', 'Acquisition', 'Details', 'Finance', 'Review']

export default function AddProperty() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    nickname: '',
    address: '',
    street: '',
    suburb: '',
    state: '',
    postcode: '',
    country: '',
    latitude: '',
    longitude: '',
    formatted_address: '',
    osm_place_id: '',
    property_type: 'house',
    status: 'acquisition',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    bedrooms: '',
    bathrooms: '',
    car_spaces: '',
    land_size: '',
    build_stage: '',
    build_progress: '',
    loan_lender: '',
    loan_balance: '',
    loan_rate: '',
    loan_repayment: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  // Step 0 requires a nickname before continuing.
  const canContinue = step !== 0 || form.nickname.trim().length > 0

  async function save() {
    setBusy(true)
    setError('')
    const num = (v) => (v === '' ? null : Number(v))
    const payload = {
      ...form,
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      purchase_date: form.purchase_date || null,
      purchase_price: num(form.purchase_price),
      current_value: num(form.current_value),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      car_spaces: num(form.car_spaces),
      build_progress: num(form.build_progress),
      loan_balance: num(form.loan_balance),
      loan_rate: num(form.loan_rate),
      loan_repayment: num(form.loan_repayment),
    }
    const { data, error } = await supabase.from('properties').insert(payload).select().single()
    setBusy(false)
    if (error) setError(error.message)
    else navigate(`/properties/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Add Property</h1>
      <p className="mb-6 text-sm text-slate-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      {/* progress bar */}
      <div className="mb-6 flex gap-1">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Nickname *">
              <Input value={form.nickname} onChange={set('nickname')} placeholder="e.g. 12 Smith St" />
            </Field>
            <Field label="Address">
              <AddressAutocomplete
                value={form.formatted_address || form.address}
                onSelect={(r) =>
                  setForm((f) => ({
                    ...f,
                    address: r.formatted_address,
                    formatted_address: r.formatted_address,
                    street: r.street,
                    suburb: r.suburb,
                    state: r.state,
                    postcode: r.postcode,
                    country: r.country,
                    latitude: r.latitude,
                    longitude: r.longitude,
                    osm_place_id: r.osm_place_id,
                  }))
                }
              />
            </Field>
            {form.suburb && (
              <p className="-mt-2 text-xs text-slate-500">
                📍 {[form.suburb, form.state, form.postcode].filter(Boolean).join(', ')}
              </p>
            )}
            <Field label="Property type">
              <Select value={form.property_type} onChange={set('property_type')}>
                <option value="house">House</option>
                <option value="unit">Unit / Apartment</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="acquisition">Acquisition</option>
                <option value="construction">Under construction</option>
                <option value="available">Available</option>
                <option value="tenanted">Tenanted</option>
                <option value="sold">Sold</option>
              </Select>
            </Field>
            <Field label="Purchase date">
              <Input type="date" value={form.purchase_date} onChange={set('purchase_date')} />
            </Field>
            <Field label="Purchase price (AUD)">
              <Input type="number" value={form.purchase_price} onChange={set('purchase_price')} />
            </Field>
            <Field label="Current estimated value (AUD)">
              <Input type="number" value={form.current_value} onChange={set('current_value')} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Bedrooms">
                <Input type="number" value={form.bedrooms} onChange={set('bedrooms')} />
              </Field>
              <Field label="Bathrooms">
                <Input type="number" value={form.bathrooms} onChange={set('bathrooms')} />
              </Field>
              <Field label="Car spaces">
                <Input type="number" value={form.car_spaces} onChange={set('car_spaces')} />
              </Field>
            </div>
            <Field label="Land size">
              <Input value={form.land_size} onChange={set('land_size')} placeholder="e.g. 450 m²" />
            </Field>
            <Field label="Build stage (if under construction)">
              <Input value={form.build_stage} onChange={set('build_stage')} placeholder="e.g. Frame, Lock-up" />
            </Field>
            <Field label="Build progress %">
              <Input type="number" min="0" max="100" value={form.build_progress} onChange={set('build_progress')} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Optional — mortgage/loan details.</p>
            <Field label="Lender">
              <Input value={form.loan_lender} onChange={set('loan_lender')} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Balance (AUD)">
                <Input type="number" value={form.loan_balance} onChange={set('loan_balance')} />
              </Field>
              <Field label="Rate %">
                <Input type="number" step="0.01" value={form.loan_rate} onChange={set('loan_rate')} />
              </Field>
              <Field label="Repayment (AUD)">
                <Input type="number" value={form.loan_repayment} onChange={set('loan_repayment')} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2 text-sm">
            <h3 className="mb-2 font-medium">Review</h3>
            {[
              ['Nickname', form.nickname],
              ['Address', form.address],
              ['Type', form.property_type],
              ['Status', form.status],
              ['Purchase', form.purchase_date && `${form.purchase_date} · $${form.purchase_price || '—'}`],
              ['Beds/Baths/Car', `${form.bedrooms || 0} / ${form.bathrooms || 0} / ${form.car_spaces || 0}`],
              ['Build', form.build_stage && `${form.build_stage} (${form.build_progress || 0}%)`],
              ['Loan', form.loan_lender],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-700">{v}</span>
                </div>
              ))}
            {error && <p className="pt-2 text-red-600">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={step === 0 ? () => navigate('/') : back}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canContinue}>
              Continue
            </Button>
          ) : (
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save property'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
