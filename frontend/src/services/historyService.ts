import type { HistoryVariant } from '../components/historial/HistoryCard';

export type HistoryCategory = 'blocked' | 'security' | 'settings';

export interface HistoryEvent {
  id: string;
  variant: HistoryVariant;
  title: string;
  description: string;
  time: string;
  device: string;
  deviceId: string;
  category: HistoryCategory;
  date: string;
}

const historyEvents: HistoryEvent[] = [
  {
    id: '1',
    variant: 'blocked',
    title: 'Sitio web bloqueado',
    description: 'Se bloqueó el acceso a apostando-sitio.com por las reglas de protección.',
    time: '10:42',
    device: 'Paula',
    deviceId: '1',
    category: 'blocked',
    date: 'Hoy',
  },
  {
    id: '2',
    variant: 'alert',
    title: 'Intento de acceso bloqueado',
    description: 'Se detectó y bloqueó un intento de acceso a contenido restringido.',
    time: '10:15',
    device: 'Ramiro',
    deviceId: '2',
    category: 'security',
    date: 'Hoy',
  },
  {
    id: '3',
    variant: 'settings',
    title: 'Configuración actualizada',
    description: 'Se modificaron los ajustes de protección del perfil familiar.',
    time: '09:30',
    device: 'Paula',
    deviceId: '1',
    category: 'settings',
    date: 'Hoy',
  },
  {
    id: '4',
    variant: 'protected',
    title: 'Protección activada',
    description: 'La protección quedó activa en el dispositivo.',
    time: '18:20',
    device: 'Ramiro',
    deviceId: '2',
    category: 'security',
    date: 'Ayer',
  },
];

export function getHistoryEvents(): HistoryEvent[] {
  return historyEvents.map((event) => ({ ...event }));
}

export function getHistoryEventById(
  historyId: string,
): HistoryEvent | undefined {
  const event = historyEvents.find((item) => item.id === historyId);
  return event ? { ...event } : undefined;
}
