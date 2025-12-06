import { useQuery } from "@tanstack/react-query"
import type { NetworkDevice } from "shared/types"
import { apiFetch } from "../api"

export default function DevicesPage(){
  const { data } = useQuery({
    queryKey: ['network-devices'],
    queryFn: async (): Promise<NetworkDevice[]> => {
      const res = await apiFetch('/api/devices')
      return await res.json()
    },
  })

  return (
    <div className="page">

      <ul className="list bg-base-100 rounded-box shadow-md">
        <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">Network Devices</li>

        {data?.map(device => (
          <li className="list-row">
            <div>
              <div>{device.IP}</div>
              <div className="text-xs uppercase font-semibold opacity-60">{device.Name}</div>
            </div>
            <p>{device.Mac}</p>
          </li>
        ))}
      </ul>

    </div>
  )
}
