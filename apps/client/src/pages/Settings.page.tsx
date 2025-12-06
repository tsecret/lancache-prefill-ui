import { useMutation, useQuery } from "@tanstack/react-query"
import type { Settings } from "shared/types"
import { apiFetch, apiPost } from "../api"
import clsx from "clsx"
import { useEffect, useState } from "preact/hooks"

const HOURS = [...Array(24).keys()]

export default function SettingsPage(){
  const [settings, setSettings] = useState<Settings>()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Settings> => {
      const res = await apiFetch('/api/settings')
      return await res.json()
    },
  })

  const mutation = useMutation({
    mutationFn: (settings: Settings) => {
      return apiPost('/api/settings', settings)
    },
  })

  useEffect(() => {
    setSettings(data)
  }, [data])

  const onCheckToggle = (event: any) => {
    if (!settings) return
    settings.check.enabled = event.target.checked
    mutation.mutate(settings)
  }

  const onRestrictionToggle = (event: any) => {
    if (!settings) return
    settings.restriction.enabled = event.target.checked
    mutation.mutate(settings)
  }

  const onRestrictionHourChange = (hour: string, key: number) => {
    if (!settings) return
    settings.restriction.allowedTimeWindow[key] = parseInt(hour)
    mutation.mutate(settings)
  }

  if (!settings)
    return null

  return (
    <div className="page space-y-4">
      <h2>Settings</h2>

      <fieldset className="fieldset bg-base-100 border-base-300 rounded-box w-64 border p-4">
        <legend className="fieldset-legend">Auto downloads</legend>
        <label className="label">
          <input type="checkbox" className={clsx('toggle', settings?.check.enabled ? 'toggle-success' : 'toggle-error')} checked={settings.check.enabled} onChange={onCheckToggle} />
          { settings.check.enabled ? <span className="text-success">Enabled</span> : <span>Off</span> }
        </label>
      </fieldset>

      <fieldset className={clsx('fieldset bg-base-100 border-base-300 rounded-box w-64 border p-4', !settings.check.enabled && 'opacity-50')}>

        <legend className="fieldset-legend">Download restriction</legend>

        <label className="label">
          <input type="checkbox" defaultChecked className="toggle" onChange={onRestrictionToggle} disabled={!settings.check.enabled} />
          Enable download restriction
        </label>

        <div className="my-4">
          <div className="row space-x-4 justify-between">
            <select className="select" disabled={!settings.restriction.enabled || !settings.check.enabled} onChange={(e: any) => onRestrictionHourChange(e.target.value, 0)}>
              { HOURS.map(hour => <option key={hour}>{hour < 10 ? 0 : null}{hour}</option>) }
            </select>
            <span>-</span>
            <select className="select" disabled={!settings.restriction.enabled || !settings.check.enabled} onChange={(e: any) => onRestrictionHourChange(e.target.value, 1)}>
              { HOURS.map(hour => <option key={hour}>{hour < 10 ? 0 : null}{hour}</option>) }
            </select>
          </div>
        </div>

      </fieldset>

    </div>
  )
}
