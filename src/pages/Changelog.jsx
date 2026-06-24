import { Card, Badge } from '../components/ui'
import { dateStr } from '../lib/format'
import { APP_VERSION, CHANGELOG } from '../lib/version'

export default function Changelog() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Changelog</h1>
        <Badge color="green">Current: v{APP_VERSION}</Badge>
      </div>
      <p className="mb-6 text-sm text-slate-500">A running history of updates to the tool. Newest changes are at the top.</p>

      <div className="space-y-5">
        {CHANGELOG.map((rel) => (
          <Card key={rel.version} className="p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold text-slate-800">v{rel.version}</h2>
              {rel.title && <span className="text-sm font-medium text-brand-700">{rel.title}</span>}
              {rel.date && <span className="text-xs text-slate-400">{dateStr(rel.date)}</span>}
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              {rel.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
