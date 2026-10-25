import { ValidationError } from '../../../domain/errors';
import { armarCodigoEquipo } from '../../../domain/rules/partidaRules';
import { EquipoRepository, PartidaUsuarioRepository } from '../../ports/repositories';
import { Randomizer } from '../../ports/services';
import { StudentEnrollment } from '../../services/StudentEnrollment';
import { parseCsv } from '../../services/csv';
import { CreatePartida } from './CreatePartida';

export interface AssignGroupsFromCsvInput {
  csv: string;
  cantidadGrupos: number;
  tieneEncabezado: boolean;
  modo: string;
}

export interface AssignGroupsFromCsvOutput {
  idPartida: number;
  grupos: { nombreEquipo: string; codigoEquipo: string; estudiantes: { nombre: string; correo: string }[] }[];
}

/** CSV con columnas [Correo; RUT; Nombre; Apellido Paterno; Apellido Materno]. */
export class AssignGroupsFromCsv {
  constructor(
    private readonly createPartida: CreatePartida,
    private readonly equipos: EquipoRepository,
    private readonly partidaUsuarios: PartidaUsuarioRepository,
    private readonly enrollment: StudentEnrollment,
    private readonly random: Randomizer,
  ) {}

  async execute({ csv, cantidadGrupos, tieneEncabezado, modo }: AssignGroupsFromCsvInput): Promise<AssignGroupsFromCsvOutput> {
    if (!Number.isInteger(cantidadGrupos) || cantidadGrupos < 1) {
      throw new ValidationError('cantidad_grupos debe ser un entero positivo');
    }

    const filas = parseCsv(csv).slice(tieneEncabezado ? 1 : 0);
    if (filas.length === 0) throw new ValidationError('El archivo CSV está vacío');

    let estudiantes = filas
      .filter((fila) => fila.length >= 5)
      .map(([correo, , nombre, apPaterno, apMaterno]) => ({
        correo: correo.trim(),
        nombre: nombre.trim(),
        apPaterno: apPaterno.trim(),
        apMaterno: apMaterno.trim(),
      }));
    if (modo === 'aleatoria') estudiantes = this.random.shuffle(estudiantes);

    const partida = await this.createPartida.execute({ estado: 'EN_CURSO' });
    const grupos: AssignGroupsFromCsvOutput['grupos'] = [];
    const equipos = [];
    for (let i = 0; i < cantidadGrupos; i++) {
      const codigoEquipo = armarCodigoEquipo(partida.codigoAcceso ?? '', i + 1);
      equipos.push(await this.equipos.create({ nombreEquipo: `Equipo ${i + 1}`, tamanoEquipo: null, codigoEquipo }));
      grupos.push({ nombreEquipo: `Equipo ${i + 1}`, codigoEquipo, estudiantes: [] });
    }

    for (const [idx, est] of estudiantes.entries()) {
      const apellido = `${est.apPaterno} ${est.apMaterno}`;
      const { usuario } = await this.enrollment.ensure({ email: est.correo, nombre: est.nombre, apellido });

      const slot = idx % cantidadGrupos;
      await this.partidaUsuarios.create({ usuarioId: usuario.id, partidaId: partida.id, equipoId: equipos[slot].id });
      grupos[slot].estudiantes.push({
        nombre: `${est.nombre} ${est.apPaterno} ${est.apMaterno}`.trim(),
        correo: est.correo,
      });
    }

    return { idPartida: partida.id, grupos };
  }
}
