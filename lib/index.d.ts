export interface Face {
  QSid: string
  QDes: string
  IQLid: string
  AQLid: string
  EMCode: string
  isStatic?: '1'
  isCMEmoji?: '1'
}

export function get(id: string | number): Face

export function getUrl(id: string | number, base?: string): string
