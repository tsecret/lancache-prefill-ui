import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query'
import Images from './components/Images'

const queryClient = new QueryClient()

export function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <Images />
      </main>
    </QueryClientProvider>
    )
}
