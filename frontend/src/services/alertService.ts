export type AlertType = 'danger' | 'blocked' | 'warning';

export interface Alert {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  date: string;
  type: AlertType;
  device: string;
  description: string;
  site?: string;
}

const alerts: Alert[] = [
  {
    id: '1',
    title: '¡Requiere tu atención!',
    subtitle: 'Paula desinstaló la aplicación',
    time: '13:00',
    date: 'Hoy',
    type: 'danger',
    device: 'Paula',
    description:
      'Se detectó que la aplicación de control parental fue desinstalada del dispositivo.',
  },
  {
    id: '2',
    title: 'Sitio bloqueado',
    subtitle: 'Ramiro - apostando-sitio.com',
    time: '14:25',
    date: 'Hoy',
    type: 'blocked',
    device: 'Ramiro',
    description: 'Se bloqueó el intento de acceder a un sitio restringido.',
    site: 'apostando-sitio.com',
  },
  {
    id: '3',
    title: 'Intento de modificación',
    subtitle: 'Paula - Configuración protegida',
    time: '11:00',
    date: 'Hoy',
    type: 'warning',
    device: 'Paula',
    description:
      'Se detectó un intento de modificar una configuración protegida.',
  },
];

export function getAlerts(): Alert[] {
  return alerts.map((alert) => ({ ...alert }));
}

export function getAlertById(alertId: string): Alert | undefined {
  const alert = alerts.find((item) => item.id === alertId);
  return alert ? { ...alert } : undefined;
}
