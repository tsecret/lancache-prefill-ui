import { useQuery } from '@tanstack/react-query'
import { CloudCheck, LoaderCircle } from 'lucide-react'
import type { Container } from 'shared/types'

export default function Containers(){
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['containers'],
    queryFn: async (): Promise<Container[]> => {
      const res = await fetch('/api/containers')
      return await res.json()
    },
    refetchInterval: 5000
  })

  if (isPending) return <h1>Loading...</h1>
  if (isError) return <span>Error: {error.message}</span>

  return <div className="p-2 space-y-2 w-full max-w-2xl">
    {
      data?.length ?
      data.map(container => (
        <div className="border-2 p-4 rounded-md flex flex-col space-y-4">
          <div className="row space-x-4">
            <span><LoaderCircle className="animate-spin" /></span>
            <span className="flex-1">{container.name}</span>
            <div className="join">
              <button className="btn join-item btn-xs btn-warning">Pause</button>
              <button className="btn join-item btn-xs btn-error">Stop</button>
            </div>
          </div>
          {
            container.progress && (
              <div>
                <div className="row justify-between">
                  <span>{container.progress.percent}%</span>
                  <span>{container.progress.speed} {container.progress.unitSpeed}</span>
                </div>
                <div className="row justify-between">
                  <span>{container.progress.downloadedAmount} / {container.progress.downloadLeftAmount} {container.progress.unitAmount}</span>
                  <span>{container.progress.time} ({container.uptime})</span>
                </div>
                <progress className="progress progress-primary w-full mt-4" value={container.progress.percent} max="100"></progress>
              </div>
            )
          }
        </div>
      ))
      : (
      <div className="row space-x-4 justify-center py-24">
        <CloudCheck size={32} />
        <p className="text-xl">No downloads are running</p>
      </div>
      )
    }
  </div>
}
