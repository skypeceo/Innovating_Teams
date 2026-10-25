// Reglas de acceso a partidas y códigos de equipo (6 dígitos de partida + 1 de equipo).
export const ESTADOS_UNIBLES = ['CONFIGURACION', 'EN_CURSO', 'ACTIVO'];

export const CODIGO_PARTIDA_LENGTH = 6;
export const CODIGO_EQUIPO_LENGTH = 7;

const isDigits = (value: string): boolean => /^\d+$/.test(value);

export const partidaAdmiteUnirse = (estado: string): boolean => ESTADOS_UNIBLES.includes(estado);

export const esCodigoPartida = (codigo: string): boolean =>
  isDigits(codigo) && codigo.length === CODIGO_PARTIDA_LENGTH;

export const esCodigoEquipo = (codigo: string): boolean =>
  isDigits(codigo) && codigo.length === CODIGO_EQUIPO_LENGTH;

export const codigoPartidaDe = (codigoEquipo: string): string =>
  codigoEquipo.slice(0, CODIGO_PARTIDA_LENGTH);

export const numeroEquipoDe = (codigoEquipo: string): number =>
  Number(codigoEquipo[codigoEquipo.length - 1]);

export const armarCodigoEquipo = (codigoPartida: string, indice: number): string =>
  `${codigoPartida}${indice}`;
