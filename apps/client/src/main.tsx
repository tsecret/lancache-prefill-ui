import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query'
import { render } from 'preact'
import { App } from './app.tsx'
import './index.css'
import { BrowserRouter } from 'react-router'

const queryClient = new QueryClient()

render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
document.getElementById('app')!)
