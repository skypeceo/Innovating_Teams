import { Persona } from '../../../domain/entities/Desafio';
import { ValidationError } from '../../../domain/errors';
import { PersonaRepository } from '../../ports/repositories';
import { clean } from '../../services/text';

export class ListPersonas {
  constructor(private readonly personas: PersonaRepository) {}

  async execute(): Promise<Persona[]> {
    return (await this.personas.findAll()).sort((a, b) => a.nombrePersona.localeCompare(b.nombrePersona));
  }
}

export class CreatePersona {
  constructor(private readonly personas: PersonaRepository) {}

  async execute(input: { nombre?: unknown; imagenurl?: unknown; contexto?: unknown; edad?: unknown }): Promise<Persona> {
    const nombrePersona = clean(input.nombre);
    if (!nombrePersona) throw new ValidationError('El nombre de la persona es obligatorio');

    let edad: number | null = null;
    if (input.edad !== undefined && input.edad !== null && input.edad !== '') {
      edad = Number(input.edad);
      if (!Number.isInteger(edad)) throw new ValidationError('La edad debe ser un número válido');
    }
    return this.personas.create({
      nombrePersona,
      imagenUrl: clean(input.imagenurl),
      contextoPersona: clean(input.contexto),
      edad,
    });
  }
}
