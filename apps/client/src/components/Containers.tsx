import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CirclePause, CloudCheck, LoaderCircle } from 'lucide-react'
import type { Container } from 'shared/types'
import { apiFetch, apiPost } from '../api'
import Loader from './Loader'

export default function Containers(){
  const { isPending, isError, data, error, refetch } = useQuery({
    queryKey: ['containers'],
    queryFn: async (): Promise<Container[]> => {
      const res = await apiFetch('/api/containers')
      return await res.json()
    },
    refetchInterval: 5000
  })

  const mutation = useMutation({
    mutationFn: ({ type, id }: { type: 'pause' | 'unpause' | 'stop', id: string }) => {
      return apiPost(
        type === 'pause' ? '/api/containers/pause' :
        type === 'unpause' ? '/api/containers/unpause' :
        '/api/containers/stop',
        { id }
      )
    },
  })

  const onPause = async (id: string) => {
    await mutation.mutateAsync({ type: 'pause', id })
    await refetch()
  }

  const onUnpause = async (id: string) => {
    await mutation.mutateAsync({ type: 'unpause', id })
    await refetch()
  }

  const onStop = async (id: string) => {
    await mutation.mutateAsync({ type: 'stop', id })
    await refetch()
  }

  if (isPending) return <Loader />
  if (isError) return <span>Error: {error.message}</span>

  return <div className="p-2 space-y-2 w-full max-w-2xl">
    {
      data?.length ?
      data.map(container => {

        const isPaused = container.state === 'paused'

        return <div className="border-2 p-4 rounded-md flex flex-col space-y-4">
          <div className="row space-x-4">
            <span> { isPaused ? <CirclePause /> : <LoaderCircle className="animate-spin" /> }</span>
            <span className="flex-1">{container.name}</span>
            <div className="join">
              <button className={clsx('btn join-item btn-xs', isPaused ? 'btn-success' : 'btn-warning')} onClick={isPaused ? () => onUnpause(container.id) : () => onPause(container.id)}>{isPaused ? 'Resume' : 'Pause'}</button>
              <button className="btn join-item btn-xs btn-error" onClick={() => onStop(container.id)}>Stop</button>
            </div>
          </div>
          {
            container.progress ? (
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
            ) : <span className="text-end">{container.uptime}</span>
          }
        </div>
      })
      : (
      <div className="row space-x-4 justify-center py-24">
        <CloudCheck size={32} />
        <p className="text-xl">No downloads are running</p>
      </div>
      )
    }
  </div>
}
