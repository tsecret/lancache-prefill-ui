import { Settings } from "lucide-react";
import { Link } from "react-router";


export default function Header(){

  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <Link to='/' className="btn btn-ghost text-xl">LancacheUI</Link>
      </div>
      <div className="px-4">
        <Link to='/settings' className="btn btn-primary btn-sm btn-square"><Settings size={24} /></Link>
      </div>
    </div>
  )
}
