import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import dayjs from "dayjs";
import { useState } from "preact/hooks";
import type { Stats } from "shared/types";
import { apiFetch } from "../api";
import Loader from "../components/Loader";

function humanFileSize(bytes: number, si=true, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

const Table = ({ data }: { data: Stats }) => {
  const [tab, setTab] = useState<'downloads' | 'reuses'>('downloads')

  // const mutation = useMutation({
  //   mutationFn: ({ type, app }: { type: 'download' | 'reuse', app: Download }) => {
  //     return apiDelete(
  //       type === 'download' ? '/api/stats/download' : '/api/stats/reuse',
  //       { data: { service: app.service, depots: app.depots, startedAtString: app.startedAtString } }
  //     )
  //   },
  // })

  // const onDeleteReuse = async (app: Download) => {
  //   await mutation.mutateAsync({ type: 'reuse', app })
  // }

  // const onDeleteDownload = async (app: Download) => {
  //   await mutation.mutateAsync({ type: 'download', app })
  // }

  return (
    <section className="w-full sm:w-xl">
      <div role="tablist" className="tabs tabs-border">
        <a role="tab" className={clsx('tab', tab === 'downloads' && 'tab-active')} onClick={() => setTab('downloads')}>Downloads</a>
        <a role="tab" className={clsx('tab', tab === 'reuses' && 'tab-active')} onClick={() => setTab('reuses')}>Reuses</a>
      </div>

      <ul className="list bg-base-100 rounded-box shadow-md">
        {(tab === 'downloads' ? data.downloads : data.reuses).map((app, i) => (
          <li className="list-row" key={i}>
            <div><img className="w-32 rounded-box" src={app.appImage}/></div>
            <div>
              <div>{app.appName}</div>
              <div className="text-xs uppercase font-semibold opacity-60">{humanFileSize(app.bytesDownloaded)}</div>
            </div>

            <div className="flex flex-col">
              <p>{dayjs(app.endedAt).format('HH:mm DD/MM/YYYY')}</p>
              <p>{dayjs(app.startedAt).format('HH:mm DD/MM/YYYY')}</p>
            </div>

            {/* <div className="flex flex-col justify-center">
              <button className="btn btn-error btn-sm btn-square" onClick={() => tab ==='downloads' ? onDeleteDownload(app) : onDeleteReuse(app) }><Trash2 size={16} /></button>
            </div> */}
          </li>
        ))}
      </ul>

    </section>
  )
}

export default function StatsPage(){

  const { isPending, isError, data, error } = useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats> => {
      const res = await apiFetch('/api/stats')
      return await res.json()
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
  })

  if (isPending) return <Loader />
  if (isError) return <span>Error: {error.message}</span>

  return (
    <div className="page">

      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Downloaded</div>
          <div className="stat-value">{humanFileSize(data.bytesDownloaded)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Reused</div>
          <div className="stat-value">{humanFileSize(data.bytesReused)}</div>
        </div>
      </div>

      <div className="divider px-16" />

      <Table data={data} />

    </div>
  )
}
