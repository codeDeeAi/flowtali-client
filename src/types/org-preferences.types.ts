export interface IOrgStamp {
  text: string
  color: string
  text_color?: string
}

export interface IOrgBrandColor {
  name: string
  hex: string
}

export interface IOrgSignature {
  id: string
  type: string
  url: string
  extras: {
    name: string
    role: string
    mime_type?: string
    size?: number
  }
}

export interface IOrgLogo {
  id: string
  type: string
  url: string
  extras: {
    label: string
    mime_type?: string
    size?: number
  }
}

export interface IOrgPreferences {
  stamps: IOrgStamp[]
  brand_colors: IOrgBrandColor[]
  signatures: IOrgSignature[]
  logos: IOrgLogo[]
}
