import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    await firstValueFrom(this.auth.ready$);
    if (this.auth.isLoggedIn) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
