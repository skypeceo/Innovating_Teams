import { ForbiddenError, ValidationError } from '../../../domain/errors';
import { AuthTokenRepository, UsuarioRepository } from '../../ports/repositories';
import { PasswordHasher, TokenGenerator } from '../../ports/services';

export type LoginMode = 'STANDARD' | 'PROFESOR' | 'ADMINISTRADOR';

export interface AuthenticateInput {
  email: unknown;
  password: unknown;
  mode: LoginMode;
}

export interface AuthenticateOutput {
  token: string;
  username: string;
  role: string;
}

export class AuthenticateUser {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly tokens: AuthTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
  ) {}

  async execute({ email, password, mode }: AuthenticateInput): Promise<AuthenticateOutput> {
    const usuario = typeof email === 'string' ? await this.usuarios.findByEmail(email) : null;
    // El login estándar acepta usuarios inactivos en la búsqueda pero exige is_active al autenticar.
    const buscable = usuario && (mode === 'STANDARD' || usuario.estado === 'ACTIVO');
    if (!usuario || !buscable) throw new ValidationError('Usuario no encontrado');

    const passwordOk = typeof password === 'string' && (await this.hasher.verify(password, usuario.passwordHash));
    if (!passwordOk || (mode === 'STANDARD' && !usuario.isActive)) {
      throw new ValidationError('Credenciales inválidas');
    }

    if (mode !== 'STANDARD' && usuario.tipoUsuario !== mode) {
      const rol = mode === 'PROFESOR' ? 'profesor' : 'administrador';
      throw new ForbiddenError(`No tiene permisos para acceder como ${rol}`);
    }

    const token = await this.tokens.getOrCreate(usuario.id, this.tokenGenerator.generate());
    return {
      token,
      username: usuario.nombre,
      role: mode === 'STANDARD' ? 'admin' : usuario.tipoUsuario,
    };
  }
}
