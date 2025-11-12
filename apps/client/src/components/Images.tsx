import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

export default function Images(){
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['images'],
    queryFn: async () => {
      const res = await fetch('/api/images')
      return await res.json()
    },
  })

  console.log('data', data)

  return <div className="border-2">
    {
      data.for
    }
  </div>
}
