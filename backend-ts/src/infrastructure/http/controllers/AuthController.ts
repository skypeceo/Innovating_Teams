import { AuthenticateUser, LoginMode } from '../../../application/use-cases/auth/AuthenticateUser';
import { Handler } from '../types';
import { fail, ok } from '../responses';
import { Router } from '../router';

export class AuthController {
  constructor(private readonly authenticate: AuthenticateUser) {}

  register(router: Router): void {
    router
      .add('POST', '/login', this.login('STANDARD'))
      .add('POST', '/login/profesor', this.login('PROFESOR'))
      .add('POST', '/login/admin', this.login('ADMINISTRADOR'));
  }

  private login =
    (mode: LoginMode): Handler =>
    async ({ body }) => {
      try {
        return ok(await this.authenticate.execute({ email: body.email, password: body.password, mode }));
      } catch (error) {
        return fail(error);
      }
    };
}
