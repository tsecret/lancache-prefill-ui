

export type Image = {
  tag: string
  id: string
  isPulled: boolean
}

export enum ImageTag {
  STEAM = 'tsecretino/steam-lancache-prefill-raspi',
  EPIC = 'tsecretino/epic-lancache-prefill-raspi',
  BATTLENET = 'tsecretino/battlenet-lancache-prefill-raspi'
}
