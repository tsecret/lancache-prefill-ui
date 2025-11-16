

const HOURS = [...Array(24).keys()]

export default function SettingsPage(){


  return (
    <div className="page">
      Settings

      <section>

      <fieldset className="fieldset bg-base-100 border-base-300 rounded-box border p-4">

        <legend className="fieldset-legend">Download restriction</legend>

        <label className="label">
          <input type="checkbox" defaultChecked className="toggle" />
          Enable download restriction
        </label>

        <div className="my-4">
          <div className="row space-x-4 justify-between">
            <select className="select">
              { HOURS.map(hour => <option key={hour}>{hour < 10 ? 0 : null}{hour}</option>) }
            </select>
            <span>-</span>
            <select className="select">
              { HOURS.map(hour => <option key={hour}>{hour < 10 ? 0 : null}{hour}</option>) }
            </select>
          </div>


        </div>

        <div className="row space-x-1">
          { HOURS.map(hour => <div className="border p-1 rounded-md text-xs">{hour < 10 ? 0 : null}{hour}</div>) }
        </div>

      </fieldset>


      </section>

    </div>
  )
}
