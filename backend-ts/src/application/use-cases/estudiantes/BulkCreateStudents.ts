import { ValidationError } from '../../../domain/errors';
import { StudentEnrollment } from '../../services/StudentEnrollment';
import { clean } from '../../services/text';

export interface BulkCreateStudentsOutput {
  estudiantes: { id: number; correo: string; nombre: string; apellido: string; rut: string; nuevo: boolean }[];
  total: number;
}

type Raw = Record<string, unknown>;

export class BulkCreateStudents {
  constructor(private readonly enrollment: StudentEnrollment) {}

  async execute(input: { estudiantes: unknown }): Promise<BulkCreateStudentsOutput> {
    if (input.estudiantes === undefined || input.estudiantes === null) {
      throw new ValidationError('Campo "estudiantes" requerido');
    }
    if (!Array.isArray(input.estudiantes)) throw new ValidationError('"estudiantes" debe ser una lista');

    const estudiantes: BulkCreateStudentsOutput['estudiantes'] = [];
    for (const raw of input.estudiantes as Raw[]) {
      const correo = clean(raw.correo) || clean(raw.email);
      const nombre = clean(raw.nombre);
      if (!correo || !nombre) continue; // fila inválida: se omite sin abortar el lote

      const apellido = `${clean(raw.apellido_paterno)} ${clean(raw.apellido_materno)}`.trim();
      const { usuario, estudiante, estudianteCreado } = await this.enrollment.ensure({
        email: correo,
        nombre,
        apellido,
        syncNames: true,
      });
      estudiantes.push({
        id: estudiante.id,
        correo: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rut: clean(raw.rut),
        nuevo: estudianteCreado,
      });
    }
    return { estudiantes, total: estudiantes.length };
  }
}
