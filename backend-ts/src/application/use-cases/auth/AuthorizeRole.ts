import { ForbiddenError, UnauthorizedError } from '../../../domain/errors';
import { AuthTokenRepository, UsuarioRepository } from '../../ports/repositories';

/** Valida el header `Authorization: Token <key>` que entrega el login y exige un rol. */
export class AuthorizeRole {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly usuarios: UsuarioRepository,
  ) {}

  async execute(authorization: string | undefined, rol: string): Promise<void> {
    const key = authorization?.match(/^Token\s+(\S+)$/i)?.[1];
    const usuarioId = key ? await this.tokens.findUsuarioId(key) : null;
    const usuario = usuarioId ? await this.usuarios.findById(usuarioId) : null;
    if (!usuario) throw new UnauthorizedError('Token de autenticación requerido o inválido');
    if (usuario.tipoUsuario !== rol) throw new ForbiddenError('No tiene permisos para esta operación');
  }
}
