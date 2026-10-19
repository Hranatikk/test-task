export interface Theme {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  danger: string;
  dangerText: string;
  success: string;
  warning: string;
}

const light: Theme = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#D9DCE1',
  text: '#15171C',
  textMuted: '#5B6270',
  primary: '#1F5FDE',
  primaryText: '#FFFFFF',
  danger: '#C0372C',
  dangerText: '#FFFFFF',
  success: '#1B8A5A',
  warning: '#B4790A',
};

const dark: Theme = {
  background: '#101217',
  surface: '#1B1E25',
  border: '#2E323C',
  text: '#F2F3F5',
  textMuted: '#9AA1AE',
  primary: '#5B8DEF',
  primaryText: '#0B1220',
  danger: '#E5675C',
  dangerText: '#2A0D0A',
  success: '#4FBF8C',
  warning: '#E0A233',
};

export const themes = { light, dark };
