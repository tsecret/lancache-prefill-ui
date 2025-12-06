import { useQuery } from '@tanstack/react-query'
import { CloudCheck, CloudDownload } from 'lucide-react'
import type { Image } from 'shared/types'
import { apiFetch } from '../api'

export default function Images(){
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['images'],
    queryFn: async (): Promise<Image[]> => {
      const res = await apiFetch('/api/images')
      return await res.json()
    },
  })

  if (isPending) return <h1>Loading...</h1>
  if (isError) return <span>Error: {error.message}</span>

  return <div className="p-2 space-y-2 w-full max-w-2xl">
    {
      data?.map(image => (
        <div className="border-2 p-4 rounded-md flex flex-row items-center space-x-4">
          { image.isPulled ? <CloudCheck className="text-success" /> : <CloudDownload className="text-error" /> }
          <span className="flex-1">{image.tag}</span>

          { image.isPulled ? <button className="btn btn-soft btn-sm">Delete</button> : <button className="btn btn-soft btn-sm">Pull</button> }

        </div>
      ))
    }
  </div>
}
