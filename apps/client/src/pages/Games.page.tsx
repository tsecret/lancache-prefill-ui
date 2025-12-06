import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"
import clsx from "clsx"
import { CircleCheck, Search } from "lucide-react"
import { useEffect, useState } from "react"
import type { BattlenetGame, SteamGame } from "shared/types"
import { apiFetch } from "../api"



function SteamGamesSelect(){
  const [search, setSearch] = useState<string>("")
  const [steamGames, setSteamGames] = useState<SteamGame[]>()

  const { data: steamGamesRaw } = useQuery({
    queryKey: ['steam-games'],
    queryFn: async (): Promise<SteamGame[]> => {
      const res = await apiFetch('/api/games/steam')
      return await res.json()
    },
  })

  const mutation = useMutation({
    mutationFn: (apps: number[]) => {
      return axios.post('/api/games/steam', { apps })
    },
  })

  useEffect(() => {
    setSteamGames(steamGamesRaw)
  }, [steamGamesRaw])

  const onGameClick = (key: number) => {
    if (!steamGames) return

    setSteamGames([...steamGames.map((game, i) => ({
      ...game, selected: key === i ? !game.selected : game.selected
    }))])

    mutation.reset()
  }

  const onSave = () => {
    if (!steamGames) return
    mutation.mutate(steamGames?.filter(games => games.selected).map(game => game.appid))
  }

  return (
    <div className="page">
      <section className="w-full max-w-2xl">
        <ul className="list bg-base-100 rounded-box shadow-md">
          <div className="row space-x-4">
            <li className="p-4 pb-2 text-xs opacity-60 tracking-wide flex-1">Steam Games</li>

            <span>Selected: {steamGames?.filter(game => game.selected).length} / {steamGames?.length}</span>
            <button className="btn btn-sm btn-primary" onClick={onSave}>
              {mutation.isSuccess && <CircleCheck size={16} />}
              Save
            </button>
          </div>

          <label className="input my-2 w-full">
            <Search size={16} />
            <input type="text" placeholder="Search..." onChange={(e: any) => setSearch(e.target.value)} />
          </label>

          {steamGames?.filter(game => game.name.toLowerCase().includes(search)).map((game, i) => (
              <li className={clsx("list-row cursor-pointer items-center")} key={i} onClick={() => onGameClick(i)}>
                <CircleCheck className={clsx(game.selected ? 'text-success' : 'opacity-5')} size={16} />
                <div className="list-col-grow">{game.name}</div>
                <div>{game.hoursPlayed}h</div>
              </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function BattlenetGamesSelect(){
  const [battletnetGames, setGames] = useState<BattlenetGame[]>([])

  const { data: battlenetGamesRaw } = useQuery({
    queryKey: ['battlenet-games'],
    queryFn: async (): Promise<BattlenetGame[]> => {
      const res = await apiFetch('/api/games/battlenet')
      return await res.json()
    },
  })

  const mutation = useMutation({
    mutationFn: (apps: string[]) => {
      return axios.post('/api/games/battlenet', { apps })
    },
  })

  useEffect(() => {
    if (battlenetGamesRaw)
      setGames(battlenetGamesRaw)
  }, [battlenetGamesRaw])

  const onSave = async () => {
    if (!battletnetGames) return

    mutation.mutate(battletnetGames.filter(games => games.selected).map(game => game.appid))
  }

  const onGameClick = (key: number) => {
    if (!battletnetGames) return

    setGames([
      ...battletnetGames.map((game, i) => ({
          ...game, selected: key === i ? !game.selected : game.selected
      }))
    ])

    mutation.reset()
  }

  return (
    <div className="page">
      <section className="w-full max-w-2xl">
        <ul className="list bg-base-100 rounded-box shadow-md">
          <div className="row space-x-4">
            <li className="p-4 pb-2 text-xs opacity-60 tracking-wide flex-1">Battlenet Games</li>

            <button className="btn btn-sm btn-primary" onClick={onSave}>
              {mutation.isSuccess && <CircleCheck size={16} />}
              Save
            </button>
          </div>

          {battletnetGames?.map((game, i) => (
              <li className={clsx("list-row cursor-pointer items-center")} key={i} onClick={() => onGameClick(i)}>
                <CircleCheck className={clsx(game.selected ? 'text-success' : 'opacity-5')} size={16} />
                <div className="list-col-grow">{game.name}</div>
              </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function Games(){
  const [tab, setTab] = useState<number>(1)
  // const [showSelected, setShowSelected] = useState<boolean>(false)

  return (
    <div className="container">
      <div role="tablist" className="tabs tabs-border justify-center">
        <a role="tab" className={clsx("tab", tab === 1 && "tab-active")} onClick={() => setTab(1)}>Steam</a>
        <a role="tab" className={clsx("tab", tab === 2 && "tab-active")} onClick={() => setTab(2)}>Epic Games</a>
        <a role="tab" className={clsx("tab", tab === 3 && "tab-active")} onClick={() => setTab(3)}>Battlenet</a>
      </div>

      {
        tab === 1 ? <SteamGamesSelect /> :
        tab === 3 ? <BattlenetGamesSelect /> : null
      }
    </div>
  )
}
