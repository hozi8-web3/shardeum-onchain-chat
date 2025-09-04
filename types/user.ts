export interface UserDoc {
  _id?: any
  address: string
  username?: string
  createdAt: Date
  updatedAt: Date
}

export type ActivityType =
  | 'connect'
  | 'disconnect'
  | 'send_message'
  | 'switch_network'
  | 'update_username'

export interface ActivityDoc {
  _id?: any
  address: string
  type: ActivityType
  metadata?: Record<string, any>
  createdAt: Date
}


