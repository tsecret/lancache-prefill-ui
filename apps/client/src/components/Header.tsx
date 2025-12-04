import clsx from "clsx";
import { Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";


export default function Header(){

  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState<boolean>(false)

  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <Link to='/' className="btn btn-ghost text-xl">LancacheUI</Link>

        <Link to='/games' className="btn btn-ghost">Games</Link>
        <Link to='/stats' className="btn btn-ghost">Stats</Link>
        <Link to='/devices' className="btn btn-ghost">Devices</Link>
      </div>

      <div className="row space-x-2">
        { autoDownloadEnabled ? <span className="text-success">Auto Download</span> : <span>Off</span> }
        <input type="checkbox" className={clsx('toggle', autoDownloadEnabled ? 'toggle-success' : 'toggle-error')} checked={autoDownloadEnabled} onChange={(e: any) => setAutoDownloadEnabled(e.target.checked)} />
      </div>

      <div className="divider divider-horizontal" />

      <div className="px-4">
        <Link to='/settings' className="btn btn-primary btn-sm btn-square"><Settings size={24} /></Link>
      </div>
    </div>
  )
}
